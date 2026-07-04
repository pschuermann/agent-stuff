#!/usr/bin/env python3
"""Fetch VivaTech 2026 replay metadata and Dailymotion subtitles.

Prerequisite: save the logged-in replay page HTML to replay-browser.html. In this run
we created it via Chrome CDP because direct curl is blocked by VivaTech's GTAB.
"""
from __future__ import annotations

import csv
import html
import json
import re
import time
import urllib.request
from pathlib import Path
from typing import Any

import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path("vivatech-2026-replay").resolve()
HTML_PATH = ROOT / "replay-browser.html"
TRANSCRIPTS = ROOT / "transcripts"
CATALOG_JSON = ROOT / "catalog.json"
CATALOG_CSV = ROOT / "catalog.csv"
INDEX_JSONL = ROOT / "transcript_index.jsonl"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome Safari/537.36"


def fetch_text(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def slugify(s: str, max_len: int = 90) -> str:
    s = html.unescape(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return (s[:max_len].rstrip("-") or "untitled")


def dm_id(replay_url: str) -> str | None:
    m = re.search(r"[?&]video=([^&]+)", replay_url)
    return m.group(1) if m else None


def srt_to_text(srt: str) -> str:
    lines: list[str] = []
    prev = None
    for line in srt.replace("\ufeff", "").splitlines():
        line = line.strip()
        if not line or line.isdigit() or "-->" in line:
            continue
        line = re.sub(r"<[^>]+>", "", line)
        if line != prev:
            lines.append(line)
            prev = line
    # join caption fragments into readable paragraphs-ish text
    text = " ".join(lines)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def repair_text(value: Any) -> Any:
    """Repair UTF-8 text that became mojibake during unicode_escape decoding."""
    if isinstance(value, str):
        try:
            return value.encode("latin1").decode("utf-8")
        except UnicodeError:
            return value
    if isinstance(value, list):
        return [repair_text(v) for v in value]
    if isinstance(value, dict):
        return {k: repair_text(v) for k, v in value.items()}
    return value


def extract_sessions(page_html: str) -> list[dict[str, Any]]:
    # Replay page embeds a React/Next data stream containing JSON objects escaped
    # as \"...\" and \u0026. unicode_escape reliably exposes all embedded objects;
    # we repair UTF-8 mojibake on parsed string fields below.
    decoded = page_html.encode("utf-8").decode("unicode_escape")
    dec = json.JSONDecoder()
    sessions: dict[str, dict[str, Any]] = {}
    for m in re.finditer(r'\{"id":"', decoded):
        try:
            obj, _ = dec.raw_decode(decoded[m.start() :])
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and obj.get("id") and obj.get("replayUrl"):
            obj = repair_text(obj)
            sessions[obj["id"]] = obj
    return list(sessions.values())


def main() -> None:
    if not HTML_PATH.exists():
        raise SystemExit(f"Missing {HTML_PATH}. Save the logged-in replay HTML first.")
    TRANSCRIPTS.mkdir(parents=True, exist_ok=True)

    sessions = extract_sessions(HTML_PATH.read_text(errors="replace"))
    print(f"Found {len(sessions)} replay sessions")

    rows: list[dict[str, Any]] = []
    for idx, session in enumerate(sessions, 1):
        title = session.get("title") or "Untitled"
        vid = dm_id(session.get("replayUrl", ""))
        start = (session.get("time") or {}).get("startDate", "")
        prefix = start.replace(":", "").replace("T", "_")[:15] if start else f"{idx:03d}"
        base = f"{prefix}_{slugify(title)}_{vid or 'no-video'}"
        row = {
            "id": session.get("id"),
            "title": title,
            "description": session.get("description") or "",
            "location": session.get("location") or (session.get("time") or {}).get("room", {}).get("name", ""),
            "startDate": start,
            "endDate": (session.get("time") or {}).get("endDate", ""),
            "tags": "; ".join(str(x) for x in (session.get("tags") or []) if x),
            "tracks": "; ".join(str(x) for x in (session.get("tracks") or []) if x),
            "speakers": "; ".join(
                " ".join(filter(None, [sp.get("firstname"), sp.get("lastname")])).strip()
                + (f" ({sp.get('company')})" if sp.get("company") else "")
                for sp in (session.get("speakers") or [])
            ),
            "replayUrl": session.get("replayUrl"),
            "dailymotionId": vid or "",
            "dailymotionUrl": f"https://www.dailymotion.com/video/{vid}" if vid else "",
            "subtitleLanguage": "",
            "subtitleLabel": "",
            "srtPath": "",
            "txtPath": "",
            "transcriptChars": 0,
            "status": "pending",
            "error": "",
        }

        try:
            if not vid:
                raise RuntimeError("No Dailymotion video id in replayUrl")

            existing_txt = next(TRANSCRIPTS.glob(f"*_{vid}.txt"), None)
            existing_srt = next(TRANSCRIPTS.glob(f"*_{vid}.srt"), None)
            if existing_txt and existing_srt:
                row.update(
                    {
                        "subtitleLanguage": "cached",
                        "subtitleLabel": "cached",
                        "srtPath": str(existing_srt.relative_to(ROOT)),
                        "txtPath": str(existing_txt.relative_to(ROOT)),
                        "transcriptChars": len(existing_txt.read_text(errors="replace")),
                        "status": "ok",
                    }
                )
                rows.append(row)
                print(f"[{idx:03d}/{len(sessions)}] {'ok(cached)':<12} {vid or '-':<8} {title[:80]}")
                continue

            meta = json.loads(fetch_text(f"https://www.dailymotion.com/player/metadata/video/{vid}"))
            subtitles = (meta.get("subtitles") or {}).get("data") or {}
            if not subtitles:
                row["status"] = "no_subtitles"
            else:
                # Prefer English autogenerated if present; otherwise first available track.
                lang, sub = ("en-auto", subtitles["en-auto"]) if "en-auto" in subtitles else next(iter(subtitles.items()))
                sub_url = sub.get("urls", [None])[0]
                if not sub_url:
                    raise RuntimeError(f"Subtitle track {lang} has no URL")
                srt = fetch_text(sub_url)
                txt = srt_to_text(srt)
                srt_path = TRANSCRIPTS / f"{base}.srt"
                txt_path = TRANSCRIPTS / f"{base}.txt"
                srt_path.write_text(srt)
                txt_path.write_text(txt + "\n")
                row.update(
                    {
                        "subtitleLanguage": lang,
                        "subtitleLabel": sub.get("label", ""),
                        "srtPath": str(srt_path.relative_to(ROOT)),
                        "txtPath": str(txt_path.relative_to(ROOT)),
                        "transcriptChars": len(txt),
                        "status": "ok",
                    }
                )
        except Exception as e:  # keep going; catalog records failures
            row["status"] = "error"
            row["error"] = repr(e)

        rows.append(row)
        print(f"[{idx:03d}/{len(sessions)}] {row['status']:<12} {vid or '-':<8} {title[:80]}")
        time.sleep(0.12)

    CATALOG_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    with CATALOG_CSV.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    with INDEX_JSONL.open("w") as f:
        for row in rows:
            text = ""
            if row["txtPath"]:
                text = (ROOT / row["txtPath"]).read_text(errors="replace")
            f.write(json.dumps({**row, "text": text}, ensure_ascii=False) + "\n")

    ok = sum(1 for r in rows if r["status"] == "ok")
    print(f"Done. {ok}/{len(rows)} transcripts saved under {TRANSCRIPTS}")


if __name__ == "__main__":
    main()
