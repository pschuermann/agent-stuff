---
name: youtube-insights
description: Extract insights from a YouTube video — including Italian and other foreign-language videos. Fetches the transcript, translates if needed, and returns a focused English summary. Use whenever the user shares a YouTube URL and wants to understand, summarise, or extract specific ideas — especially for foreign-language content where YouTube's auto-translation loses nuance. Also use when the user says "watch this video", "what does this video say about X", "summarise this for me", or pastes a YouTube link expecting analysis.
---

# YouTube Insights

Extract and translate insights from any YouTube video.

## Tools

**Transcript:** `/Users/pschuermann/.claude/skills/youtube-transcript/transcript.js <url>`
Returns raw captions in the source language. The output contains HTML entities like `&amp;#39;` — strip these when reading.

**Metadata:** `yt-dlp` is installed. Pull title/channel/date/id without downloading:
```bash
yt-dlp --skip-download --print "%(upload_date)s|%(channel)s|%(title)s|%(id)s|%(duration_string)s" <url>
```
`upload_date` comes back as `YYYYMMDD`. Use this for the saved file's header and filename.

## Routing / handoff


Use `youtube-transcript` directly only when the user explicitly wants raw captions/transcript text. For normal video understanding, this skill should own the transcript, metadata, reference resolution, saved insight, and chat summary.

## Workflow

1. **Fetch the transcript** using the transcript tool
2. **Identify the language** — if non-English, proceed to translate
3. **Translate and summarise** — do both in one pass (don't output raw translated text, go straight to structured insights)
4. **Correct ASR errors silently** — YouTube's speech recognition garbles proper nouns, model names, project names, and technical terms. When you spot something that looks wrong (inconsistent with context, phonetically plausible but semantically odd), resolve it from context and use the correct term directly in your output. Do NOT surface a list of corrections — the user wants a clean, accurate summary, not a transcription-quality report. The corrections should be invisible: the reader simply gets the right names and terms as if the transcript had been perfect.
5. **Drop filler silently** — livestreams and casual videos open and meander with dead air: mic/volume checks, "can you hear me", reacting to the chat UI, reading donation/sub notifications, housekeeping about stream timing. This is noise, not content. Cut it entirely — don't summarise it, don't mention that you skipped it, don't note "the stream opened with setup". The reader should never see a trace of it.
6. **Track and resolve references** — when the speaker points at something external (a blog post, a video, a paper, a GitHub repo, an interview they're reading, a person's talk), find the actual source so the user can go to the primary material. Use web search / `gh` / the URL to locate it, confirm it's the right one (title, author, date line up with what was said), and link it. See "Sourcing references" below. If you genuinely can't find it, say so briefly rather than linking a guess.
7. **Save the insight** to the library (see "Saving insights" below) and **answer in chat** — if the user asked a specific question, lead your chat reply with that; the saved file always contains the full structured insight regardless.

## Output format

Lead with the user's specific question if they gave one. Then:

**Core argument** (2-3 sentences — what is the speaker actually claiming?)

**Key points** (bullet list — the supporting arguments, examples, analogies)

**Practices & techniques** (what the speaker or the people they discuss actually *did* — concrete behaviours worth imitating). This is one of the most valuable parts of the output. The user watches people like this to learn how to work like them, so capture the methods, not just the conclusions. Examples: "he went and read the attackers' GitHub repos before judging their competence", "he rewrote the entire test suite from scratch before attempting security fixes", "he reads the original papers rather than relying on summaries", "he benchmarks both options at 8-bit quality before deciding". If someone in the video did something effective, name the action so the user can copy it.

**Notable details** (anything specific and interesting that a summary would normally drop — concrete numbers, personal anecdotes, unusual comparisons, and **named callouts**: when the speaker names a specific person, project, company, or coins/uses a signature phrase, keep the name. The named specifics are usually the most information-dense and spiciest part — don't anonymise "DHH" into "someone" or "vibe coding" into "the criticism".)

**Choice quotes** (always include 2-4). Pull the lines that capture the speaker's voice, conviction, or wit — the rhetorical color is part of the content, especially for opinion pieces and rants. Give the translated quote, and where a phrase is culturally loaded or vivid in the original (an idiom, a film reference, an insult), keep the original alongside it with a brief gloss. Example: *"questa armata brancaleone di idioti"* — "this Brancaleone's army of idiots" (ref. to the classic film about a ragtag, incompetent band).

Keep it tight. The goal is to give the user the clearest possible version of what the speaker said, not a transcript summary. Where you've had to interpret a garbled term, only call it out if you're genuinely uncertain and the ambiguity matters to the meaning — otherwise just use your best resolution silently.

## Reaction & reading videos — keep attribution clean

Some videos aren't a single speaker making their own case — the speaker is **reading or reacting to someone else's material** (an interview, a blog post, another person's talk) and interleaving their own commentary. The transcript then braids two or more voices together: the quoted source, and the speaker reacting to it. Salvatore does this constantly (e.g. reading a Linus Torvalds interview while interjecting his own takes).

The hazard is **attribution drift** — crediting the source's opinion to the speaker, or vice versa. Be disciplined:
- Keep "what the source said" and "what the speaker thinks about it" clearly separated in every section. Phrase it explicitly: *"Linus's line, which Salvatore endorses…"*, *"the interviewer claims X; Salvatore counters…"*, *"reading the post, he disagrees with…"*.
- Attribute each claim to the right person. If you're unsure who said something, don't silently assign it.
- The speaker's *reaction* is usually the reason the user cares — lead with their take, use the source as the thing they're reacting to. Don't flatten the video into a summary of the source and lose the speaker entirely.

## Saving insights

Every video gets saved as one markdown file so the user builds a durable, greppable library over time. Always do this — it's the point of the skill, not an optional extra.

**Library folder:** `~/Google Drive/My Drive/Video Insights/` (synced to Google Drive). The `~/Google Drive` path is a symlink — write through it normally.

**Filename:** `YYYY-MM-DD — Channel — English Title.md`, where the date is the video's `upload_date` (reformatted with dashes).

**Always use an English title** — the user does not speak Italian (or other source languages), so the library must be navigable in English. For an English-language video, that's just the original title. For a foreign-language video, **translate the title to a concise, natural English equivalent** (don't transliterate or leave it in the source language). Keep the original-language title in the metadata comment's `original_title` field (see below) so nothing is lost and the file stays searchable by its real name.

Sanitise the title/channel for the filesystem: replace `/` with `-`, drop characters that break paths, and truncate an overlong title to ~80 chars. Example (Italian video → English filename): `2026-06-04 — Salvatore Sanfilippo — In Praise of rsync.md`

**Before writing, check for an existing file with the same video ID** (the library may already hold it). If found, update it rather than creating a duplicate.

**File contents** — full structured insight with a metadata header. The metadata goes in an **HTML comment**, not a YAML `---` frontmatter block: Zed's markdown preview doesn't strip frontmatter, so a `---` block renders as an ugly setext heading. An HTML comment is invisible in preview but still fully greppable (e.g. `rg "video_id: <id>"` for the dedup check). The visible `# Title` + Watch line below carries the human-readable header.
```markdown
<!-- video-insight
title: <English title>
original_title: <video's title in its source language — omit this line if the video is already in English>
channel: <channel>
url: https://youtu.be/<id>
video_id: <id>
published: <YYYY-MM-DD>
watched: <YYYY-MM-DD>   # today, from `date +%F`
duration: <duration>
tags: [<3-6 topic tags, e.g. ai, inference, systems-programming>]
sources: [<urls — only if you resolved external references; omit this line otherwise>]
-->

# <English title>

**[Watch](https://youtu.be/<id>)** · <channel> · published <date> · <duration>

## Core argument
...

## Key points
...

## Practices & techniques
...

## Notable details
...

## Choice quotes
...

## Sources
<!-- omit this whole section if the video references nothing external -->
- [<title of the source>](<url>) — <what it is and how the speaker used it, e.g. "the Linus Torvalds Q&A he reads and reacts to throughout">
...
```
The sections mirror the chat output format above. Add `tags` thoughtfully — they're what makes the library searchable later. Include the `## Sources` section (and a `sources:` line in the metadata comment with the same URLs) **only** when you actually resolved external references — see "Sourcing references"; omit both entirely otherwise.

**Update the index:** prepend one line to `~/Google Drive/My Drive/Video Insights/INDEX.md`, directly below the `<!-- new entries go directly below this line -->` marker (newest on top):
```
- [<watched-date>] [<English Title>](<filename>) — <Channel> — <one-line hook capturing the single most useful takeaway>
```

After saving, tell the user where it landed (just the filename is fine).

## Sourcing references

When the speaker leans on external material, the user wants the primary source, not just a mention of it. Hunt it down and link it.

- **What counts:** a blog post or article they read from or quote; a video/talk/podcast they react to; a paper they cite; a GitHub repo or specific project; a tool, product, or person whose own page is the obvious next click.
- **How to find it:** web search on the distinctive title/author/phrase the speaker gives; `gh` for repos (e.g. `gh search repos`, or just resolve the `github.com/...` path); fetch the page to confirm. For a video the speaker is reading (like a YouTube interview), find that video — the title and participants the speaker names are your search terms.
- **Confirm before linking:** check the title, author, and date line up with what was said. A plausible-looking wrong link is worse than no link. If you can't confirm it, don't link a guess — note that the source couldn't be located.
- **Where it goes:** the `## Sources` section of the saved file, plus a `sources:` line in the metadata comment. Mention the most important one in chat if it's central to the video (e.g. "the interview he's reading is here: …"). Skip the section entirely for videos that reference nothing external.

## Italian-specific notes

Salvatore (a common use case) speaks fast, colloquial Italian mixed with technical English terms. His speech recognition transcripts tend to garble:
- AI model names (DeepSeek, Qwen, etc.)
- Project names (he has a project called DwarfStar — github.com/antirez/ds4 — ASR often renders it as "DARF Star" or "Dwarf Star"). Salvatore is antirez, the creator of Redis — knowing his background (systems programming, C, databases) helps resolve ambiguous references
- Demoscene terminology
- Token/inference benchmarks

Use context to resolve these. His videos are typically about AI, systems programming, and the Italian tech scene.
