/**
 * /insights
 *
 * Generate a grounded coding-session reflection prompt from local Pi and Codex
 * JSONL logs, then ask the current agent to analyze recurring workflow patterns.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { fileURLToPath } from "node:url";

type InsightsMode = "prompt" | "harness" | "summary" | "eval-pack" | "report" | "run-bakeoff" | "prompts";

const modes: InsightsMode[] = ["prompt", "harness", "summary", "eval-pack", "report", "run-bakeoff", "prompts"];

function parseArgs(args: string): { mode: InsightsMode; passthrough: string[]; error?: string } {
	const parts = args.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, "")) ?? [];
	const mode = parts[0] && !parts[0].startsWith("-") ? parts.shift()! : "prompt";
	if (!modes.includes(mode as InsightsMode)) {
		return {
			mode: "prompt",
			passthrough: [],
			error: `Unknown insights mode "${mode}". Use prompt, harness, summary, eval-pack, report, run-bakeoff, or prompts.`,
		};
	}
	return { mode: mode as InsightsMode, passthrough: parts };
}

function scriptPath(): string {
	return fileURLToPath(new URL("../session-insights.mjs", import.meta.url));
}

async function runInsightsScript(pi: ExtensionAPI, mode: InsightsMode, passthrough: string[], ctx: ExtensionContext) {
	const args = [scriptPath(), mode, ...passthrough];
	if (!passthrough.includes("--cwd") && !passthrough.some((arg) => arg.startsWith("--cwd="))) {
		args.push("--cwd", ctx.cwd, "--fallback-global");
	}
	const result = await pi.exec("node", args, { timeout: 600_000 });
	if (result.code !== 0) {
		const detail = (result.stderr || result.stdout || "session-insights.mjs failed").trim();
		ctx.ui.notify(detail.slice(0, 500), "error");
		return null;
	}
	return result.stdout.trim();
}

export default function insightsExtension(pi: ExtensionAPI) {
	pi.registerCommand("insights", {
		description: "Reflect on recent Pi/Codex coding sessions. Usage: /insights [prompt|harness|summary|eval-pack|report|run-bakeoff|prompts] [--days N] [--limit N] [--source all|pi|codex] [--file PATH] [--prompt NAME]",
		handler: async (args, ctx) => {
			const parsed = parseArgs(args);
			if (parsed.error) {
				ctx.ui.notify(parsed.error, "error");
				return;
			}

			const output = await runInsightsScript(pi, parsed.mode, parsed.passthrough, ctx);
			if (!output) return;

			if (parsed.mode === "prompt" || parsed.mode === "harness") {
				const noSessions = output.includes("<!-- insights:no-sessions -->");
				pi.sendMessage(
					{
						customType: "insights",
						content: output,
						display: true,
					},
					{ triggerTurn: !noSessions },
				);
				if (noSessions) {
					ctx.ui.notify("No useful sessions found for this /insights scope.", "warning");
				}
				return;
			}

			pi.sendMessage(
				{
					customType: "insights",
					content: output,
					display: true,
				},
				{ triggerTurn: false },
			);
		},
	});
}
