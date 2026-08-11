import assert from "node:assert/strict";
import test from "node:test";
import { suggestStacks, type StackCandidate } from "../extensions/stacks.ts";

const ALL_EFFORTS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

function candidate(provider: string, model: string, overrides: Partial<StackCandidate> = {}): StackCandidate {
	return { provider, model, supportedEfforts: ALL_EFFORTS, ...overrides };
}

test("suggests the evidence-informed ladder in order", () => {
	const result = suggestStacks([
		candidate("openai-codex", "gpt-5.6-sol"),
		candidate("anthropic", "claude-fable-5"),
		candidate("openai-codex", "gpt-5.6-luna"),
		candidate("deepseek", "deepseek-v4-flash"),
		candidate("anthropic", "claude-opus-5"),
		candidate("openai-codex", "gpt-5.6-terra"),
	]);

	assert.deepEqual(result.map(({ model, effort }) => `${model}:${effort}`), [
		"deepseek-v4-flash:high",
		"gpt-5.6-luna:medium",
		"gpt-5.6-luna:high",
		"gpt-5.6-luna:xhigh",
		"gpt-5.6-terra:low",
		"gpt-5.6-terra:high",
		"claude-opus-5:high",
		"claude-fable-5:high",
		"gpt-5.6-sol:medium",
	]);
});

test("suggests GitHub Copilot models when they are the authenticated source", () => {
	const result = suggestStacks([
		candidate("github-copilot", "gpt-5.6-luna"),
		candidate("github-copilot", "gpt-5.6-terra"),
		candidate("github-copilot", "gpt-5.6-sol"),
	]);

	assert.deepEqual(result, [
		{ provider: "github-copilot", model: "gpt-5.6-luna", effort: "medium" },
		{ provider: "github-copilot", model: "gpt-5.6-luna", effort: "high" },
		{ provider: "github-copilot", model: "gpt-5.6-luna", effort: "xhigh" },
		{ provider: "github-copilot", model: "gpt-5.6-terra", effort: "low" },
		{ provider: "github-copilot", model: "gpt-5.6-terra", effort: "high" },
		{ provider: "github-copilot", model: "gpt-5.6-sol", effort: "medium" },
	]);
});

test("uses OpenRouter aliases when direct providers are absent", () => {
	const result = suggestStacks([
		candidate("openrouter", "deepseek/deepseek-v4-flash"),
		candidate("openrouter", "openai/gpt-5.6-luna"),
		candidate("openrouter", "anthropic/claude-opus-5"),
		candidate("openrouter", "anthropic/claude-fable-5"),
	]);

	assert.deepEqual(result.map(({ provider, model }) => `${provider}/${model}`), [
		"openrouter/deepseek/deepseek-v4-flash",
		"openrouter/openai/gpt-5.6-luna",
		"openrouter/openai/gpt-5.6-luna",
		"openrouter/openai/gpt-5.6-luna",
		"openrouter/anthropic/claude-opus-5",
		"openrouter/anthropic/claude-fable-5",
	]);
});

test("prefers a direct subscription provider when both are candidates", () => {
	const result = suggestStacks([
		candidate("openrouter", "anthropic/claude-fable-5"),
		candidate("anthropic", "claude-fable-5"),
	]);

	assert.deepEqual(result, [{ provider: "anthropic", model: "claude-fable-5", effort: "high" }]);
});

test("respects scoped effort pins instead of recipe defaults", () => {
	const result = suggestStacks([
		candidate("openai-codex", "gpt-5.6-luna", { pinnedEfforts: ["max", "low"] }),
		candidate("anthropic", "claude-fable-5", { pinnedEfforts: ["medium"] }),
	]);

	assert.deepEqual(result.map(({ model, effort }) => `${model}:${effort}`), [
		"gpt-5.6-luna:max",
		"gpt-5.6-luna:low",
		"claude-fable-5:medium",
	]);
});

test("omits unsupported efforts and unrelated variants", () => {
	const result = suggestStacks([
		candidate("openai-codex", "gpt-5.6-luna", { supportedEfforts: ["medium", "high"] }),
		candidate("openrouter", "anthropic/claude-opus-5-fast"),
		candidate("openrouter", "anthropic/claude-fable-5:batch"),
		candidate("example", "new-model"),
	]);

	assert.deepEqual(result, [
		{ provider: "openai-codex", model: "gpt-5.6-luna", effort: "medium" },
		{ provider: "openai-codex", model: "gpt-5.6-luna", effort: "high" },
	]);
});
