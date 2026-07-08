---
name: obsidian-cli
description: Query and audit Obsidian vaults via the built-in `obsidian` CLI — backlinks, unresolved/orphan pages, link-aware search, frontmatter property reads, tag census, outline. Use whenever the user asks for link-graph operations on an Obsidian vault (lint, find-backlinks, broken-links, orphans, dead-ends, "what links to X", "what does Y reference"), wants frontmatter or tag aggregates across a vault, or mentions an Obsidian vault by name. Prefer this skill over hand-rolled rg whenever the question is about the resolved link graph — rg sees text, the CLI sees the actual graph as Obsidian indexes it (works regardless of whether the vault uses `[[wikilinks]]` or `[markdown](links.md)`).
---

# obsidian-cli

Thin layer over Obsidian's built-in CLI. The CLI sees what Obsidian's link index sees — resolved links across both wikilink and markdown-link syntax, aliases, transclusions, frontmatter — which is what most lint/query questions actually want. Plain text grep can't see those edges, especially in vaults that mix link styles.

## When to use this vs rg

Use the CLI when the question is about the **link graph or vault structure**:
- backlinks / outgoing links / orphans / dead-ends / unresolved
- frontmatter property reads across the whole vault
- tag / alias enumeration
- vault-aware search where link resolution matters

Use `rg` when the question is about **literal text** in the markdown body — quoting a phrase, finding a function name, scanning prose. The CLI's `search:context` is also fine here, but rg is faster and gives you adjacent-line context the CLI doesn't expose.

## Prerequisite: Obsidian must be running

Each invocation starts in one of two modes:

- **Warm** (Obsidian app running) → IPC into the running instance, ~200ms per call. Normal mode.
- **Cold** (app not running) → cold-boots Electron, ~2s per call. Painful for batches.

If you're about to do more than one or two calls, verify Obsidian is running first. Don't sleep-loop trying to detect it — just check `pgrep -f "Obsidian.app"` once. If nothing comes back, ask the user to open Obsidian rather than paying the cold-boot tax repeatedly.

## Choosing a vault

Always pass `vault=<name>` explicitly. Don't rely on the active vault — it depends on which window the user has focused.

To discover registered vaults:

```bash
obsidian vaults verbose 2>/dev/null
```

The output is `<name><TAB><path>`. Pick the one whose path matches the user's working directory or the resource they're asking about. If multiple vaults could plausibly match (e.g., a vault and a sub-vault of the same tree), ask the user which they mean rather than guessing — hitting the wrong vault produces silent wrong answers, not errors.

If the cwd doesn't match any registered vault, the user probably means a different vault than what's currently registered. Ask before proceeding.

## Output hygiene

Every call prints a "installer out of date" line plus a load-package line to stderr (older installers; some Obsidian versions are quieter). Always redirect: `obsidian … 2>/dev/null`. Don't try to suppress it any other way.

Default format is text/tsv. Pass `format=json` when you need to consume the result programmatically. Available formats vary per command — check `obsidian help <command> 2>/dev/null` if unsure.

## High-value commands

Replace `<vault>` with the target vault name in every example.

### Link-graph audits

```bash
# Internal links (any syntax) pointing at non-existent targets
obsidian unresolved vault=<vault> format=tsv 2>/dev/null

# Pages with no incoming links
obsidian orphans vault=<vault> 2>/dev/null

# Pages with no outgoing links (suspicious for hub/aggregator pages)
obsidian deadends vault=<vault> 2>/dev/null
```

Add `total` to any of these to get just a count. `counts` adds an occurrence column where supported.

### Backlinks / forward links

```bash
# Who links to this page?
obsidian backlinks file=<page-name> vault=<vault> counts format=tsv 2>/dev/null

# What does this page reference?
obsidian links path=<rel/path.md> vault=<vault> 2>/dev/null
```

`file=<name>` resolves like a wikilink (works across folders, aliases). `path=<full-path>` is exact. Prefer `path=` when you have it — fewer ambiguity surprises, especially when names are reused across folders.

### Search

```bash
# Vault search with file list
obsidian search query="…" vault=<vault> format=json 2>/dev/null

# Search with the matching line included
obsidian search:context query="…" vault=<vault> format=json limit=20 2>/dev/null
```

Note: `search:context` returns the matching line but **not** lines above/below. If the user wants surrounding context (e.g., `rg -C 2` style), fall back to rg or a small file-scan — the CLI doesn't expose adjacent lines.

### Frontmatter properties

```bash
# What property names exist across the vault, and how often?
obsidian properties vault=<vault> format=json counts 2>/dev/null

# Read one property's value from one file
obsidian property:read name=<prop> path=<rel/path.md> vault=<vault> 2>/dev/null

# Set a property
obsidian property:set name=<prop> value=<val> path=<rel/path.md> vault=<vault> 2>/dev/null
```

There's no built-in "list all files where property X = Y". For that, list files first (`obsidian files folder=<f> vault=<vault> ext=md 2>/dev/null`), then `property:read` per file. That's N+1 calls — fine for tens of files (~5–10s warm), bad at thousands. For large vaults, falling back to `rg` over frontmatter blocks is faster.

### Tags, outline, files

```bash
# All tags with counts
obsidian tags vault=<vault> counts format=tsv 2>/dev/null

# Heading map of one page (useful before writing into it)
obsidian outline path=<rel/path.md> vault=<vault> format=md 2>/dev/null

# Enumerate files in a folder
obsidian files folder=<rel/folder> vault=<vault> ext=md 2>/dev/null
```

## Patterns and pitfalls

- **Index can be stale.** Obsidian's link index lags the filesystem. A file deleted on disk can still appear in `orphans`/`unresolved`/`backlinks` until the index refreshes. If a result looks wrong against what you can see in the filesystem, run `obsidian reload vault=<vault> 2>/dev/null` to force a re-index, or fall back to `rg` for that question. Treat link-graph commands as "what Obsidian's index thinks", not ground truth.
- **Vault scope ≠ filesystem scope.** Markdown links pointing at paths outside the vault root will show as `unresolved` even when the target file exists on disk. That's expected behavior — Obsidian only indexes what's inside the vault. If the user wants a "true broken-link" check that respects cross-vault paths, filter the output or use a filesystem-aware rg pass.
- **Don't loop over many files.** ~200ms × N adds up. If you find yourself about to spawn 100 calls, step back: is there a vault-level command (e.g., `unresolved`, `orphans`, `properties counts`) that gives you the aggregate in one call?
- **`vault=` is honored inconsistently on a few commands.** Most listing commands honor it. A few (notably `vault` itself) appear to default to the active vault regardless. Sanity-check with `obsidian vault info=path vault=<vault> 2>/dev/null` if a result looks wrong.
- **Conversely, rg catches typos in raw text** the index doesn't care about. For prose-quality questions or quick literal searches, stay in rg.

## Quick reference

Replace `<vault>` with the target vault name.

| Want… | Command |
|---|---|
| List registered vaults | `obsidian vaults verbose 2>/dev/null` |
| Broken internal links | `obsidian unresolved vault=<vault> format=tsv 2>/dev/null` |
| Pages with no incoming links | `obsidian orphans vault=<vault> 2>/dev/null` |
| Pages with no outgoing links | `obsidian deadends vault=<vault> 2>/dev/null` |
| What links to X | `obsidian backlinks file=X vault=<vault> counts format=tsv 2>/dev/null` |
| What X links to | `obsidian links path=<rel-path> vault=<vault> 2>/dev/null` |
| Link-aware text search | `obsidian search:context query="…" vault=<vault> format=json 2>/dev/null` |
| All tags with counts | `obsidian tags vault=<vault> counts format=tsv 2>/dev/null` |
| All frontmatter properties | `obsidian properties vault=<vault> format=json counts 2>/dev/null` |
| Read one property | `obsidian property:read name=<n> path=<p> vault=<vault> 2>/dev/null` |
| Set a property | `obsidian property:set name=<n> value=<v> path=<p> vault=<vault> 2>/dev/null` |
| Page outline | `obsidian outline path=<p> vault=<vault> format=md 2>/dev/null` |
| Files in a folder | `obsidian files folder=<f> vault=<vault> ext=md 2>/dev/null` |
| Force re-index | `obsidian reload vault=<vault> 2>/dev/null` |
| Full command list | `obsidian help 2>/dev/null` |

The full command surface is large (~80 commands). For anything not above, `obsidian help <command> 2>/dev/null` shows that command's flags.
