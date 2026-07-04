---
name: vivatech-replay-miner
description: Methodically extract, catalog, and transcript VivaTech replay videos and session pages. Use this whenever the user mentions VivaTech, vivatech.com/replay, VivaTech sessions/program pages, finding interesting talks/speakers from VivaTech, Dailymotion replay embeds, or getting subtitles/transcripts from VivaTech videos. This skill is especially important because naive curl/browser attempts can trigger VivaTech GTAB blocks; prefer the documented authenticated-browser and Dailymotion-metadata workflow.
---

# VivaTech Replay Miner

Use this skill to discover VivaTech talks at scale, extract replay metadata, and fetch subtitles/transcripts safely.

## Core lessons from discovery

Read `references/discovery-notes.md` when you need details, but the short version is:

- VivaTech is a Next/inwink site and can block automation with GTAB. Avoid repeated unauthenticated `curl` or fresh-headless browser probing.
- A VPN plus the user's normal Chrome profile worked; direct `curl`, fresh Playwright, and FlareSolverr did not reliably work.
- The replay page embeds replay data in the rendered/SSR HTML once logged in. Save that HTML from an authenticated browser using `fetch('/replay', {credentials: 'include'})` inside the page context.
- Each replay item has a Dailymotion iframe URL like `https://geo.dailymotion.com/player.html?video=xah889i...`.
- Dailymotion metadata is public and exposes subtitles: `https://www.dailymotion.com/player/metadata/video/<video_id>` → `subtitles.data.*.urls[0]`.
- Prefer Dailymotion subtitle URLs over audio transcription: faster, timestamped, and already available for the VivaTech replays encountered.

## Standard workflow: get all replay transcripts

1. Start or connect to the user's normal Chrome profile. If using browser-tools:
   ```bash
   ~/.claude/skills/browser-tools/browser-start.js --profile
   ~/.claude/skills/browser-tools/browser-nav.js 'https://vivatech.com/replay'
   ```
2. If the replay page asks for email, use the email the user provides. Do not invent one. The page may unlock after email entry without a full password login.
3. Save the logged-in replay HTML via CDP/in-page fetch, not direct curl:
   ```bash
   node scripts/save_replay_html.js <output-dir>
   ```
4. Fetch transcripts:
   ```bash
   python3 scripts/fetch_transcripts.py <output-dir>
   ```
5. Report the output paths and counts. The expected outputs are:
   - `transcripts/*.srt` — raw Dailymotion subtitles
   - `transcripts/*.txt` — cleaned transcript text
   - `catalog.csv` / `catalog.json` — metadata and file paths
   - `transcript_index.jsonl` — one record per talk with full transcript text for later search/embedding/LLM sifting

## Discovery workflow: find promising talks before transcription

For program/session discovery:

- Use `/sessions` and filters for day/theme/stage; items lazy-load, so scroll to collect them.
- Session pages have useful public metadata: title, date/time, location, description, speakers, tags, and sometimes a `Watch Replay` button.
- If using browser DOM extraction, collect `a[href*="/sessions/session/"]` while scrolling.
- If direct page access is blocked but you only need public metadata, Jina Reader (`r.jina.ai`) can produce Markdown for public session pages. Ask/confirm before using it if the user is privacy-sensitive; never send credentials/cookies/private pages through it.

## What to avoid

- Avoid hammering `vivatech.com` with many direct `curl`/Python requests; GTAB may block the IP/session.
- Avoid fresh headless Playwright for first access; it triggered `403 Access Denied` in discovery.
- Do not rely on FlareSolverr for VivaTech GTAB; it returned the same access-denied page in discovery.
- Do not scrape video bytes unless needed. Dailymotion subtitle metadata is enough for transcripts.
- Do not leak login cookies, emails, or authenticated pages to third-party proxy/readability services.
- Do not assume all sessions have replay; use `replayUrl` from `/replay` as the source of truth.

## Output expectations

When done, give a compact status like:

```text
Saved VivaTech replay transcripts to <output-dir>
- <N> replay sessions found
- <N_ok> transcripts saved
- catalog: <output-dir>/catalog.csv
- transcript index: <output-dir>/transcript_index.jsonl
```

If some talks lack subtitles, keep them in the catalog with status `no_subtitles` or `error` rather than failing the whole run.
