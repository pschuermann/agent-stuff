import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Model } from "@earendil-works/pi-ai";
import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

const CONFIG_PATH = join(getAgentDir(), "stacks.json");
const EFFORT_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
const EFFORT_LEVEL_SET = new Set<string>(EFFORT_LEVELS);

type ThinkingLevel = typeof EFFORT_LEVELS[number];
type CurrentThinkingModel = Pick<Model<any>, "reasoning"> & {
	thinkingLevelMap?: Partial<Record<ThinkingLevel, string | null>>;
};

interface Stack {
	provider: string;
	model: string;
	effort: ThinkingLevel;
}

type LoadStacksResult = { stacks: Stack[] } | { error: string };
type ResolvedStack = { stack: Stack; model: Model<any> };

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isThinkingLevel(value: unknown): value is ThinkingLevel {
	return typeof value === "string" && EFFORT_LEVEL_SET.has(value);
}

function supportsThinkingLevel(model: CurrentThinkingModel, effort: ThinkingLevel): boolean {
	if (!model.reasoning) return effort === "off";

	const mapped = model.thinkingLevelMap?.[effort];
	if (mapped === null) return false;
	return effort !== "xhigh" && effort !== "max" || mapped !== undefined;
}

function loadStacks(): LoadStacksResult {
	if (!existsSync(CONFIG_PATH)) {
		return { error: `Config not found: ${CONFIG_PATH}` };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: `Cannot parse ${CONFIG_PATH}: ${message}` };
	}

	if (!isRecord(parsed) || !Array.isArray(parsed.stacks) || parsed.stacks.length === 0) {
		return { error: `Invalid ${CONFIG_PATH}: stacks must be a non-empty array` };
	}

	const stacks: Stack[] = [];
	const diagnostics: string[] = [];
	const tuples = new Set<string>();

	for (const [index, entry] of parsed.stacks.entries()) {
		const prefix = `[${index + 1}]`;
		if (!isRecord(entry)) {
			diagnostics.push(`${prefix} expected { provider, model, effort }`);
			continue;
		}

		const keys = Object.keys(entry);
		if (keys.length !== 3 || keys.some((key) => key !== "provider" && key !== "model" && key !== "effort")) {
			diagnostics.push(`${prefix} must contain only provider, model, effort`);
			continue;
		}

		if (typeof entry.provider !== "string" || entry.provider.trim() === "") {
			diagnostics.push(`${prefix} provider must be a non-empty string`);
			continue;
		}
		if (typeof entry.model !== "string" || entry.model.trim() === "") {
			diagnostics.push(`${prefix} model must be a non-empty string`);
			continue;
		}
		if (!isThinkingLevel(entry.effort)) {
			diagnostics.push(`${prefix} invalid effort`);
			continue;
		}

		const stack: Stack = { provider: entry.provider, model: entry.model, effort: entry.effort };
		const tuple = JSON.stringify([stack.provider, stack.model, stack.effort]);
		if (tuples.has(tuple)) {
			diagnostics.push(`${prefix} duplicate tuple`);
			continue;
		}
		tuples.add(tuple);
		stacks.push(stack);
	}

	return diagnostics.length > 0
		? { error: `Invalid ${CONFIG_PATH}: ${diagnostics.join("; ")}` }
		: { stacks };
}

function targetLabel(stack: Stack): string {
	return `${stack.provider}/${stack.model} (${stack.effort})`;
}

function resolveStacks(stacks: Stack[], ctx: ExtensionContext): ResolvedStack[] | string {
	const diagnostics: string[] = [];
	const resolved: ResolvedStack[] = [];

	for (const [index, stack] of stacks.entries()) {
		const prefix = `[${index + 1}]`;
		const model = ctx.modelRegistry.find(stack.provider, stack.model);
		if (!model) {
			diagnostics.push(`${prefix} unknown ${stack.provider}/${stack.model}`);
			continue;
		}
		if (!ctx.modelRegistry.hasConfiguredAuth(model)) {
			diagnostics.push(`${prefix} no authentication for ${stack.provider}/${stack.model}`);
			continue;
		}
		if (!supportsThinkingLevel(model, stack.effort)) {
			diagnostics.push(`${prefix} unsupported effort for ${stack.provider}/${stack.model}`);
			continue;
		}
		resolved.push({ stack, model });
	}

	return diagnostics.length > 0 ? diagnostics.join("; ") : resolved;
}

export default function stacksExtension(pi: ExtensionAPI) {
	async function cycle(direction: 1 | -1, ctx: ExtensionContext): Promise<void> {
		const config = loadStacks();

		if (!ctx.isIdle()) {
			ctx.ui.notify("Stack switching is unavailable while Pi is busy", "warning");
			return;
		}
		if ("error" in config) {
			ctx.ui.notify(config.error, "error");
			return;
		}

		const resolved = resolveStacks(config.stacks, ctx);
		if (typeof resolved === "string") {
			ctx.ui.notify(`Invalid configured stack: ${resolved}`, "error");
			return;
		}

		const current = resolved.findIndex(({ stack }) =>
			ctx.model?.provider === stack.provider &&
			ctx.model.id === stack.model &&
			pi.getThinkingLevel() === stack.effort,
		);
		const target = resolved[current === -1
			? direction === 1 ? 0 : resolved.length - 1
			: (current + direction + resolved.length) % resolved.length];

		let selected: boolean;
		try {
			selected = await pi.setModel(target.model);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`Stack switch failed: ${message}`, "error");
			return;
		}
		if (!selected) {
			ctx.ui.notify(`No authentication configured for ${target.stack.provider}/${target.stack.model}`, "error");
			return;
		}

		pi.setThinkingLevel(target.stack.effort as Parameters<typeof pi.setThinkingLevel>[0]);
		ctx.ui.notify(targetLabel(target.stack), "info");
	}

	pi.registerShortcut("ctrl+]", {
		description: "Next configured stack",
		handler: (ctx) => cycle(1, ctx),
	});
	pi.registerShortcut("ctrl+[", {
		description: "Previous configured stack",
		handler: (ctx) => cycle(-1, ctx),
	});

	pi.registerCommand("stacks", {
		description: "List configured model-and-effort stacks",
		handler: async (_args, ctx) => {
			const config = loadStacks();
			if ("error" in config) {
				ctx.ui.notify(config.error, "error");
				return;
			}

			const lines = config.stacks.map((stack) => targetLabel(stack));
			ctx.ui.notify(`Stacks\n${lines.join("\n")}\n\n${CONFIG_PATH}`, "info");
		},
	});
}
