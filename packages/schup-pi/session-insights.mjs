#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 12;
const DEFAULT_PROMPT = "evidence-coach";
const DEFAULT_MODEL = "openai-codex/gpt-5.4-mini";
const DEFAULT_JUDGE_MODEL = "openai-codex/gpt-5.5";

const PROMPTS = {
	"claude-style": {
		label: "Claude-style concise retrospective",
		description: "Short session retrospective with observed patterns, likely root causes, and a few changes.",
		instruction: `You are analyzing local AI coding-agent sessions.

Write a concise retrospective. Separate what the agent did from what the human did. Use only the evidence in the session packet.

Include:
- 3-5 recurring patterns, each with evidence.
- 2-4 high-leverage improvements for the agent workflow.
- 2-4 coaching notes for the human, phrased as concrete behavior changes.
- Any uncertainty or missing evidence.

Avoid generic productivity advice. Do not invent facts not present in the packet.`,
	},
	"evidence-coach": {
		label: "Evidence-first agent and human coaching",
		description: "Grounded coaching with explicit evidence, confidence, and next experiment.",
		instruction: `You are a senior engineer reviewing AI coding-agent sessions for process improvement.

Your job is to find repeated failure modes and useful habits across the sessions. Treat the human and the agent as a joint system. Use direct, plain language.

For each finding:
- Name the pattern.
- Quote or summarize the evidence from specific sessions. If you cannot cite evidence, do not present it as a finding.
- Explain why it matters.
- Give one concrete change for the agent setup, prompt, skill, extension, command, or workflow.
- Give one concrete coaching note for the human.
- Mark confidence as high, medium, or low.

Group the output under these headings:

1. Human Coaching
- Behavior changes or prompting habits for the human.

2. Agent / Harness Improvements
- Changes to AGENTS.md, CLAUDE.md, prompt modes, skills, extensions, hooks, MCP servers, helper scripts, or command defaults.
- Include the target file or mechanism, proposed wording/config when possible, evidence, expected effect, and risk.

3. Workflow Experiments
- Small experiments that test whether the coaching or harness change helped.

Prioritize findings that are actionable and likely to recur. Ignore one-off trivia. Do not infer personality or motivation. If the data is too thin, say so.

End with "Next 5-session experiment": the smallest 2-3 changes worth trying in the next five sessions, with what evidence would show they helped.`,
	},
	harness: {
		label: "Harness improvement recommendations",
		description: "Patchable recommendations for AGENTS.md, skills, prompt modes, hooks, extensions, and helper scripts.",
		instruction: `You are reviewing AI coding-agent sessions to improve the agent harness.

Focus on changes the environment can make for future sessions. Do not lead with generic coaching for the human.

Use only evidence in the packet. If the evidence is thin, say what signal is missing.

Write the output in these sections:

1. Session Evidence
- The smallest set of observations that matter for harness design.

2. AGENTS.md / CLAUDE.md Changes
- For each recommendation, include target path or scope, proposed text block, evidence, expected effect, and risk or when not to apply.

3. Skill or Prompt-Mode Changes
- Recommend new or changed skills, prompt modes, or reusable command prompts.
- Include trigger wording and the behavior the agent should follow.

4. Extension / Hook / Helper Changes
- Recommend changes to slash commands, extension defaults, local helper scripts, hooks, or MCP/tool configuration.
- Include acceptance checks where possible.

5. Do Not Change Yet
- List tempting changes that are not supported by the evidence.

6. Next Verification
- The smallest follow-up run or session sample that would prove the recommendation is useful.

Rules:
- Every recommendation must cite session evidence.
- Prefer copyable text or config over abstract advice.
- Do not give standalone human advice unless it directly motivates a harness change.
- Keep it concise and patch-oriented.`,
	},
	"eval-rubric": {
		label: "Rubric-oriented improvement evaluator",
		description: "Scores session process dimensions and proposes measurable follow-up experiments.",
		instruction: `You are evaluating AI coding sessions against a rubric.

Score the session set from 1-5 on each dimension:
- Goal clarity.
- Context gathering.
- Tool discipline.
- Verification quality.
- Recovery from errors.
- Human-agent coordination.
- End-state clarity.

For each score, cite evidence. Then propose a small experiment that would move the lowest two scores up by one point. The experiment must be testable on the next 5 sessions.

Do not reward style. Reward behavior shown in the logs.`,
	},
	"anti-slop": {
		label: "Anti-slop critique",
		description: "Blunt filter for vague advice, unsupported claims, and fake precision.",
		instruction: `You are a skeptical reviewer of AI-generated session insights.

Analyze the sessions and produce only advice that survives evidence checks. Call out:
- Unsupported claims the analyst might be tempted to make.
- Patterns that are real but not important.
- Patterns that are important but under-evidenced.
- Advice that would be harmful or distracting.

Then give the smallest set of changes worth trying next. Keep it specific and grounded.`,
	},
	"claude-code-report": {
		label: "Claude Code-style report",
		description: "Structured report sections modeled on the inspected Claude Code /insights spec.",
		instruction: `You are generating a Claude Code-style /insights report from local AI coding-agent session evidence.

Use only the evidence in the packet. Do not infer personality or motivation. Do not claim a pattern unless you can point to session evidence.

Write the report in these sections:

1. At a Glance
- What's working.
- What's hindering.
- Quick wins.
- Ambitious workflows.

2. What You Work On
- 4-5 project/task areas with session evidence.

3. How You Use The Agent
- A short second-person narrative about interaction style, with one key pattern.

4. Impressive Things That Worked
- 2-3 workflows or habits that look useful.

5. Where Things Go Wrong
- 3 friction categories with concrete examples.

6. Suggested Instructions / Config Additions
- Specific lines or small blocks that could go in AGENTS.md, CLAUDE.md, or a prompt mode.
- Explain why each is based on these sessions.

7. Existing Features To Try
- Choose from skills, hooks, MCP servers, headless mode, task agents, or local helper commands.
- Include a concrete command, config, or copyable prompt where possible.

8. On The Horizon
- 2-3 larger workflows that may become useful as the tooling improves.

9. Memorable Moment
- One brief human, surprising, or useful moment from the evidence.

Keep the tone direct and useful. Prefer short sections over a long essay. Mention uncertainty where the sample is thin.`,
	},
};

const JUDGE_PROMPT = `You are judging competing AI coding-session insight reports.

Score each candidate from 1-5 on:
- Evidence grounding: cites real session behavior, not vibes.
- Specificity: recommends concrete changes, not generic advice.
- Human coaching quality: useful to the human without blame or fluff.
- Agent improvement quality: suggests changes the agent/tooling can actually adopt.
- Calibration: states uncertainty and avoids overclaiming.
- Recurrence value: focuses on patterns likely to matter again.

Penalize:
- Advice that could be written without reading the logs.
- Unsupported personality claims about the human.
- Confident claims from one thin example.
- Long summaries that do not change future behavior.

Return JSON:
{
  "winner": "candidate id",
  "scores": {
    "candidate id": {
      "evidence": 1,
      "specificity": 1,
      "humanCoaching": 1,
      "agentImprovement": 1,
      "calibration": 1,
      "recurrence": 1,
      "overall": 1,
      "notes": "short explanation"
    }
  },
  "bestIdeasToKeep": ["..."],
  "failureModes": ["..."]
}`;

function usage() {
	return `Usage: node session-insights.mjs <command> [options]

Commands:
  summary       Print a local summary of recent Pi/Codex sessions.
  prompt        Print a prompt packet for one insight prompt variant.
  harness       Print a harness-improvement prompt packet.
  eval-pack     Print all prompt variants and a judge rubric as JSON.
  report        Generate a Claude Code-style local HTML report via llm.
  run-bakeoff   Run all prompt variants through llm and judge the outputs.
  prompts       List prompt variants.

Options:
  --days N          Look back N days. Default: ${DEFAULT_DAYS}
  --limit N         Max sessions per source. Default: ${DEFAULT_LIMIT}
  --source NAME     all, pi, or codex. Default: all
  --cwd PATH        Filter sessions to this cwd.
  --file PATH       Analyze this exact session JSONL file. Can be repeated.
  --prompt NAME     Prompt for the prompt command. Default: ${DEFAULT_PROMPT}
  --model NAME      llm model for run-bakeoff. Default: ${DEFAULT_MODEL}
  --judge-model NAME
                    llm model for judging. Default: ${DEFAULT_JUDGE_MODEL}
  --output-dir PATH Output directory for run-bakeoff artifacts.
  --fallback-global
                    If --cwd finds no useful sessions, retry without cwd.
  --json            JSON output for summary.
`;
}

function parseArgs(argv) {
	const args = {
		command: "summary",
		days: DEFAULT_DAYS,
		limit: DEFAULT_LIMIT,
		source: "all",
		cwd: undefined,
		files: [],
		prompt: DEFAULT_PROMPT,
		model: DEFAULT_MODEL,
		judgeModel: DEFAULT_JUDGE_MODEL,
		outputDir: undefined,
		fallbackGlobal: false,
		json: false,
	};
	const rest = [...argv];
	if (rest[0] && !rest[0].startsWith("-")) {
		args.command = rest.shift();
	}
	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		if (arg === "--help" || arg === "-h") {
			args.command = "help";
		} else if (arg === "--json") {
			args.json = true;
		} else if (arg === "--days") {
			args.days = Number(rest[++i]);
		} else if (arg.startsWith("--days=")) {
			args.days = Number(arg.slice("--days=".length));
		} else if (arg === "--limit") {
			args.limit = Number(rest[++i]);
		} else if (arg.startsWith("--limit=")) {
			args.limit = Number(arg.slice("--limit=".length));
		} else if (arg === "--source") {
			args.source = rest[++i];
		} else if (arg.startsWith("--source=")) {
			args.source = arg.slice("--source=".length);
		} else if (arg === "--cwd") {
			args.cwd = path.resolve(rest[++i]);
		} else if (arg.startsWith("--cwd=")) {
			args.cwd = path.resolve(arg.slice("--cwd=".length));
		} else if (arg === "--file") {
			args.files.push(path.resolve(rest[++i]));
		} else if (arg.startsWith("--file=")) {
			args.files.push(path.resolve(arg.slice("--file=".length)));
		} else if (arg === "--prompt") {
			args.prompt = rest[++i];
		} else if (arg.startsWith("--prompt=")) {
			args.prompt = arg.slice("--prompt=".length);
		} else if (arg === "--model") {
			args.model = rest[++i];
		} else if (arg.startsWith("--model=")) {
			args.model = arg.slice("--model=".length);
		} else if (arg === "--judge-model") {
			args.judgeModel = rest[++i];
		} else if (arg.startsWith("--judge-model=")) {
			args.judgeModel = arg.slice("--judge-model=".length);
		} else if (arg === "--output-dir") {
			args.outputDir = rest[++i];
		} else if (arg.startsWith("--output-dir=")) {
			args.outputDir = arg.slice("--output-dir=".length);
		} else if (arg === "--fallback-global") {
			args.fallbackGlobal = true;
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	if (!Number.isFinite(args.days) || args.days <= 0) {
		throw new Error("--days must be a positive number");
	}
	if (!Number.isFinite(args.limit) || args.limit <= 0) {
		throw new Error("--limit must be a positive number");
	}
	if (!["all", "pi", "codex"].includes(args.source)) {
		throw new Error("--source must be all, pi, or codex");
	}
	for (const filePath of args.files) {
		if (!filePath.endsWith(".jsonl")) throw new Error(`--file must point to a .jsonl file: ${filePath}`);
	}
	if (!PROMPTS[args.prompt]) {
		throw new Error(`Unknown prompt: ${args.prompt}`);
	}
	if (!args.model || typeof args.model !== "string") {
		throw new Error("--model must be a model name");
	}
	if (args.judgeModel !== undefined && !args.judgeModel) {
		throw new Error("--judge-model must be a model name");
	}
	return args;
}

function safeJson(line) {
	try {
		return JSON.parse(line);
	} catch {
		return null;
	}
}

function textFromContent(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts = [];
	for (const item of content) {
		if (!item || typeof item !== "object") continue;
		if (typeof item.text === "string") parts.push(item.text);
		else if (typeof item.output_text === "string") parts.push(item.output_text);
		else if (typeof item.input_text === "string") parts.push(item.input_text);
	}
	return parts.join("\n").trim();
}

function redactText(text) {
	let out = String(text || "");
	const replacements = [
		[/\b(sk-or-v1-[A-Za-z0-9_-]{12,})\b/g, "[REDACTED_OPENROUTER_KEY]"],
		[/\b(sk-ant-[A-Za-z0-9_-]{12,})\b/g, "[REDACTED_ANTHROPIC_KEY]"],
		[/\b(sk-[A-Za-z0-9_-]{20,})\b/g, "[REDACTED_OPENAI_KEY]"],
		[/\b(github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED_GITHUB_TOKEN]"],
		[/\b(gh[pousr]_[A-Za-z0-9_]{20,})\b/g, "[REDACTED_GITHUB_TOKEN]"],
		[/\b(AKIA[0-9A-Z]{16})\b/g, "[REDACTED_AWS_KEY_ID]"],
		[/\b(xox[baprs]-[A-Za-z0-9-]{20,})\b/g, "[REDACTED_SLACK_TOKEN]"],
		[
			/\b((?:OPENAI|OPENROUTER|ANTHROPIC|GITHUB|GH|GOOGLE|AWS|SLACK|SENTRY|NPM|PYPI|DATABASE|DB)?_?(?:API_?KEY|TOKEN|SECRET|PASSWORD|PASSWD|AUTHORIZATION))\s*=\s*['"]?[^'"\s]+/gi,
			"$1=[REDACTED]",
		],
		[
			/\b(Authorization:\s*(?:Bearer|Basic)\s+)[A-Za-z0-9._~+/=-]{12,}/gi,
			"$1[REDACTED]",
		],
	];
	for (const [pattern, replacement] of replacements) {
		out = out.replace(pattern, replacement);
	}
	return out;
}

function shorten(text, max = 700) {
	const clean = redactText(text).replace(/\s+/g, " ").trim();
	if (clean.length <= max) return clean;
	return `${clean.slice(0, max - 1).trim()}...`;
}

function addCount(map, key, by = 1) {
	if (!key) return;
	map.set(key, (map.get(key) || 0) + by);
}

function mapToObject(map) {
	return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function readNumber(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const n = Number(value);
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

function extractTokens(usage) {
	if (!usage || typeof usage !== "object") return 0;
	return (
		readNumber(usage.totalTokens) ||
		readNumber(usage.total_tokens) ||
		readNumber(usage.total_tokens_count) ||
		readNumber(usage.total) ||
		readNumber(usage.tokens?.total) ||
		readNumber(usage.input) + readNumber(usage.output) ||
		readNumber(usage.input_tokens) + readNumber(usage.output_tokens) ||
		readNumber(usage.inputTokens) + readNumber(usage.outputTokens) ||
		readNumber(usage.promptTokens) + readNumber(usage.completionTokens) ||
		readNumber(usage.prompt_tokens) + readNumber(usage.completion_tokens)
	);
}

function extractCost(usage) {
	if (!usage || typeof usage !== "object") return 0;
	if (typeof usage.cost === "number" || typeof usage.cost === "string") return readNumber(usage.cost);
	if (usage.cost && typeof usage.cost === "object") return readNumber(usage.cost.total);
	return 0;
}

function commandFromToolArgs(args) {
	if (!args || typeof args !== "object") return "";
	for (const key of ["cmd", "command", "script"]) {
		if (typeof args[key] === "string") return args[key];
	}
	if (Array.isArray(args.command)) return args.command.join(" ");
	return "";
}

function classifyCommand(command) {
	const c = command.toLowerCase();
	if (!c) return [];
	const tags = [];
	if (/\b(npm|pnpm|yarn)\s+(run\s+)?(test|check|typecheck|lint)\b/.test(c)) tags.push("verification");
	if (/\b(uv\s+run\s+)?pytest\b|\bcargo\s+test\b|\bgo\s+test\b|\bmake\s+test\b|\bdeno\s+test\b/.test(c)) tags.push("verification");
	if (/\b(tsc|eslint|ruff|mypy|cargo\s+clippy)\b/.test(c)) tags.push("verification");
	if (/\bgit\s+(status|diff|show|log|grep|branch|rev-parse)\b/.test(c)) tags.push("git-inspection");
	if (/\bgit\s+(add|commit|push|merge|rebase|checkout|switch|reset)\b/.test(c)) tags.push("git-mutation");
	if (/\b(rg|fd|find|ls|sed|awk)\b/.test(c)) tags.push("exploration");
	return tags;
}

function newSummary(source, filePath) {
	return {
		source,
		filePath,
		id: "",
		startedAt: "",
		updatedAt: "",
		cwd: "",
		title: "",
		userPrompts: [],
		assistantMessages: 0,
		toolCalls: 0,
		toolResults: 0,
		failedTools: 0,
		editCalls: 0,
		verificationCommands: 0,
		gitInspectionCommands: 0,
		gitMutationCommands: 0,
		explorationCommands: 0,
		webSearches: 0,
		tokens: 0,
		cost: 0,
		tools: new Map(),
		models: new Map(),
		notableCommands: [],
		errorSnippets: [],
		assistantSnippets: [],
	};
}

function finalizeSummary(s) {
	s.userPrompts = s.userPrompts.map((prompt) => redactText(prompt));
	s.userTurns = s.userPrompts.length;
	s.firstUserPrompt = shorten(s.userPrompts[0] || "", 500);
	s.latestUserPrompt = shorten(s.userPrompts.at(-1) || "", 500);
	s.tools = mapToObject(s.tools);
	s.models = mapToObject(s.models);
	s.notableCommands = s.notableCommands.slice(0, 10);
	s.errorSnippets = s.errorSnippets.slice(0, 8);
	s.assistantSnippets = s.assistantSnippets.slice(0, 5);
	if (!s.title) {
		s.title = inferTitle(s.firstUserPrompt) || path.basename(s.filePath);
	}
	s.title = shorten(s.title, 140);
	s.notableCommands = s.notableCommands.map((cmd) => shorten(cmd, 220));
	s.errorSnippets = s.errorSnippets.map((snippet) => shorten(snippet, 300));
	s.assistantSnippets = s.assistantSnippets.map((snippet) => shorten(snippet, 350));
	return s;
}

function inferTitle(prompt) {
	const text = shorten(prompt, 120);
	if (!text) return "";
	const stripped = text
		.replace(/^<[^>]+>.*?<\/[^>]+>/, "")
		.replace(/^#\s*/, "")
		.trim();
	return stripped || text;
}

function parsePiSession(filePath) {
	const s = newSummary("pi", filePath);
	const lines = fs.readFileSync(filePath, "utf8").split(/\n/).filter(Boolean);
	const pendingToolNames = new Map();
	let skipInsightsTurn = false;
	for (const line of lines) {
		const obj = safeJson(line);
		if (!obj) continue;
		if (obj.timestamp) s.updatedAt = obj.timestamp;
		if (obj.type === "session") {
			s.id = obj.id || s.id;
			s.startedAt = obj.timestamp || s.startedAt;
			s.cwd = obj.cwd || s.cwd;
			continue;
		}
		if (obj.type === "model_change") {
			addCount(s.models, [obj.provider, obj.modelId].filter(Boolean).join("/"));
			continue;
		}
		if (obj.type === "custom_message" && (obj.customType === "insights" || String(obj.content || "").includes("Insight prompt variant:"))) {
			skipInsightsTurn = true;
			continue;
		}
		if (obj.type !== "message") continue;
		const msg = obj.message || {};
		if (skipInsightsTurn && msg.role !== "user") continue;
		if (msg.role === "user") skipInsightsTurn = false;
		if (msg.usage) {
			s.tokens += extractTokens(msg.usage);
			s.cost += extractCost(msg.usage);
		}
		if (msg.provider || msg.model) {
			addCount(s.models, [msg.provider, msg.model].filter(Boolean).join("/"));
		}
		const role = msg.role;
		if (role === "user") {
			const text = textFromContent(msg.content);
			if (text) s.userPrompts.push(text);
			continue;
		}
		if (role === "assistant") {
			s.assistantMessages += 1;
			const text = textFromContent(msg.content);
			if (text && s.assistantSnippets.length < 5) s.assistantSnippets.push(shorten(text, 350));
			for (const item of Array.isArray(msg.content) ? msg.content : []) {
				if (!item || item.type !== "toolCall") continue;
				recordToolCall(s, item.name, item.arguments);
				if (item.id) pendingToolNames.set(item.id, item.name);
			}
			continue;
		}
		if (role === "toolResult") {
			s.toolResults += 1;
			const isError = msg.isError === true || msg.content?.some?.((item) => item?.isError === true);
			if (isError) {
				s.failedTools += 1;
				const name = pendingToolNames.get(msg.toolCallId) || msg.toolName || "tool";
				const text = textFromContent(msg.content);
				s.errorSnippets.push(`${name}: ${shorten(text, 240)}`);
			}
		}
	}
	if (!s.startedAt) s.startedAt = timestampFromPiName(filePath) || fileMtimeIso(filePath);
	if (!s.updatedAt) s.updatedAt = s.startedAt;
	return finalizeSummary(s);
}

function recordToolCall(s, name, args) {
	const toolName = String(name || "unknown");
	s.toolCalls += 1;
	addCount(s.tools, toolName);
	if (/^(edit|multi_edit|apply_patch)$/i.test(toolName)) s.editCalls += 1;
	if (/web_search|search_query/i.test(toolName)) s.webSearches += 1;
	const command = commandFromToolArgs(args);
	if (command) {
		const tags = classifyCommand(command);
		if (tags.includes("verification")) s.verificationCommands += 1;
		if (tags.includes("git-inspection")) s.gitInspectionCommands += 1;
		if (tags.includes("git-mutation")) s.gitMutationCommands += 1;
		if (tags.includes("exploration")) s.explorationCommands += 1;
		if (tags.length && s.notableCommands.length < 10) s.notableCommands.push(shorten(command, 220));
	}
}

function parseCodexSession(filePath) {
	const s = newSummary("codex", filePath);
	const lines = fs.readFileSync(filePath, "utf8").split(/\n/).filter(Boolean);
	for (const line of lines) {
		const obj = safeJson(line);
		if (!obj) continue;
		if (obj.timestamp) s.updatedAt = obj.timestamp;
		if (obj.type === "session_meta") {
			const p = obj.payload || {};
			s.id = p.session_id || p.id || s.id;
			s.startedAt = p.timestamp || obj.timestamp || s.startedAt;
			s.cwd = p.cwd || s.cwd;
			addCount(s.models, [p.model_provider, p.model].filter(Boolean).join("/"));
			continue;
		}
		if (obj.type === "event_msg" && obj.payload?.type === "token_count") {
			const usage = obj.payload.info?.last_token_usage || obj.payload.info?.total_token_usage;
			s.tokens += extractTokens(usage);
			continue;
		}
		if (obj.type === "event_msg" && obj.payload?.type === "agent_message") {
			s.assistantMessages += 1;
			if (obj.payload.message && s.assistantSnippets.length < 5) s.assistantSnippets.push(shorten(obj.payload.message, 350));
			continue;
		}
		if (obj.type === "event_msg" && obj.payload?.type === "web_search_end") {
			s.webSearches += 1;
			continue;
		}
		if (obj.type !== "response_item") continue;
		const p = obj.payload || {};
		if (p.type === "web_search_call") {
			s.webSearches += 1;
			continue;
		}
		if (p.type === "function_call") {
			const args = typeof p.arguments === "string" ? safeJson(p.arguments) || { command: p.arguments } : p.arguments;
			recordToolCall(s, p.name, args);
			continue;
		}
		if (p.type === "function_call_output") {
			s.toolResults += 1;
			const out = typeof p.output === "string" ? p.output : JSON.stringify(p.output || "");
			const exitMatch = out.match(/Process exited with code (\d+)/);
			const failedExit = exitMatch ? Number(exitMatch[1]) !== 0 : false;
			if (failedExit || /isError["']?\s*:\s*true/i.test(out)) {
				s.failedTools += 1;
				s.errorSnippets.push(shorten(out, 240));
			}
			continue;
		}
		if (p.type === "message") {
			const role = p.role;
			if (role === "user") {
				const text = codexUserPromptText(textFromContent(p.content));
				if (text) s.userPrompts.push(text);
			} else if (role === "assistant") {
				s.assistantMessages += 1;
				const text = textFromContent(p.content);
				if (text && s.assistantSnippets.length < 5) s.assistantSnippets.push(shorten(text, 350));
			}
		}
	}
	if (!s.startedAt) s.startedAt = timestampFromCodexName(filePath) || fileMtimeIso(filePath);
	if (!s.updatedAt) s.updatedAt = s.startedAt;
	return finalizeSummary(s);
}

function codexUserPromptText(text) {
	const clean = text.trim();
	if (!clean) return "";
	if (clean.startsWith("<codex_internal_context")) {
		const objective = clean.match(/<objective>\s*([\s\S]*?)\s*<\/objective>/);
		if (objective?.[1]?.trim()) return `Active goal: ${objective[1].trim()}`;
		return "";
	}
	if (
		clean.startsWith("# AGENTS.md instructions") ||
		clean.startsWith("<environment_context>") ||
		clean.startsWith("<permissions instructions>")
	) {
		return "";
	}
	return clean;
}

function timestampFromPiName(filePath) {
	const name = path.basename(filePath);
	const m = name.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_/);
	if (!m) return "";
	return `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`;
}

function timestampFromCodexName(filePath) {
	const name = path.basename(filePath);
	const m = name.match(/^rollout-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-/);
	if (!m) return "";
	return `${m[1]}T${m[2]}:${m[3]}:${m[4]}.000Z`;
}

function fileMtimeIso(filePath) {
	try {
		return fs.statSync(filePath).mtime.toISOString();
	} catch {
		return "";
	}
}

async function walkJsonl(root) {
	const out = [];
	const stack = [root];
	while (stack.length) {
		const dir = stack.pop();
		let entries = [];
		try {
			entries = await fsp.readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const ent of entries) {
			const p = path.join(dir, ent.name);
			if (ent.isDirectory()) stack.push(p);
			else if (ent.isFile() && ent.name.endsWith(".jsonl")) out.push(p);
		}
	}
	return out;
}

function inferSourceFromPath(filePath) {
	const normalized = filePath.split(path.sep).join("/");
	if (normalized.includes("/.codex/sessions/")) return "codex";
	if (normalized.includes("/.pi/agent/sessions/")) return "pi";
	return "";
}

function parseSessionFile(source, filePath) {
	if (source === "pi") return parsePiSession(filePath);
	if (source === "codex") return parseCodexSession(filePath);
	throw new Error(`Cannot infer session source for ${filePath}; use a file under ~/.pi/agent/sessions or ~/.codex/sessions.`);
}

async function discoverExplicitFiles(args) {
	const sessions = [];
	for (const filePath of args.files) {
		const inferredSource = inferSourceFromPath(filePath);
		const source = args.source === "all" ? inferredSource : args.source;
		if (!source || (inferredSource && inferredSource !== source)) {
			throw new Error(`Session file ${filePath} does not match --source ${args.source}.`);
		}
		const summary = parseSessionFile(source, filePath);
		if (!isUsefulSession(summary)) continue;
		sessions.push(summary);
	}
	sessions.sort((a, b) => Date.parse(b.startedAt || b.updatedAt || 0) - Date.parse(a.startedAt || a.updatedAt || 0));
	return sessions;
}

async function discoverSessions(args) {
	if (args.files.length) return discoverExplicitFiles(args);
	const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;
	const sources = args.source === "all" ? ["pi", "codex"] : [args.source];
	const sessions = [];
	for (const source of sources) {
		const root = source === "pi" ? path.join(os.homedir(), ".pi", "agent", "sessions") : path.join(os.homedir(), ".codex", "sessions");
		const files = await walkJsonl(root);
		const parsed = [];
		for (const filePath of files) {
			let startedHint = source === "pi" ? timestampFromPiName(filePath) : timestampFromCodexName(filePath);
			let startedMs = startedHint ? Date.parse(startedHint) : 0;
			if (!startedMs) {
				try {
					startedMs = fs.statSync(filePath).mtimeMs;
				} catch {
					startedMs = 0;
				}
			}
			if (startedMs < cutoff) continue;
			try {
				const summary = source === "pi" ? parsePiSession(filePath) : parseCodexSession(filePath);
				if (args.cwd && path.resolve(summary.cwd || "/") !== args.cwd) continue;
				if (!isUsefulSession(summary)) continue;
				parsed.push(summary);
			} catch (err) {
				parsed.push({
					source,
					filePath,
					startedAt: new Date(startedMs).toISOString(),
					parseError: err instanceof Error ? err.message : String(err),
				});
			}
		}
		parsed.sort((a, b) => Date.parse(b.startedAt || b.updatedAt || 0) - Date.parse(a.startedAt || a.updatedAt || 0));
		sessions.push(...parsed.slice(0, args.limit));
	}
	sessions.sort((a, b) => Date.parse(b.startedAt || b.updatedAt || 0) - Date.parse(a.startedAt || a.updatedAt || 0));
	return sessions;
}

function isUsefulSession(summary) {
	return (
		(summary.userTurns || 0) > 0 ||
		(summary.toolCalls || 0) > 0 ||
		(summary.editCalls || 0) > 0 ||
		(summary.verificationCommands || 0) > 0 ||
		(summary.gitInspectionCommands || 0) > 0 ||
		(summary.webSearches || 0) > 0
	);
}

async function discoverSessionsWithFallback(args) {
	const sessions = await discoverSessions(args);
	if (args.files.length || !args.fallbackGlobal || !args.cwd || sessions.length > 0) {
		return { sessions, fallbackNotice: "" };
	}
	const fallbackArgs = { ...args, cwd: undefined, fallbackGlobal: false };
	const fallbackSessions = await discoverSessions(fallbackArgs);
	return {
		sessions: fallbackSessions,
		fallbackNotice: `No useful sessions found for cwd ${args.cwd}; widened to recent sessions across all cwd values.`,
	};
}

function aggregate(sessions) {
	const bySource = {};
	for (const source of ["pi", "codex"]) {
		const subset = sessions.filter((s) => s.source === source);
		bySource[source] = {
			sessions: subset.length,
			userTurns: subset.reduce((n, s) => n + (s.userTurns || 0), 0),
			toolCalls: subset.reduce((n, s) => n + (s.toolCalls || 0), 0),
			failedTools: subset.reduce((n, s) => n + (s.failedTools || 0), 0),
			verificationCommands: subset.reduce((n, s) => n + (s.verificationCommands || 0), 0),
			editCalls: subset.reduce((n, s) => n + (s.editCalls || 0), 0),
			webSearches: subset.reduce((n, s) => n + (s.webSearches || 0), 0),
			tokens: subset.reduce((n, s) => n + (s.tokens || 0), 0),
			cost: subset.reduce((n, s) => n + (s.cost || 0), 0),
		};
	}
	return { bySource };
}

function formatMoney(n) {
	if (!n) return "$0";
	return `$${n.toFixed(n >= 1 ? 2 : 4)}`;
}

function markdownSummary(sessions, args) {
	const agg = aggregate(sessions);
	const lines = [];
	if (sessions.length === 0) {
		lines.push("<!-- insights:no-sessions -->");
	}
	lines.push(`# Coding Session Insights Packet`);
	lines.push("");
	if (args.files.length) {
		lines.push(`Scope: ${args.files.length} explicit session file${args.files.length === 1 ? "" : "s"}, source ${args.source}.`);
	} else {
		lines.push(`Scope: last ${args.days} days, source ${args.source}, up to ${args.limit} sessions per source${args.cwd ? `, cwd ${args.cwd}` : ""}.`);
	}
	if (args.fallbackNotice) {
		lines.push("");
		lines.push(`Note: ${args.fallbackNotice}`);
	}
	lines.push("");
	lines.push(`Generated by \`${path.basename(fileURLToPath(import.meta.url))}\` on ${new Date().toISOString()}.`);
	lines.push("");
	lines.push(`## Aggregate Signals`);
	lines.push("");
	lines.push(`| Source | Sessions | User turns | Tool calls | Failed tools | Verification commands | Edits | Web searches | Tokens | Cost |`);
	lines.push(`|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|`);
	for (const source of ["pi", "codex"]) {
		const a = agg.bySource[source];
		lines.push(`| ${source} | ${a.sessions} | ${a.userTurns} | ${a.toolCalls} | ${a.failedTools} | ${a.verificationCommands} | ${a.editCalls} | ${a.webSearches} | ${Math.round(a.tokens)} | ${formatMoney(a.cost)} |`);
	}
	lines.push("");
	lines.push(`## Sessions`);
	lines.push("");
	if (sessions.length === 0) {
		lines.push(`No useful sessions found for this scope.`);
		lines.push("");
		lines.push(`A useful session needs at least one user turn, tool call, edit, verification command, git inspection command, or web search. Empty /insights self-analysis sessions are ignored.`);
		lines.push("");
		if (args.cwd && !args.fallbackGlobal) {
			lines.push(`Try widening the scope with \`--fallback-global\`, removing \`--cwd\`, or running more sessions in this repo first.`);
			lines.push("");
		}
	}
	for (const [i, s] of sessions.entries()) {
		lines.push(`### ${i + 1}. ${s.source}: ${s.title || s.id || path.basename(s.filePath)}`);
		lines.push("");
		lines.push(`- File: \`${s.filePath}\``);
		lines.push(`- Started: ${s.startedAt || "unknown"}`);
		if (s.cwd) lines.push(`- Cwd: \`${s.cwd}\``);
		if (s.models && Object.keys(s.models).length) lines.push(`- Models: ${Object.keys(s.models).join(", ")}`);
		if (s.tools && Object.keys(s.tools).length) lines.push(`- Tools: ${Object.entries(s.tools).map(([name, count]) => `${name} x${count}`).join(", ")}`);
		lines.push(`- Turns/tools: ${s.userTurns || 0} user turns, ${s.assistantMessages || 0} assistant messages, ${s.toolCalls || 0} tool calls, ${s.failedTools || 0} failed tool results`);
		lines.push(`- Work signals: ${s.editCalls || 0} edits, ${s.verificationCommands || 0} verification commands, ${s.gitInspectionCommands || 0} git inspection commands, ${s.webSearches || 0} web searches`);
		if (s.firstUserPrompt) lines.push(`- First user prompt: ${s.firstUserPrompt}`);
		if (s.latestUserPrompt && s.latestUserPrompt !== s.firstUserPrompt) lines.push(`- Latest user prompt: ${s.latestUserPrompt}`);
		if (s.assistantSnippets?.length) {
			lines.push(`- Assistant recommendation snippets:`);
			for (const snippet of s.assistantSnippets.slice(0, 3)) lines.push(`  - ${snippet}`);
		}
		if (s.notableCommands?.length) {
			lines.push(`- Notable commands:`);
			for (const cmd of s.notableCommands.slice(0, 5)) lines.push(`  - \`${cmd}\``);
		}
		if (s.errorSnippets?.length) {
			lines.push(`- Error snippets:`);
			for (const err of s.errorSnippets.slice(0, 3)) lines.push(`  - ${err}`);
		}
		lines.push("");
	}
	return lines.join("\n");
}

function promptPacket(sessions, args) {
	if (sessions.length === 0) {
		return markdownSummary(sessions, args);
	}
	const prompt = PROMPTS[args.prompt];
	return `${prompt.instruction}

---

Insight prompt variant: ${args.prompt}
Variant label: ${prompt.label}

${markdownSummary(sessions, args)}`;
}

function evalPack(sessions, args) {
	return {
		generatedAt: new Date().toISOString(),
		scope: {
			days: args.days,
			limit: args.limit,
			source: args.source,
			cwd: args.cwd || null,
			files: args.files,
		},
		sessions,
		aggregate: aggregate(sessions),
		promptVariants: Object.fromEntries(Object.entries(PROMPTS).map(([id, prompt]) => [id, prompt])),
		judgePrompt: JUDGE_PROMPT,
	};
}

function timestampSlug(date = new Date()) {
	return date.toISOString().replace(/[:.]/g, "-");
}

async function writeText(filePath, text) {
	await fsp.mkdir(path.dirname(filePath), { recursive: true });
	await fsp.writeFile(filePath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function runLlm(model, prompt) {
	const result = spawnSync("llm", ["-m", model, "-n"], {
		input: prompt,
		encoding: "utf8",
		maxBuffer: 80 * 1024 * 1024,
	});
	return {
		code: result.status ?? 1,
		stdout: result.stdout || "",
		stderr: result.stderr || "",
		error: result.error?.message,
	};
}

function escapeHtml(text) {
	return String(text || "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function renderMarkdownLite(markdown) {
	const lines = String(markdown || "").split(/\n/);
	const out = [];
	let inList = false;
	let inCode = false;
	for (const raw of lines) {
		const line = raw.replace(/\s+$/, "");
		if (line.startsWith("```")) {
			if (inCode) {
				out.push("</code></pre>");
				inCode = false;
			} else {
				if (inList) {
					out.push("</ul>");
					inList = false;
				}
				out.push("<pre><code>");
				inCode = true;
			}
			continue;
		}
		if (inCode) {
			out.push(escapeHtml(line));
			continue;
		}
		if (!line.trim()) {
			if (inList) {
				out.push("</ul>");
				inList = false;
			}
			continue;
		}
		const heading = line.match(/^(#{1,4})\s+(.+)$/);
		if (heading) {
			if (inList) {
				out.push("</ul>");
				inList = false;
			}
			const level = heading[1].length;
			out.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
			continue;
		}
		const bullet = line.match(/^\s*[-*]\s+(.+)$/);
		if (bullet) {
			if (!inList) {
				out.push("<ul>");
				inList = true;
			}
			out.push(`<li>${inlineMarkdown(escapeHtml(bullet[1]))}</li>`);
			continue;
		}
		if (inList) {
			out.push("</ul>");
			inList = false;
		}
		out.push(`<p>${inlineMarkdown(escapeHtml(line))}</p>`);
	}
	if (inCode) out.push("</code></pre>");
	if (inList) out.push("</ul>");
	return out.join("\n");
}

function inlineMarkdown(html) {
	return html
		.replace(/`([^`]+)`/g, "<code>$1</code>")
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function reportHtml({ markdown, packet, args, generatedAt }) {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coding Session Insights</title>
<style>
:root { color-scheme: light dark; --bg: #f7f7f4; --fg: #181916; --muted: #66685f; --panel: #ffffff; --border: #d9d8cf; --accent: #1f6f78; }
@media (prefers-color-scheme: dark) { :root { --bg: #151614; --fg: #f2f1ea; --muted: #b0afa5; --panel: #20211e; --border: #3a3a34; --accent: #73c7d3; } }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
main { max-width: 980px; margin: 0 auto; padding: 32px 20px 56px; }
header { border-bottom: 1px solid var(--border); margin-bottom: 28px; padding-bottom: 18px; }
h1 { font-size: 30px; line-height: 1.15; margin: 0 0 8px; }
h2 { font-size: 22px; margin-top: 34px; border-top: 1px solid var(--border); padding-top: 22px; }
h3 { font-size: 18px; margin-top: 24px; }
p, li { max-width: 78ch; }
.meta { color: var(--muted); }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 18px; margin: 22px 0; }
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
code { background: color-mix(in srgb, var(--panel) 75%, var(--border)); border-radius: 4px; padding: 1px 4px; }
pre { overflow-x: auto; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }
details { margin-top: 24px; }
summary { cursor: pointer; color: var(--accent); font-weight: 600; }
</style>
</head>
<body>
<main>
<header>
<h1>Coding Session Insights</h1>
<div class="meta">Generated ${escapeHtml(generatedAt)} with ${escapeHtml(args.model)}. Source: ${escapeHtml(args.source)}. Limit: ${escapeHtml(String(args.limit))} per source.</div>
</header>
<section class="panel">
${renderMarkdownLite(markdown)}
</section>
<details>
<summary>Source packet</summary>
${renderMarkdownLite(packet)}
</details>
</main>
</body>
</html>`;
}

function bakeoffJudgeInput(outputs) {
	const lines = [];
	lines.push(JUDGE_PROMPT);
	lines.push("");
	lines.push("---");
	lines.push("");
	lines.push("Candidates:");
	for (const output of outputs) {
		lines.push("");
		lines.push(`## ${output.id}: ${output.label}`);
		lines.push("");
		lines.push(output.output.trim() || "(empty output)");
	}
	return lines.join("\n");
}

function bakeoffReport({ args, outDir, sessions, packet, outputs, judgeOutput }) {
	const lines = [];
	lines.push("# Coding Session Insights Bakeoff");
	lines.push("");
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push(`Model: \`${args.model}\``);
	lines.push(`Judge model: \`${args.judgeModel || args.model}\``);
	lines.push(`Output directory: \`${outDir}\``);
	lines.push("");
	lines.push("## Scope");
	lines.push("");
	lines.push(`- Days: ${args.days}`);
	lines.push(`- Limit per source: ${args.limit}`);
	lines.push(`- Source: ${args.source}`);
	if (args.cwd) lines.push(`- Cwd: \`${args.cwd}\``);
	lines.push(`- Sessions included: ${sessions.length}`);
	lines.push("");
	lines.push("## Candidate Outputs");
	lines.push("");
	for (const output of outputs) {
		lines.push(`- \`${output.id}\`: ${output.ok ? "ok" : "failed"} (${output.outputPath})`);
		if (!output.ok && output.error) lines.push(`  Error: ${output.error}`);
	}
	lines.push("");
	lines.push("## Judge Output");
	lines.push("");
	lines.push(judgeOutput.trim() || "(empty judge output)");
	lines.push("");
	lines.push("## Packet");
	lines.push("");
	lines.push(packet);
	return lines.join("\n");
}

async function runClaudeReport(sessions, args) {
	const outDir = path.resolve(args.outputDir || path.join(".pi", "insights-reports", timestampSlug()));
	const generatedAt = new Date().toISOString();
	const packet = markdownSummary(sessions, args);
	const reportPrompt = `${PROMPTS["claude-code-report"].instruction}

---

Use this redacted session packet:

${packet}`;
	await fsp.mkdir(outDir, { recursive: true });
	await writeText(path.join(outDir, "packet.md"), packet);
	await writeText(path.join(outDir, "report.prompt.md"), reportPrompt);
	const result = runLlm(args.model, reportPrompt);
	const markdown = result.stdout.trim() || result.stderr.trim() || result.error || "";
	await writeText(path.join(outDir, "report.md"), markdown || "(empty report output)");
	await writeText(path.join(outDir, "report.html"), reportHtml({ markdown, packet, args, generatedAt }));
	const manifest = {
		generatedAt,
		model: args.model,
		scope: {
			days: args.days,
			limit: args.limit,
			source: args.source,
			cwd: args.cwd || null,
		},
		ok: result.code === 0 && Boolean(result.stdout.trim()),
		exitCode: result.code,
		error: [result.error, result.stderr.trim()].filter(Boolean).join("\n").trim(),
		outDir,
		reportPath: path.join(outDir, "report.html"),
		markdownPath: path.join(outDir, "report.md"),
		sessions: sessions.map((s) => ({
			source: s.source,
			filePath: s.filePath,
			startedAt: s.startedAt,
			cwd: s.cwd,
			title: s.title,
		})),
	};
	await writeText(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
	return manifest;
}

async function runBakeoff(sessions, args) {
	const outDir = path.resolve(args.outputDir || path.join(".pi", "insights-bakeoffs", timestampSlug()));
	const packet = markdownSummary(sessions, args);
	await fsp.mkdir(outDir, { recursive: true });
	await writeText(path.join(outDir, "packet.md"), packet);
	await writeText(path.join(outDir, "eval-pack.json"), JSON.stringify(evalPack(sessions, args), null, 2));

	const outputs = [];
	for (const [id, prompt] of Object.entries(PROMPTS)) {
		const candidatePrompt = `${prompt.instruction}

---

Insight prompt variant: ${id}
Variant label: ${prompt.label}

${packet}`;
		const promptPath = path.join(outDir, `${id}.prompt.md`);
		const outputPath = path.join(outDir, `${id}.output.md`);
		await writeText(promptPath, candidatePrompt);
		const result = runLlm(args.model, candidatePrompt);
		const output = result.stdout.trim();
		const error = [result.error, result.stderr.trim()].filter(Boolean).join("\n").trim();
		await writeText(outputPath, output || error || "(empty output)");
		outputs.push({
			id,
			label: prompt.label,
			description: prompt.description,
			promptPath,
			outputPath,
			ok: result.code === 0 && output.length > 0,
			output,
			error,
			exitCode: result.code,
		});
	}

	const judgeInput = bakeoffJudgeInput(outputs);
	await writeText(path.join(outDir, "judge.prompt.md"), judgeInput);
	const judgeResult = runLlm(args.judgeModel || args.model, judgeInput);
	const judgeOutput = judgeResult.stdout.trim() || judgeResult.stderr.trim() || judgeResult.error || "";
	await writeText(path.join(outDir, "judge.output.md"), judgeOutput || "(empty judge output)");

	const manifest = {
		generatedAt: new Date().toISOString(),
		model: args.model,
		judgeModel: args.judgeModel || args.model,
		scope: {
			days: args.days,
			limit: args.limit,
			source: args.source,
			cwd: args.cwd || null,
		},
		outDir,
		sessions: sessions.map((s) => ({
			source: s.source,
			filePath: s.filePath,
			startedAt: s.startedAt,
			cwd: s.cwd,
			title: s.title,
		})),
		outputs: outputs.map(({ output, ...rest }) => rest),
		judge: {
			ok: judgeResult.code === 0 && Boolean(judgeResult.stdout.trim()),
			exitCode: judgeResult.code,
			error: [judgeResult.error, judgeResult.stderr.trim()].filter(Boolean).join("\n").trim(),
			outputPath: path.join(outDir, "judge.output.md"),
		},
	};
	await writeText(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
	await writeText(path.join(outDir, "report.md"), bakeoffReport({ args, outDir, sessions, packet, outputs, judgeOutput }));
	return { outDir, outputs, judgeOutput, manifest };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.command === "help") {
		console.log(usage());
		return;
	}
	if (args.command === "prompts") {
		for (const [id, prompt] of Object.entries(PROMPTS)) {
			console.log(`${id}\t${prompt.label}\t${prompt.description}`);
		}
		return;
	}
	if (!["summary", "prompt", "harness", "eval-pack", "report", "run-bakeoff"].includes(args.command)) {
		throw new Error(`Unknown command: ${args.command}`);
	}
	const { sessions, fallbackNotice } = await discoverSessionsWithFallback(args);
	const effectiveArgs = fallbackNotice ? { ...args, fallbackNotice } : args;
	if (args.command === "summary") {
		if (args.json) console.log(JSON.stringify({ sessions, aggregate: aggregate(sessions), fallbackNotice }, null, 2));
		else console.log(markdownSummary(sessions, effectiveArgs));
		return;
	}
	if (args.command === "prompt") {
		console.log(promptPacket(sessions, effectiveArgs));
		return;
	}
	if (args.command === "harness") {
		console.log(promptPacket(sessions, { ...effectiveArgs, prompt: "harness" }));
		return;
	}
	if (args.command === "report") {
		const manifest = await runClaudeReport(sessions, effectiveArgs);
		console.log(`Report written to ${manifest.reportPath}`);
		console.log(`markdown\t${manifest.markdownPath}`);
		console.log(`status\t${manifest.ok ? "ok" : "failed"}`);
		return;
	}
	if (args.command === "run-bakeoff") {
		const result = await runBakeoff(sessions, effectiveArgs);
		console.log(`Bakeoff written to ${result.outDir}`);
		for (const output of result.outputs) {
			console.log(`${output.ok ? "ok" : "failed"}\t${output.id}\t${output.outputPath}`);
		}
		console.log(`judge\t${result.manifest.judge.ok ? "ok" : "failed"}\t${result.manifest.judge.outputPath}`);
		return;
	}
	console.log(JSON.stringify(evalPack(sessions, effectiveArgs), null, 2));
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : String(err));
	console.error("");
	console.error(usage());
	process.exit(1);
});
