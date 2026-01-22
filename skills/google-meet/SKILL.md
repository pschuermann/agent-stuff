---
name: google-meet
description: Create Google Meet spaces with auto recording/transcription enabled. Uses OAuth and caches tokens per account, prompting to choose the account when multiple are available. Use when you need a new Meet link.
---

# Google Meet Skill

Create Google Meet spaces with auto recording and transcription enabled by default.

## Setup

Install dependencies once:

```bash
cd /Users/mitsuhiko/Development/agent-stuff/skills/google-meet
npm install
```

Provide a Google OAuth client file (Desktop app or Web app JSON) at one of:

- `~/.config/pi-google-meet/oauth-client.json` (default)
- `$GOOGLE_MEET_OAUTH_FILE` (override path)

Create a Desktop OAuth client in Google Cloud Console and download the JSON file to that path.

If you don't want to manage a client JSON, the script will fall back to `gcloud auth login` and use `gcloud auth print-access-token`.

Tokens are cached at:

- `~/.config/pi-google-meet/tokens.json` (default)
- `$GOOGLE_MEET_TOKEN_STORE` (override path)

The first time you run the script, it opens the system browser for OAuth (or gcloud login) and stores the refresh token for future use.

## Usage

```bash
./make-meet.js
```

Flags:

```bash
./make-meet.js --no-record
./make-meet.js --no-transcribe
./make-meet.js --access-type TRUSTED
./make-meet.js --account user@example.com
```

## Account Selection

- If multiple accounts are stored, the script prompts you to pick one.
- If the current repo remote URL matches `github.com/earendil-works`, the default account is the first `@earendil.com` entry.
- Otherwise, it defaults to the most recently used account.

## Notes

Auto recording/transcription starts when an eligible host joins and is subject to Workspace policy.
