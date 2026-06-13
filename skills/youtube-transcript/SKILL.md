---
name: youtube-transcript
---

# YouTube Transcript


## Setup

```bash
cd {baseDir}
npm install
```

## Usage

```bash
{baseDir}/transcript.js <video-id-or-url> [--timestamps]
```

Accepts video ID or full URL:
- `EBw7gsDPAYQ`
- `https://www.youtube.com/watch?v=EBw7gsDPAYQ`
- `https://youtu.be/EBw7gsDPAYQ`

## Output

Plain text by default (no timestamps) — more token-efficient for LLM analysis:

```
All right. So, I got this UniFi Theta
I took the camera out, painted it
And here's the final result
```

Add `--timestamps` to include `[0:00]` prefixes:

```
[0:00] All right. So, I got this UniFi Theta
[0:15] I took the camera out, painted it
[1:23] And here's the final result
```

## On failure

- **2 attempts max** per video. If the transcript fails twice, record it as failed and move on.
- **Never work around a failure** — do not try yt-dlp, audio downloads, whisper, or any alternative transcription method.
- **Never install new tools or packages** to get a transcript.
- Common failure reasons: no captions available, geo-blocked, language detection error, IP rate limit. All are recorded as failures, not problems to solve.

## Notes

- Requires the video to have captions/transcripts available
- Works with auto-generated and manual transcripts
- Default (no timestamps) saves ~15% tokens on long transcripts
