import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import crypto from "node:crypto";

const TODO_DIR_NAME = ".pi/todos";
const LOCK_TTL_MS = 30 * 60 * 1000;

interface TodoFrontMatter {
	id: string;
	title: string;
	tags: string[];
	status: string;
	created_at: string;
}

interface TodoRecord extends TodoFrontMatter {
	body: string;
}

interface LockInfo {
	id: string;
	pid: number;
	session?: string | null;
	created_at: string;
}

const TodoParams = Type.Object({
	action: StringEnum(["list", "get", "create", "update", "append"] as const),
	id: Type.Optional(Type.String({ description: "Todo id (filename)" })),
	title: Type.Optional(Type.String({ description: "Todo title" })),
	status: Type.Optional(Type.String({ description: "Todo status" })),
	tags: Type.Optional(Type.Array(Type.String({ description: "Todo tag" }))),
	body: Type.Optional(Type.String({ description: "Todo body or append text" })),
});

type TodoAction = "list" | "get" | "create" | "update" | "append";

function getTodosDir(cwd: string): string {
	return path.resolve(cwd, TODO_DIR_NAME);
}

function getTodoPath(todosDir: string, id: string): string {
	return path.join(todosDir, `${id}.md`);
}

function getLockPath(todosDir: string, id: string): string {
	return path.join(todosDir, `${id}.lock`);
}

function stripQuotes(value: string): string {
	const trimmed = value.trim();
	if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

function parseTagsInline(value: string): string[] {
	const inner = value.trim().slice(1, -1);
	if (!inner.trim()) return [];
	return inner
		.split(",")
		.map((item) => stripQuotes(item))
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseFrontMatter(text: string, idFallback: string): TodoFrontMatter {
	const data: TodoFrontMatter = {
		id: idFallback,
		title: "",
		tags: [],
		status: "open",
		created_at: "",
	};

	let currentKey: string | null = null;
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;

		const listMatch = currentKey === "tags" ? line.match(/^-\s*(.+)$/) : null;
		if (listMatch) {
			data.tags.push(stripQuotes(listMatch[1]));
			continue;
		}

		const match = line.match(/^(?<key>[a-zA-Z0-9_]+):\s*(?<value>.*)$/);
		if (!match?.groups) continue;

		const key = match.groups.key;
		const value = match.groups.value ?? "";
		currentKey = null;

		if (key === "tags") {
			if (!value) {
				currentKey = "tags";
				continue;
			}
			if (value.startsWith("[") && value.endsWith("]")) {
				data.tags = parseTagsInline(value);
				continue;
			}
			data.tags = [stripQuotes(value)].filter(Boolean);
			continue;
		}

		switch (key) {
			case "id":
				data.id = stripQuotes(value) || data.id;
				break;
			case "title":
				data.title = stripQuotes(value);
				break;
			case "status":
				data.status = stripQuotes(value) || data.status;
				break;
			case "created_at":
				data.created_at = stripQuotes(value);
				break;
			default:
				break;
		}
	}

	return data;
}

function splitFrontMatter(content: string): { frontMatter: string; body: string } {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!match) {
		return { frontMatter: "", body: content };
	}
	const frontMatter = match[1] ?? "";
	const body = content.slice(match[0].length);
	return { frontMatter, body };
}

function parseTodoContent(content: string, idFallback: string): TodoRecord {
	const { frontMatter, body } = splitFrontMatter(content);
	const parsed = parseFrontMatter(frontMatter, idFallback);
	return {
		id: idFallback,
		title: parsed.title,
		tags: parsed.tags ?? [],
		status: parsed.status,
		created_at: parsed.created_at,
		body: body ?? "",
	};
}

function escapeYaml(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
}

function serializeTodo(todo: TodoRecord): string {
	const tags = todo.tags ?? [];
	const lines = [
		"---",
		`id: \"${escapeYaml(todo.id)}\"`,
		`title: \"${escapeYaml(todo.title)}\"`,
		"tags:",
		...tags.map((tag) => `  - \"${escapeYaml(tag)}\"`),
		`status: \"${escapeYaml(todo.status)}\"`,
		`created_at: \"${escapeYaml(todo.created_at)}\"`,
		"---",
		"",
	];

	const body = todo.body ?? "";
	const trimmedBody = body.replace(/^\n+/, "").replace(/\s+$/, "");
	return `${lines.join("\n")}${trimmedBody ? `${trimmedBody}\n` : ""}`;
}

async function ensureTodosDir(todosDir: string) {
	await fs.mkdir(todosDir, { recursive: true });
}

async function readTodoFile(filePath: string, idFallback: string): Promise<TodoRecord> {
	const content = await fs.readFile(filePath, "utf8");
	return parseTodoContent(content, idFallback);
}

async function writeTodoFile(filePath: string, todo: TodoRecord) {
	await fs.writeFile(filePath, serializeTodo(todo), "utf8");
}

async function generateTodoId(todosDir: string): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const id = crypto.randomBytes(4).toString("hex");
		const todoPath = getTodoPath(todosDir, id);
		if (!existsSync(todoPath)) return id;
	}
	throw new Error("Failed to generate unique todo id");
}

async function readLockInfo(lockPath: string): Promise<LockInfo | null> {
	try {
		const raw = await fs.readFile(lockPath, "utf8");
		return JSON.parse(raw) as LockInfo;
	} catch {
		return null;
	}
}

async function acquireLock(
	todosDir: string,
	id: string,
	ctx: ExtensionContext,
): Promise<(() => Promise<void>) | { error: string }> {
	const lockPath = getLockPath(todosDir, id);
	const now = Date.now();
	const session = ctx.sessionManager.getSessionFile();

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const handle = await fs.open(lockPath, "wx");
			const info: LockInfo = {
				id,
				pid: process.pid,
				session,
				created_at: new Date(now).toISOString(),
			};
			await handle.writeFile(JSON.stringify(info, null, 2), "utf8");
			await handle.close();
			return async () => {
				try {
					await fs.unlink(lockPath);
				} catch {
					// ignore
				}
			};
		} catch (error: any) {
			if (error?.code !== "EEXIST") {
				return { error: `Failed to acquire lock: ${error?.message ?? "unknown error"}` };
			}
			const stats = await fs.stat(lockPath).catch(() => null);
			const lockAge = stats ? now - stats.mtimeMs : LOCK_TTL_MS + 1;
			if (lockAge <= LOCK_TTL_MS) {
				const info = await readLockInfo(lockPath);
				const owner = info?.session ? ` (session ${info.session})` : "";
				return { error: `Todo ${id} is locked${owner}. Try again later.` };
			}
			if (!ctx.hasUI) {
				return { error: `Todo ${id} lock is stale; rerun in interactive mode to steal it.` };
			}
			const ok = await ctx.ui.confirm("Todo locked", `Todo ${id} appears locked. Steal the lock?`);
			if (!ok) {
				return { error: `Todo ${id} remains locked.` };
			}
			await fs.unlink(lockPath).catch(() => undefined);
		}
	}

	return { error: `Failed to acquire lock for todo ${id}.` };
}

async function withTodoLock<T>(
	todosDir: string,
	id: string,
	ctx: ExtensionContext,
	fn: () => Promise<T>,
): Promise<T | { error: string }> {
	const lock = await acquireLock(todosDir, id, ctx);
	if (typeof lock === "object" && "error" in lock) return lock;
	try {
		return await fn();
	} finally {
		await lock();
	}
}

async function listTodos(todosDir: string): Promise<TodoFrontMatter[]> {
	let entries: string[] = [];
	try {
		entries = await fs.readdir(todosDir);
	} catch {
		return [];
	}

	const todos: TodoFrontMatter[] = [];
	for (const entry of entries) {
		if (!entry.endsWith(".md")) continue;
		const id = entry.slice(0, -3);
		const filePath = path.join(todosDir, entry);
		try {
			const content = await fs.readFile(filePath, "utf8");
			const { frontMatter } = splitFrontMatter(content);
			const parsed = parseFrontMatter(frontMatter, id);
			todos.push({
				id,
				title: parsed.title,
				tags: parsed.tags ?? [],
				status: parsed.status,
				created_at: parsed.created_at,
			});
		} catch {
			// ignore unreadable todo
		}
	}

	todos.sort((a, b) => a.created_at.localeCompare(b.created_at));
	return todos;
}

function formatTodoList(todos: TodoFrontMatter[]): string {
	if (!todos.length) return "No todos.";
	return todos
		.map((todo) => {
			const tagText = todo.tags.length ? ` [${todo.tags.join(", ")}]` : "";
			return `#${todo.id} (${todo.status}) ${todo.title}${tagText}`;
		})
		.join("\n");
}

async function ensureTodoExists(filePath: string, id: string): Promise<TodoRecord | null> {
	if (!existsSync(filePath)) return null;
	return readTodoFile(filePath, id);
}

async function appendTodoBody(filePath: string, todo: TodoRecord, text: string): Promise<TodoRecord> {
	const spacer = todo.body.trim().length ? "\n\n" : "";
	todo.body = `${todo.body.replace(/\s+$/, "")}${spacer}${text.trim()}\n`;
	await writeTodoFile(filePath, todo);
	return todo;
}

export default function todosExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "todo",
		label: "Todo",
		description: "Manage file-based todos in .pi/todos (list, get, create, update, append)",
		parameters: TodoParams,

		async execute(_toolCallId, params, _onUpdate, ctx) {
			const todosDir = getTodosDir(ctx.cwd);
			const action: TodoAction = params.action;

			switch (action) {
				case "list": {
					const todos = await listTodos(todosDir);
					return {
						content: [{ type: "text", text: formatTodoList(todos) }],
						details: { todos },
					};
				}

				case "get": {
					if (!params.id) {
						return {
							content: [{ type: "text", text: "Error: id required" }],
							details: { error: "id required" },
						};
					}
					const filePath = getTodoPath(todosDir, params.id);
					const todo = await ensureTodoExists(filePath, params.id);
					if (!todo) {
						return {
							content: [{ type: "text", text: `Todo ${params.id} not found` }],
							details: { error: "not found" },
						};
					}
					return {
						content: [{ type: "text", text: serializeTodo(todo) }],
						details: { todo },
					};
				}

				case "create": {
					if (!params.title) {
						return {
							content: [{ type: "text", text: "Error: title required" }],
							details: { error: "title required" },
						};
					}
					await ensureTodosDir(todosDir);
					const id = await generateTodoId(todosDir);
					const filePath = getTodoPath(todosDir, id);
					const todo: TodoRecord = {
						id,
						title: params.title,
						tags: params.tags ?? [],
						status: params.status ?? "open",
						created_at: new Date().toISOString(),
						body: params.body ?? "",
					};

					const result = await withTodoLock(todosDir, id, ctx, async () => {
						await writeTodoFile(filePath, todo);
						return todo;
					});

					if (typeof result === "object" && "error" in result) {
						return {
							content: [{ type: "text", text: result.error }],
							details: { error: result.error },
						};
					}

					return {
						content: [{ type: "text", text: `Created todo ${id}` }],
						details: { todo },
					};
				}

				case "update": {
					if (!params.id) {
						return {
							content: [{ type: "text", text: "Error: id required" }],
							details: { error: "id required" },
						};
					}
					const filePath = getTodoPath(todosDir, params.id);
					if (!existsSync(filePath)) {
						return {
							content: [{ type: "text", text: `Todo ${params.id} not found` }],
							details: { error: "not found" },
						};
					}
					const result = await withTodoLock(todosDir, params.id, ctx, async () => {
						const existing = await ensureTodoExists(filePath, params.id);
						if (!existing) return { error: `Todo ${params.id} not found` } as const;

						existing.id = params.id;
						if (params.title !== undefined) existing.title = params.title;
						if (params.status !== undefined) existing.status = params.status;
						if (params.tags !== undefined) existing.tags = params.tags;
						if (!existing.created_at) existing.created_at = new Date().toISOString();

						await writeTodoFile(filePath, existing);
						return existing;
					});

					if (typeof result === "object" && "error" in result) {
						return {
							content: [{ type: "text", text: result.error }],
							details: { error: result.error },
						};
					}

					return {
						content: [{ type: "text", text: `Updated todo ${params.id}` }],
						details: { todo: result },
					};
				}

				case "append": {
					if (!params.id) {
						return {
							content: [{ type: "text", text: "Error: id required" }],
							details: { error: "id required" },
						};
					}
					if (!params.body) {
						return {
							content: [{ type: "text", text: "Error: body required" }],
							details: { error: "body required" },
						};
					}
					const filePath = getTodoPath(todosDir, params.id);
					if (!existsSync(filePath)) {
						return {
							content: [{ type: "text", text: `Todo ${params.id} not found` }],
							details: { error: "not found" },
						};
					}
					const result = await withTodoLock(todosDir, params.id, ctx, async () => {
						const existing = await ensureTodoExists(filePath, params.id);
						if (!existing) return { error: `Todo ${params.id} not found` } as const;
						const updated = await appendTodoBody(filePath, existing, params.body!);
						return updated;
					});

					if (typeof result === "object" && "error" in result) {
						return {
							content: [{ type: "text", text: result.error }],
							details: { error: result.error },
						};
					}

					return {
						content: [{ type: "text", text: `Appended to todo ${params.id}` }],
						details: { todo: result },
					};
				}
			}
		},
	});

	pi.registerCommand("todos", {
		description: "List todos from .pi/todos",
		handler: async (_args, ctx) => {
			const todosDir = getTodosDir(ctx.cwd);
			const todos = await listTodos(todosDir);
			const text = formatTodoList(todos);
			if (ctx.hasUI) {
				ctx.ui.notify(text, "info");
			} else {
				console.log(text);
			}
		},
	});

	pi.registerCommand("todo-log", {
		description: "Append text to a todo body",
		handler: async (args, ctx) => {
			const id = (args ?? "").trim();
			if (!id) {
				ctx.ui.notify("Usage: /todo-log <id>", "error");
				return;
			}
			if (!ctx.hasUI) {
				ctx.ui.notify("/todo-log requires interactive mode", "error");
				return;
			}

			const todosDir = getTodosDir(ctx.cwd);
			const filePath = getTodoPath(todosDir, id);
			if (!existsSync(filePath)) {
				ctx.ui.notify(`Todo ${id} not found`, "error");
				return;
			}

			const text = await ctx.ui.editor(`Append to todo ${id}:`, "");
			if (!text?.trim()) {
				ctx.ui.notify("No text provided", "warning");
				return;
			}

			const result = await withTodoLock(todosDir, id, ctx, async () => {
				const existing = await ensureTodoExists(filePath, id);
				if (!existing) return { error: `Todo ${id} not found` } as const;
				return appendTodoBody(filePath, existing, text);
			});

			if (typeof result === "object" && "error" in result) {
				ctx.ui.notify(result.error, "error");
				return;
			}

			ctx.ui.notify(`Appended to todo ${id}`, "info");
		},
	});
}
