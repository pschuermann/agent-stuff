---
name: sentry
description: "Fetch and analyze Sentry issues and search logs directly from the API. Helps agents understand errors, stack traces, logs, and issue context."
---

# Sentry Skill

Access Sentry data directly via the API. Uses auth token from `~/.sentryclirc`.

## Fetch Issue

```bash
./scripts/fetch-issue.js <issue-id-or-url>
```

Accepts either:
- Issue ID: `5765604106`
- Issue URL: `https://sentry.io/organizations/sentry/issues/5765604106/`
- New URL format: `https://myorg.sentry.io/issues/5765604106/`
- Short ID: `JAVASCRIPT-ABC` (requires `--org` flag)

Examples:
```bash
./scripts/fetch-issue.js 5765604106
./scripts/fetch-issue.js https://sentry.io/organizations/sentry/issues/5765604106/
./scripts/fetch-issue.js https://myorg.sentry.io/issues/5765604106/
./scripts/fetch-issue.js JAVASCRIPT-ABC --org sentry
```

## Fetch Latest Event

```bash
./scripts/fetch-issue.js <issue-id-or-url> --latest
```

Fetches the latest event for the issue, including full stack trace.

## Output

Returns formatted issue details including:
- Title and culprit
- First/last seen timestamps
- Event count and user impact
- Tags and environment info

With `--latest`, also shows:
- Stack trace with file locations and function names
- Source context (when available)
- Request details (method, URL, headers, body)
- Recent breadcrumbs with timestamps
- Runtime context (Node version, OS, browser, device)

## Search Logs

```bash
./scripts/search-logs.js [query|url] [options]
```

Search for logs in Sentry's Logs Explorer.

Accepts either:
- Search query with `--org` flag
- Sentry logs explorer URL (extracts org, project, period automatically)

### Options

- `--org, -o <org>` - Organization slug (required unless URL provided)
- `--project, -p <project>` - Filter by project slug or ID
- `--period, -t <period>` - Time period (default: 24h, e.g., 1h, 7d, 90d)
- `--limit, -n <n>` - Max results (default: 100, max: 1000)
- `--json` - Output raw JSON

### Search Query Syntax

```
level:error              Filter by log level (trace, debug, info, warn, error, fatal)
message:*timeout*        Search message text with wildcards
trace:abc123             Filter by trace ID
project:my-project       Filter by project slug
```

Combine filters: `level:error message:*failed*`

### Examples

```bash
# List recent logs for an org
./scripts/search-logs.js --org myorg

# Search for errors in a specific project
./scripts/search-logs.js "level:error" --org myorg --project backend

# Search for timeout messages in the last 7 days
./scripts/search-logs.js "message:*timeout*" --org myorg --period 7d

# Get logs as JSON
./scripts/search-logs.js --org myorg --limit 50 --json

# Use a Sentry logs explorer URL directly
./scripts/search-logs.js "https://myorg.sentry.io/explore/logs/?project=123&statsPeriod=7d"
```

### Output

Returns log entries with:
- Timestamp
- Severity level (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)
- Message content
- Trace ID (when available)
