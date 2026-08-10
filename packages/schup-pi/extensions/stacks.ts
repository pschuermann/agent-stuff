import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

interface StackRecipe {
	models: readonly (readonly [provider: string, model: string])[];
	efforts: readonly ThinkingLevel[];
}

export interface Stack {
	provider: string;
	model: string;
	effort: ThinkingLevel;
}

export interface StackCandidate {
	provider: string;
	model: string;
	supportedEfforts: readonly ThinkingLevel[];
	pinnedEfforts?: readonly ThinkingLevel[];
}

const STACK_RECIPES = [
	{ models: [["deepseek", "deepseek-v4-flash"], ["openrouter", "deepseek/deepseek-v4-flash"]], efforts: ["high"] },
	{ models: [["openai-codex", "gpt-5.6-luna"], ["openai", "gpt-5.6-luna"], ["openrouter", "openai/gpt-5.6-luna"]], efforts: ["medium", "high", "xhigh"] },
	{ models: [["openai-codex", "gpt-5.6-terra"], ["openai", "gpt-5.6-terra"], ["openrouter", "openai/gpt-5.6-terra"]], efforts: ["low", "high"] },
	{ models: [["anthropic", "claude-opus-5"], ["openrouter", "anthropic/claude-opus-5"]], efforts: ["high"] },
	{ models: [["anthropic", "claude-fable-5"], ["openrouter", "anthropic/claude-fable-5"]], efforts: ["high"] },
	{ models: [["openai-codex", "gpt-5.6-sol"], ["openai", "gpt-5.6-sol"], ["openrouter", "openai/gpt-5.6-sol"]], efforts: ["medium"] },
] as const satisfies readonly StackRecipe[];

export function suggestStacks(candidates: readonly StackCandidate[]): Stack[] {
	const suggested: Stack[] = [];

	for (const recipe of STACK_RECIPES) {
		const candidate = recipe.models
			.map(([provider, model]) => candidates.find((item) => item.provider === provider && item.model === model))
			.find((item) => item !== undefined);
		if (!candidate) continue;

		const supported = new Set<ThinkingLevel>(candidate.supportedEfforts);
		const efforts = candidate.pinnedEfforts?.length ? candidate.pinnedEfforts : recipe.efforts;
		for (const effort of efforts) {
			if (!supported.has(effort)) continue;
			if (suggested.some((stack) => stack.provider === candidate.provider && stack.model === candidate.model && stack.effort === effort)) continue;
			suggested.push({ provider: candidate.provider, model: candidate.model, effort });
		}
	}

	return suggested;
}

type LoadStacksResult = { stacks: Stack[] } | { error: string };
type ResolvedStack = { stack: Stack; model: Model<any> };
type ResolutionResult = { resolved: ResolvedStack[]; diagnostics: string[] };
type ScopedStackModel = { model: Model<any>; thinkingLevel?: unknown };

function getScopedModels(ctx: ExtensionContext): readonly ScopedStackModel[] {
	// scopedModels was added to ExtensionContext after this package's original minimum Pi version.
	return (ctx as ExtensionContext & { scopedModels?: readonly ScopedStackModel[] }).scopedModels ?? [];
}

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

function resolveStacks(stacks: Stack[], ctx: ExtensionContext): ResolutionResult {
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

	return { resolved, diagnostics };
}

function stackCandidates(ctx: ExtensionContext): StackCandidate[] {
	const scopedModels = getScopedModels(ctx);
	const scoped = scopedModels.length > 0;
	const source = scoped
		? scopedModels.map(({ model, thinkingLevel }) => ({ model, thinkingLevel }))
		: ctx.modelRegistry.getAvailable().map((model) => ({ model, thinkingLevel: undefined }));
	const byModel = new Map<string, { model: Model<any>; pinned: Set<ThinkingLevel>; unpinned: boolean }>();

	for (const { model, thinkingLevel } of source) {
		if (!ctx.modelRegistry.hasConfiguredAuth(model)) continue;
		const key = JSON.stringify([model.provider, model.id]);
		const item = byModel.get(key) ?? { model, pinned: new Set<ThinkingLevel>(), unpinned: false };
		if (thinkingLevel && isThinkingLevel(thinkingLevel)) item.pinned.add(thinkingLevel);
		else item.unpinned = true;
		byModel.set(key, item);
	}

	return [...byModel.values()].map(({ model, pinned, unpinned }) => ({
		provider: model.provider,
		model: model.id,
		supportedEfforts: EFFORT_LEVELS.filter((effort) => supportsThinkingLevel(model, effort)),
		pinnedEfforts: scoped && !unpinned && pinned.size > 0 ? [...pinned] : undefined,
	}));
}

function scopedModelsMissingFrom(stacks: readonly Stack[], ctx: ExtensionContext): string[] {
	const scopedModels = getScopedModels(ctx);
	if (scopedModels.length === 0) return [];
	const configured = new Set(stacks.map((stack) => JSON.stringify([stack.provider, stack.model])));
	return [...new Set(scopedModels
		.filter(({ model }) => ctx.modelRegistry.hasConfiguredAuth(model))
		.filter(({ model }) => !configured.has(JSON.stringify([model.provider, model.id])))
		.map(({ model }) => `${model.provider}/${model.id}`))];
}

function writeInitialConfig(stacks: readonly Stack[]): void {
	mkdirSync(getAgentDir(), { recursive: true });
	writeFileSync(CONFIG_PATH, `${JSON.stringify({ stacks }, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
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

		const resolution = resolveStacks(config.stacks, ctx);
		if (resolution.diagnostics.length > 0) {
			ctx.ui.notify(`Invalid configured stack: ${resolution.diagnostics.join("; ")}`, "error");
			return;
		}
		const resolved = resolution.resolved;

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
		description: "List, diagnose, or initialize model-and-effort stacks",
		handler: async (args, ctx) => {
			if (args.trim() === "init") {
				if (existsSync(CONFIG_PATH)) {
					ctx.ui.notify(`Config already exists; refusing to overwrite it:\n${CONFIG_PATH}`, "warning");
					return;
				}
				if (!ctx.hasUI) {
					ctx.ui.notify("/stacks init requires an interactive session so the proposal can be confirmed", "error");
					return;
				}

				const candidates = stackCandidates(ctx);
				let proposed = suggestStacks(candidates);
				const currentIsCandidate = ctx.model && candidates.some(({ provider, model }) =>
					provider === ctx.model?.provider && model === ctx.model.id,
				);
				if (proposed.length === 0 && ctx.model && currentIsCandidate) {
					const effort = pi.getThinkingLevel();
					if (isThinkingLevel(effort) && supportsThinkingLevel(ctx.model, effort)) {
						proposed = [{ provider: ctx.model.provider, model: ctx.model.id, effort }];
					}
				}
				if (proposed.length === 0) {
					ctx.ui.notify("No recommended scoped and authenticated models were found. Configure stacks manually using the README example.", "warning");
					return;
				}

				const preview = proposed.map((stack) => targetLabel(stack)).join("\n");
				const confirmed = await ctx.ui.confirm("Create model stacks?", `${preview}\n\n${CONFIG_PATH}`);
				if (!confirmed) return;
				try {
					writeInitialConfig(proposed);
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					ctx.ui.notify(`Could not create ${CONFIG_PATH}: ${message}`, "error");
					return;
				}
				ctx.ui.notify(`Created ${CONFIG_PATH}`, "info");
				return;
			}
			if (args.trim() !== "") {
				ctx.ui.notify("Usage: /stacks or /stacks init", "warning");
				return;
			}

			const config = loadStacks();
			if ("error" in config) {
				ctx.ui.notify(config.error, "error");
				return;
			}

			const lines = config.stacks.map((stack) => targetLabel(stack));
			const resolution = resolveStacks(config.stacks, ctx);
			const missing = scopedModelsMissingFrom(config.stacks, ctx);
			const sections = [`Stacks\n${lines.join("\n")}`];
			if (resolution.diagnostics.length > 0) sections.push(`Unavailable or invalid\n${resolution.diagnostics.join("\n")}`);
			if (missing.length > 0) sections.push(`Scoped but not configured\n${missing.join("\n")}`);
			sections.push(CONFIG_PATH);
			ctx.ui.notify(sections.join("\n\n"), resolution.diagnostics.length > 0 ? "warning" : "info");
		},
	});
}
