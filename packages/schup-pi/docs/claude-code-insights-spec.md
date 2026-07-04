# Claude Code `/insights` Implementation Spec

Status: draft  
Source inspected: `yasasbanukaofficial/claude-code` at commit `a371abb`  
Primary source file: `src/commands/insights.ts`

This spec describes how Claude Code's `/insights` command is built in the inspected repository. It is written for an AI agent or engineer implementing a compatible version, not as end-user documentation.

## Purpose

`/insights` is a built-in slash command that analyzes Claude Code session logs, extracts structured facts about the user's sessions, aggregates usage patterns, asks an LLM to generate narrative insights, writes a self-contained HTML report, and returns a report URL.

It is not a web route. It is a CLI prompt command.

## Command Registration

Register `/insights` as a built-in prompt command:

```ts
{
  type: "prompt",
  name: "insights",
  description: "Generate a report analyzing your Claude Code sessions",
  contentLength: 0,
  progressMessage: "analyzing your sessions",
  source: "builtin"
}
```

The command should be registered in the built-in command list with the other slash commands.

Use a lazy-loading shim in the central command registry. The inspected implementation keeps `src/commands/insights.ts` out of the initial command bundle because the file is large and includes HTML rendering logic. The shim imports `./commands/insights.js` only when `/insights` is invoked, then delegates `getPromptForCommand(args, context)` to the real command.

## Storage Layout

Use the Claude config directory as the root.

```text
<claude_config_dir>/
  projects/
    <project_dir>/
      *.jsonl
  usage-data/
    report.html
    facets/
      <session_id>.json
    session-meta/
      <session_id>.json
```

The `projects/` directory already contains Claude Code session JSONL logs.

`usage-data/report.html` is the generated report.

`usage-data/facets/` stores cached LLM-extracted session facets.

`usage-data/session-meta/` stores cached local metadata extracted without an LLM.

Resolve these paths lazily at runtime. Do not call config-directory helpers at module initialization time if those helpers read environment variables or memoize state.

## Main Entry Point

Expose a report-generation function:

```ts
generateUsageReport(options?: {
  collectRemote?: boolean
}): Promise<{
  insights: InsightResults
  htmlPath: string
  data: AggregatedData
  remoteStats?: { hosts: RemoteHostInfo[]; totalCopied: number }
  facets: Map<string, SessionFacets>
}>
```

The command's `getPromptForCommand(args)` should:

1. Parse command flags.
2. Optionally collect remote homespace sessions.
3. Call `generateUsageReport()`.
4. Resolve the final report URL.
5. Return a prompt instructing Claude to print the final user-facing message exactly.

## Anthropic-Internal Homespace Collection

Only enable homespace collection when:

```ts
process.env.USER_TYPE === "ant"
```

When enabled:

- Parse the `--homespaces` flag.
- Discover running homespaces with `coder list -o json`.
- Filter to workspaces whose latest build status is `running`.
- Count remote sessions with:

```sh
ssh <homespace>.coder 'find /root/.claude/projects -name "*.jsonl" 2>/dev/null | wc -l'
```

- Copy remote projects with:

```sh
scp -rq <homespace>.coder:/root/.claude/projects/ <temp_dir>
```

- Merge copied project directories into the local `<claude_config_dir>/projects`.
- Track copied and skipped session counts.
- If homespaces are running but `--homespaces` was not supplied, include a final tip telling the user to run `/insights --homespaces`.

For non-`ant` users, all homespace helpers should be no-ops.

## Phase 1: Lite Session Scan

Scan the local Claude projects directory using filesystem metadata only.

Input:

```text
<claude_config_dir>/projects
```

Output:

```ts
type LiteSessionInfo = {
  sessionId: string
  path: string
  mtime: number
  size: number
}
```

Algorithm:

1. Read project directory entries.
2. Keep only directories.
3. For each project directory, get JSONL session files and their mtimes.
4. Append `{ sessionId, path, mtime, size }` for each session file.
5. Yield to the event loop every 10 project directories.
6. Sort sessions by `mtime` descending.
7. Store the total number of scanned sessions as `totalSessionsScanned`.

Do not parse JSONL in this phase.

## Phase 2: Session Metadata

Session metadata is a cheap local summary derived from logs without asking the LLM.

Use this type:

```ts
type SessionMeta = {
  session_id: string
  project_path: string
  start_time: string
  duration_minutes: number
  user_message_count: number
  assistant_message_count: number
  tool_counts: Record<string, number>
  languages: Record<string, number>
  git_commits: number
  git_pushes: number
  input_tokens: number
  output_tokens: number
  first_prompt: string
  summary?: string
  user_interruptions: number
  user_response_times: number[]
  tool_errors: number
  tool_error_categories: Record<string, number>
  uses_task_agent: boolean
  uses_mcp: boolean
  uses_web_search: boolean
  uses_web_fetch: boolean
  lines_added: number
  lines_removed: number
  files_modified: number
  message_hours: number[]
  user_message_timestamps: string[]
}
```

### Metadata Loading

For all scanned sessions:

1. Read cached metadata from `usage-data/session-meta/<session_id>.json` in batches of 50.
2. Use cached metadata when available.
3. Queue uncached sessions for full JSONL parsing.
4. Limit uncached full parses to 200 sessions.

For uncached sessions:

1. Load full logs in batches of 10.
2. Skip logs with invalid creation or modification dates.
3. Skip `/insights` meta-sessions.
4. Convert each remaining log to `SessionMeta`.
5. Save metadata to disk with file mode `0600`.

### Meta-Session Detection

Facet extraction and report-generation calls may be logged as sessions. Exclude these from analysis.

Inspect the first few user messages. Mark a log as a meta-session if text contains either:

```text
RESPOND WITH ONLY A VALID JSON OBJECT
record_facets
```

### Human Message Counting

Count only actual human text messages.

Do count:

- user message content that is a non-empty string
- user message content array containing a text block

Do not count:

- user messages that only contain tool results

### Tool And Token Stats

For assistant messages:

- Sum token usage from assistant message usage fields.
- For each `tool_use` block, increment `tool_counts[toolName]`.
- Detect task-agent use when tool name matches the current or legacy agent tool name.
- Detect MCP use when the tool name starts with `mcp__`.
- Detect web search when the tool name is `WebSearch`.
- Detect web fetch when the tool name is `WebFetch`.

For tool input:

- If `file_path` exists, infer language from file extension.
- Count files modified by `Edit` and `Write`.
- For `Edit`, diff `old_string` and `new_string` with line-level diffing and count added/removed lines.
- For `Write`, count every written line as added.
- If shell command text contains `git commit`, increment `git_commits`.
- If shell command text contains `git push`, increment `git_pushes`.

Language mapping should cover common source and config extensions, including:

```text
.ts, .tsx, .js, .jsx, .py, .rb, .go, .rs, .java,
.md, .json, .yaml, .yml, .sh, .css, .html
```

### Response Times

For each actual human user message:

1. Track the local hour from its timestamp.
2. Store the timestamp for multi-session overlap detection.
3. If a previous assistant timestamp exists, compute the gap from that assistant message to the user message.
4. Keep only gaps greater than 2 seconds and less than 1 hour.

These retained gaps become `user_response_times`.

### Interruptions

Count a user interruption when user text contains:

```text
[Request interrupted by user
```

### Tool Error Categorization

For user messages containing tool-result blocks:

1. If a tool result has `is_error: true`, increment `tool_errors`.
2. Categorize the error from lowercased result text:

```text
contains "exit code"                         -> Command Failed
contains "rejected" or "doesn't want"        -> User Rejected
contains "string to replace not found"       -> Edit Failed
contains "no changes"                        -> Edit Failed
contains "modified since read"               -> File Changed
contains "exceeds maximum"                   -> File Too Large
contains "too large"                         -> File Too Large
contains "file not found"                    -> File Not Found
contains "does not exist"                    -> File Not Found
otherwise                                    -> Other
```

## Deduplication

After metadata loading, deduplicate by `session_id`.

If multiple branches exist for the same session:

1. Keep the branch with the highest `user_message_count`.
2. If tied, keep the branch with greater `duration_minutes`.

Remove full logs for discarded branches from the facet-extraction candidate map.

Sort retained metadata by `start_time` descending.

## Substantive Session Filter

A session is substantive when:

```ts
meta.user_message_count >= 2 && meta.duration_minutes >= 1
```

Only substantive sessions are eligible for facet loading or extraction.

## Phase 3: Facet Extraction

Facets are structured qualitative facts extracted from session transcripts by the LLM.

Use this type:

```ts
type SessionFacets = {
  session_id: string
  underlying_goal: string
  goal_categories: Record<string, number>
  outcome: string
  user_satisfaction_counts: Record<string, number>
  claude_helpfulness: string
  session_type: string
  friction_counts: Record<string, number>
  friction_detail: string
  primary_success: string
  brief_summary: string
  user_instructions_to_claude?: string[]
}
```

Expected enum values:

```text
outcome:
  fully_achieved
  mostly_achieved
  partially_achieved
  not_achieved
  unclear_from_transcript

claude_helpfulness:
  unhelpful
  slightly_helpful
  moderately_helpful
  very_helpful
  essential

session_type:
  single_task
  multi_task
  iterative_refinement
  exploration
  quick_question

primary_success:
  none
  fast_accurate_search
  correct_code_edits
  good_explanations
  proactive_help
  multi_file_changes
  good_debugging
```

### Cached Facets

For every substantive session:

1. Try to load `usage-data/facets/<session_id>.json`.
2. Validate required fields.
3. If the cache is corrupted, delete it and treat facets as missing.
4. Use valid cached facets without another LLM call.

### New Facet Extraction

For sessions without cached facets:

- Extract only if the full log is already available from this run.
- Limit new extractions to 50 sessions.
- Run extraction with concurrency 50.
- Save valid facets to disk with file mode `0600`.
- Return `null` on model, parsing, or validation failure.

## Transcript Formatting For Facets

Build a compact transcript before extraction.

Header:

```text
Session: <first_8_chars_of_session_id>
Date: <start_time>
Project: <project_path>
Duration: <duration_minutes> min
```

Message formatting:

- User text is emitted as `[User]: <text>`, truncated to 500 chars.
- Assistant text is emitted as `[Assistant]: <text>`, truncated to 300 chars.
- Assistant tool use is emitted as `[Tool: <tool_name>]`.

These per-message truncation limits are volume controls, not privacy controls.
They reduce how much of each message is sent onward, but they do not detect,
mask, or remove secrets. A secret or sensitive value near the start of a user or
assistant text block can still be included in the facet-extraction transcript.

If the formatted transcript is 30,000 chars or shorter, send it directly to the facet prompt.

If longer:

1. Split into 25,000-char chunks.
2. Summarize chunks in parallel with the analysis model.
3. Each chunk summary should preserve:
   - what the user asked for
   - what Claude did
   - tools used
   - files modified
   - friction or issues
   - outcome
   - specific details such as file names, error messages, and user feedback
4. Combine summaries with a long-session header.

The long-transcript summarization step is also not redaction. It asks the model
to compress the transcript while preserving important details, so sensitive
content can be carried forward into the summarized transcript, extracted facets,
cached facet JSON, generated insight text, or final HTML report.

## Facet Extraction Prompt

The facet prompt should instruct the model to analyze a Claude Code session and return one valid JSON object.

Critical rules:

- `goal_categories` must count only what the user explicitly asked for.
- Do not count autonomous exploration Claude chose to do.
- `user_satisfaction_counts` must be based only on explicit user signals.
- `friction_counts` should be specific.
- Very short or warmup-only sessions should use `warmup_minimal`.

Call the model non-interactively:

```ts
queryWithModel({
  systemPrompt: asSystemPrompt([]),
  userPrompt: jsonPrompt,
  signal: new AbortController().signal,
  options: {
    model: getDefaultOpusModel(),
    querySource: "insights",
    agents: [],
    isNonInteractiveSession: true,
    hasAppendSystemPrompt: false,
    mcpTools: [],
    maxOutputTokensOverride: 4096
  }
})
```

Parsing:

1. Extract the first JSON-looking `{...}` block from model text.
2. Parse it.
3. Validate required fields.
4. Overwrite or add `session_id` using the known session ID.

## Minimal Session Filter

After facets are available, filter warmup/minimal sessions.

A session is minimal if:

- it has facets
- `goal_categories` has exactly one positive key
- that key is `warmup_minimal`

Exclude minimal sessions from final aggregation and final facets.

## Aggregation

Aggregate non-minimal session metadata and non-minimal facets into:

```ts
type AggregatedData = {
  total_sessions: number
  total_sessions_scanned?: number
  sessions_with_facets: number
  date_range: { start: string; end: string }
  total_messages: number
  total_duration_hours: number
  total_input_tokens: number
  total_output_tokens: number
  tool_counts: Record<string, number>
  languages: Record<string, number>
  git_commits: number
  git_pushes: number
  projects: Record<string, number>
  goal_categories: Record<string, number>
  outcomes: Record<string, number>
  satisfaction: Record<string, number>
  helpfulness: Record<string, number>
  session_types: Record<string, number>
  friction: Record<string, number>
  success: Record<string, number>
  session_summaries: Array<{
    id: string
    date: string
    summary: string
    goal?: string
  }>
  total_interruptions: number
  total_tool_errors: number
  tool_error_categories: Record<string, number>
  user_response_times: number[]
  median_response_time: number
  avg_response_time: number
  sessions_using_task_agent: number
  sessions_using_mcp: number
  sessions_using_web_search: number
  sessions_using_web_fetch: number
  total_lines_added: number
  total_lines_removed: number
  total_files_modified: number
  days_active: number
  messages_per_day: number
  message_hours: number[]
  multi_clauding: {
    overlap_events: number
    sessions_involved: number
    user_messages_during: number
  }
}
```

Aggregation rules:

- Date range comes from sorted session start dates.
- `total_messages` counts human user messages.
- `total_duration_hours` sums session durations.
- Tool, language, project, error, goal, satisfaction, and friction maps are summed by key.
- `session_summaries` keeps the first 50 sessions.
- Median response time is the middle value of sorted retained response times.
- Average response time is arithmetic mean.
- `days_active` is the count of unique session start dates.
- `messages_per_day` is total human messages divided by active days, rounded to one decimal.

## Multi-Clauding Detection

Detect concurrent use of multiple Claude sessions.

Algorithm:

1. Flatten all `user_message_timestamps` into:

```ts
{ ts: number; sessionId: string }
```

2. Sort by timestamp ascending.
3. Use a 30-minute sliding window.
4. Track the latest message index for each session in the current window.
5. Detect a pattern where the same session appears, then another session appears, then the first session appears again inside the window:

```text
session A -> session B -> session A
```

6. Count unique overlapping session pairs.
7. Count distinct sessions involved.
8. Count user messages that participated in overlap patterns.

Return:

```ts
{
  overlap_events: number
  sessions_involved: number
  user_messages_during: number
}
```

## Insight Generation

Use the default Opus model for narrative insight generation.

Each insight section is:

```ts
type InsightSection = {
  name: string
  prompt: string
  maxTokens: number
}
```

Run these sections in parallel:

```text
project_areas
interaction_style
what_works
friction_analysis
suggestions
on_the_horizon
fun_ending
```

For `USER_TYPE === "ant"`, also run:

```text
cc_team_improvements
model_behavior_improvements
```

Each section prompt must require:

```text
RESPOND WITH ONLY A VALID JSON OBJECT
```

Model options:

```ts
{
  model: getDefaultOpusModel(),
  querySource: "insights",
  agents: [],
  isNonInteractiveSession: true,
  hasAppendSystemPrompt: false,
  mcpTools: [],
  maxOutputTokensOverride: section.maxTokens
}
```

For each response:

1. Extract text content.
2. Extract the first JSON-looking object.
3. Parse it.
4. Store successful results by section name.
5. If parsing fails, omit that section.

## Insight Context

Build the shared context from:

- total sessions
- analyzed sessions
- date range
- total messages
- rounded total hours
- git commits
- top 8 tools
- top 8 goal categories
- outcomes
- satisfaction
- friction
- success
- languages
- up to 50 facet summaries
- up to 20 friction details
- up to 15 captured user instructions to Claude

The section prompts should produce:

### `project_areas`

JSON shape:

```json
{
  "areas": [
    {
      "name": "Area name",
      "session_count": 0,
      "description": "2-3 sentences"
    }
  ]
}
```

Include 4-5 areas. Skip internal Claude Code operations.

### `interaction_style`

JSON shape:

```json
{
  "narrative": "2-3 paragraphs in second person",
  "key_pattern": "One sentence"
}
```

Describe how the user interacts with Claude Code.

### `what_works`

JSON shape:

```json
{
  "intro": "1 sentence",
  "impressive_workflows": [
    {
      "title": "Short title",
      "description": "2-3 sentences"
    }
  ]
}
```

Include 3 impressive workflows.

### `friction_analysis`

JSON shape:

```json
{
  "intro": "1 sentence",
  "categories": [
    {
      "category": "Concrete category name",
      "description": "1-2 sentences",
      "examples": ["Specific example", "Another example"]
    }
  ]
}
```

Include 3 friction categories with 2 examples each.

### `suggestions`

JSON shape:

```json
{
  "claude_md_additions": [
    {
      "addition": "Specific CLAUDE.md line or block",
      "why": "Reason based on sessions",
      "prompt_scaffold": "Where/how to add it"
    }
  ],
  "features_to_try": [
    {
      "feature": "Feature name",
      "one_liner": "What it does",
      "why_for_you": "Why it helps this user",
      "example_code": "Command or config"
    }
  ],
  "usage_patterns": [
    {
      "title": "Short title",
      "suggestion": "Summary",
      "detail": "Explanation",
      "copyable_prompt": "Prompt to try"
    }
  ]
}
```

Prioritize repeated user instructions as candidates for `CLAUDE.md` additions.

Feature suggestions should choose from:

- MCP servers
- custom skills
- hooks
- headless mode
- task agents

### `on_the_horizon`

JSON shape:

```json
{
  "intro": "1 sentence",
  "opportunities": [
    {
      "title": "Short title",
      "whats_possible": "2-3 sentences",
      "how_to_try": "1-2 sentences",
      "copyable_prompt": "Prompt to try"
    }
  ]
}
```

Include 3 ambitious opportunities.

### `fun_ending`

JSON shape:

```json
{
  "headline": "Memorable qualitative moment",
  "detail": "Brief context"
}
```

Use an interesting, human, funny, or surprising moment from summaries.

## At A Glance Generation

Generate `at_a_glance` after all parallel sections complete.

Build a second-stage prompt using:

- full shared context
- generated project areas
- generated what-works workflows
- generated friction categories
- generated features to try
- generated usage patterns
- generated horizon opportunities

Ask for:

```json
{
  "whats_working": "",
  "whats_hindering": "",
  "quick_wins": "",
  "ambitious_workflows": ""
}
```

Rules:

- Keep each field to 2-3 not-too-long sentences.
- Do not focus on raw numeric stats.
- Use a coaching tone.
- Be honest about Claude-side and user-side friction.
- Mention compelling features or workflow changes.
- Refer to ambitious workflows that may become feasible as models improve.

Parse the result like the other insight sections and attach it to `insights.at_a_glance`.

## HTML Report

Generate one self-contained HTML document.

Render these sections when data exists:

- report header
- At a Glance
- What You Work On
- How You Use Claude Code
- Impressive Things You Did
- Where Things Go Wrong
- Suggested `CLAUDE.md` Additions
- Existing Claude Code Features to Try
- New Ways to Use Claude Code
- On the Horizon
- Anthropic-internal feedback sections
- Fun Ending
- charts and aggregate stats

HTML rules:

- Escape user/model-provided text before insertion.
- In selected narrative fields, support `**bold**` by converting it to `<strong>`.
- Include inline CSS.
- Include inline JavaScript for interactions such as copy buttons and collapsible sections.
- Include copy buttons for suggested prompts, feature commands, and `CLAUDE.md` snippets.
- Write the file to `usage-data/report.html`.
- Use file mode `0600`.

## Final Report URL

Default report URL:

```text
file://<htmlPath>
```

For `USER_TYPE === "ant"`:

1. Build a timestamped filename:

```text
<username>_insights_<YYYYMMDD_HHMMSS>.html
```

2. Try to upload with:

```sh
ff cp <htmlPath> s3://anthropic-serve/atamkin/cc-user-reports/<filename>
```

3. If upload succeeds, use:

```text
https://s3-frontend.infra.ant.dev/anthropic-serve/atamkin/cc-user-reports/<filename>
```

4. If upload fails, fall back to the local `file://` URL and include manual upload instructions.

## Final Command Prompt

The command does not directly print the final message. It returns a prompt for Claude.

That prompt should include:

- full insights JSON
- report URL
- HTML file path
- facets directory path
- the summary the user sees

Then instruct Claude to output exactly:

```text
Your shareable insights report is ready:
<reportUrl>

Want to dig into any section or try one of the suggestions?
```

Include upload hints or homespace collection notes in the URL block when applicable.

## Failure Behavior

Use best-effort behavior throughout.

- If projects directory cannot be read, return an empty scan.
- If cached metadata cannot be read, treat it as missing.
- If a session file cannot be parsed, skip it.
- If a facet cache is invalid, delete it and re-extract when possible.
- If an LLM call fails, return `null` for that facet or insight section.
- If an insight section fails, omit that section.
- If HTML upload fails, fall back to the local report.
- Never fail the whole report because one session, facet, section, or upload failed.

## Performance Constraints

The inspected implementation uses these limits:

```text
metadata cache read batch size: 50
max uncached sessions to parse fully: 200
full log load batch size: 10
max new facet extractions: 50
facet extraction concurrency: 50
short transcript threshold: 30,000 chars
long transcript chunk size: 25,000 chars
facet max output tokens: 4096
insight section max output tokens: 8192
facet summaries included in insight context: 50
friction details included in insight context: 20
user instructions included in insight context: 15
multi-clauding window: 30 minutes
```

## Security And Privacy Notes

- Treat session logs as private local data.
- Cache generated metadata and facets under the Claude config directory, not in the current project.
- Write cache and report files with mode `0600`.
- Escape all dynamic HTML content.
- The inspected `/insights` implementation does not appear to run a secret scanner or redact secrets before LLM analysis.
- Per-message truncation and long-session summarization are volume-control mechanisms, not secret-redaction mechanisms.
- Cached facets and generated reports may contain derived sensitive information if the model preserves it from the transcript.
- Do not upload reports except for the explicit Anthropic-internal path.
- The Anthropic-internal upload branch uploads the generated HTML report as-is.
- If upload fails, do not retry indefinitely.

## Source Pointers

In the inspected repository:

- Command shim: `src/commands.ts`
- Real command: `src/commands/insights.ts`
- Main function: `generateUsageReport`
- Session scan: `scanAllSessions`
- Local metadata extraction: `extractToolStats`, `logToSessionMeta`
- Facet extraction: `extractFacetsFromAPI`
- Aggregation: `aggregateData`
- Insight generation: `generateParallelInsights`, `generateSectionInsight`
- HTML rendering: `generateHtmlReport`
- Final command definition: `usageReport`
