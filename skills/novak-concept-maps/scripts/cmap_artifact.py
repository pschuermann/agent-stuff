#!/usr/bin/env python3
"""Render a Novak-style concept map JSON file to Markdown, Mermaid, HTML, and CXL."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET


def slug(text: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return value or "concept-map"


def mermaid_id(raw_id: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9_]", "_", raw_id)
    if not value or value[0].isdigit():
        value = f"c_{value}"
    return value


def escape_mermaid(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', "'").replace("\n", "<br/>")


def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def load_map(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    validate_map(data)
    return data


def validate_map(data: dict) -> None:
    concept_ids = {concept["id"] for concept in data.get("concepts", [])}
    if not data.get("title"):
        raise ValueError("Map needs a title.")
    if not data.get("focus_question"):
        raise ValueError("Map needs a focus_question.")
    if not concept_ids:
        raise ValueError("Map needs at least one concept.")
    for proposition in data.get("propositions", []):
        missing = [key for key in ("id", "from", "link", "to") if not proposition.get(key)]
        if missing:
            raise ValueError(f"Proposition is missing fields: {', '.join(missing)}")
        if proposition["from"] not in concept_ids:
            raise ValueError(f"Unknown concept id in proposition {proposition['id']}: {proposition['from']}")
        if proposition["to"] not in concept_ids:
            raise ValueError(f"Unknown concept id in proposition {proposition['id']}: {proposition['to']}")


def build_mermaid(data: dict) -> str:
    concepts = sorted(data["concepts"], key=lambda item: (item.get("rank", 99), item["label"]))
    lines = ["flowchart TB"]
    for concept in concepts:
        lines.append(f'  {mermaid_id(concept["id"])}["{escape_mermaid(concept["label"])}"]')
    for proposition in data.get("propositions", []):
        has_arrow = proposition.get("arrow", True) is not False
        if proposition.get("type") == "cross-link":
            arrow = "-.->" if has_arrow else "-.-"
        else:
            arrow = "-->" if has_arrow else "---"
        lines.append(
            f'  {mermaid_id(proposition["from"])} {arrow}|"{escape_mermaid(proposition["link"])}"| {mermaid_id(proposition["to"])}'
        )
    return "\n".join(lines) + "\n"


def concept_lookup(data: dict) -> dict[str, str]:
    return {concept["id"]: concept["label"] for concept in data["concepts"]}


def box_size(label: str, kind: str = "concept") -> tuple[int, int]:
    width = 34 + len(label) * (7 if kind == "concept" else 6)
    if kind == "concept":
        return max(112, min(230, width)), 48
    return max(72, min(180, width)), 34


def layout_positions(data: dict) -> tuple[dict[str, dict], dict[str, dict], int, int]:
    rank_groups: dict[int, list[dict]] = defaultdict(list)
    for concept in data["concepts"]:
        rank_groups[int(concept.get("rank", 99))].append(concept)

    concept_positions: dict[str, dict] = {}
    row_gap = 148
    col_gap = 124
    margin_x = 80
    margin_y = 92
    canvas_width = 900

    if any("x" in concept and "y" in concept for concept in data["concepts"]):
        for concept in data["concepts"]:
            width = int(concept.get("w", box_size(concept["label"], "concept")[0]))
            height = int(concept.get("h", box_size(concept["label"], "concept")[1]))
            rank = int(concept.get("rank", 99))
            concept_positions[concept["id"]] = {
                "x": float(concept.get("x", margin_x)),
                "y": float(concept.get("y", margin_y + rank * row_gap)),
                "w": width,
                "h": height,
                "label": concept["label"],
                "rank": rank,
            }
            canvas_width = max(canvas_width, int(concept_positions[concept["id"]]["x"] + width + margin_x))
    else:
        for rank in sorted(rank_groups):
            group = sorted(rank_groups[rank], key=lambda item: item["label"])
            widths = [box_size(item["label"], "concept")[0] for item in group]
            row_width = sum(widths) + col_gap * max(0, len(group) - 1)
            canvas_width = max(canvas_width, row_width + margin_x * 2)
            x = margin_x
            y = margin_y + rank * row_gap
            for concept, width in zip(group, widths):
                height = box_size(concept["label"], "concept")[1]
                concept_positions[concept["id"]] = {
                    "x": x,
                    "y": y,
                    "w": width,
                    "h": height,
                    "label": concept["label"],
                    "rank": rank,
                }
                x += width + col_gap

    phrase_positions: dict[str, dict] = {}
    used_slots: dict[tuple[int, int], int] = defaultdict(int)
    for proposition in data.get("propositions", []):
        source = concept_positions[proposition["from"]]
        target = concept_positions[proposition["to"]]
        phrase_id = f"lp_{proposition['id']}"
        width, height = box_size(proposition["link"], "phrase")
        source_center = (source["x"] + source["w"] / 2, source["y"] + source["h"] / 2)
        target_center = (target["x"] + target["w"] / 2, target["y"] + target["h"] / 2)
        mid_x = (source_center[0] + target_center[0]) / 2
        same_rank = source["rank"] == target["rank"]
        if same_rank:
            mid_y = min(source["y"], target["y"]) - 54
        else:
            mid_y = (source_center[1] + target_center[1]) / 2
        slot = (round(mid_x / 90), round(mid_y / 54))
        offset = used_slots[slot] * 28
        used_slots[slot] += 1
        y_offset = offset if not same_rank else -offset
        phrase_positions[phrase_id] = {
            "x": float(proposition.get("phrase_x", max(24, mid_x - width / 2 + (offset if not same_rank else 0)))),
            "y": float(proposition.get("phrase_y", max(24, mid_y - height / 2 - 10 + (y_offset / 3)))),
            "w": width,
            "h": height,
            "label": proposition["link"],
            "from": proposition["from"],
            "to": proposition["to"],
            "type": proposition.get("type", "hierarchy"),
        }

    max_x = 0
    max_y = 0
    for item in list(concept_positions.values()) + list(phrase_positions.values()):
        max_x = max(max_x, int(item["x"] + item["w"]))
        max_y = max(max_y, int(item["y"] + item["h"]))
    return concept_positions, phrase_positions, max(canvas_width, max_x + 120), max(640, max_y + 120)


def build_markdown(data: dict, mermaid: str) -> str:
    labels = concept_lookup(data)
    lines = [
        f"# {data['title']}",
        "",
        "## Focus Question",
        data["focus_question"],
        "",
        "## Concept Map",
        "```mermaid",
        mermaid.rstrip(),
        "```",
        "",
        "## Propositions",
        "| ID | Proposition | Type |",
        "|---|---|---|",
    ]
    for proposition in data.get("propositions", []):
        sentence = f"{labels[proposition['from']]} {proposition['link']} {labels[proposition['to']]}"
        lines.append(f"| {proposition['id']} | {sentence} | {proposition.get('type', 'hierarchy')} |")

    assessment = data.get("assessment", {})
    if assessment:
        lines.extend(["", "## Assessment Context", ""])
        if assessment.get("objective"):
            lines.append(f"- Objective: {assessment['objective']}")
        if assessment.get("orientation"):
            lines.append(f"- Orientation: {assessment['orientation']}")
        if assessment.get("reference_map"):
            lines.append(f"- Reference map: {assessment['reference_map']}")
        if assessment.get("learner_map"):
            lines.append(f"- Learner map: {assessment['learner_map']}")
        summary = assessment.get("comparison_summary", [])
        if summary:
            lines.extend(["", "### Comparison Summary", ""])
            lines.extend(f"- {item}" for item in summary)

    parking_lot = data.get("parking_lot", [])
    if parking_lot:
        lines.extend(["", "## Parking Lot", ""])
        lines.extend(f"- {concept}" for concept in parking_lot)

    resources = data.get("resources", [])
    if resources:
        lines.extend(["", "## Resources", "", "| Concept | Resource | Kind |", "|---|---|---|"])
        for resource in resources:
            concept = labels.get(resource.get("concept", ""), resource.get("concept", ""))
            title = resource.get("title", resource.get("path_or_url", "Resource"))
            target = resource.get("path_or_url", "")
            kind = resource.get("kind", "")
            if target:
                resource_text = f"[{title}]({target})"
            else:
                resource_text = title
            lines.append(f"| {concept} | {resource_text} | {kind} |")

    exercises = data.get("exercises", [])
    if exercises:
        lines.extend(["", "## Learning Checks", ""])
        for index, exercise in enumerate(exercises, start=1):
            label = exercise.get("type", "exercise").replace("_", " ")
            lines.append(f"{index}. **{label}:** {exercise['prompt']}")
            for option in exercise.get("options", []):
                lines.append(f"   - {option}")
        lines.extend(["", "<details>", "<summary>Answer Key</summary>", ""])
        for index, exercise in enumerate(exercises, start=1):
            lines.append(f"{index}. {exercise['answer']}")
            if exercise.get("rationale"):
                lines.append(f"   - Rationale: {exercise['rationale']}")
            if exercise.get("rubric"):
                lines.append(f"   - Rubric: {exercise['rubric']}")
        lines.extend(["", "</details>"])

    lines.extend(
        [
            "",
            "## Revision Checks",
            "",
            "- Does every proposition answer the focus question or support an answer?",
            "- Are the linking phrases brief and specific?",
            "- Are concept labels short rather than sentence-like?",
            "- Are cross-links useful rather than decorative?",
        ]
    )
    return "\n".join(lines) + "\n"


def build_html(data: dict) -> str:
    labels = concept_lookup(data)
    concept_positions, phrase_positions, canvas_width, canvas_height = layout_positions(data)
    theme = re.sub(r"[^a-z0-9_-]", "", data.get("theme", "default").lower())

    node_html = []
    for concept_id, item in concept_positions.items():
        node_html.append(
            f'<div class="node concept" id="n-{escape_html(concept_id)}" '
            f'style="left:{item["x"]:.1f}px;top:{item["y"]:.1f}px;width:{item["w"]}px;height:{item["h"]}px">'
            f"{escape_html(item['label'])}</div>"
        )
    for phrase_id, item in phrase_positions.items():
        kind = " cross" if item.get("type") == "cross-link" else ""
        node_html.append(
            f'<div class="node phrase{kind}" id="n-{escape_html(phrase_id)}" '
            f'style="left:{item["x"]:.1f}px;top:{item["y"]:.1f}px;width:{item["w"]}px;height:{item["h"]}px">'
            f"{escape_html(item['label'])}</div>"
        )

    line_html = []
    for proposition in data.get("propositions", []):
        source = concept_positions[proposition["from"]]
        target = concept_positions[proposition["to"]]
        phrase = phrase_positions[f"lp_{proposition['id']}"]
        source_x = source["x"] + source["w"] / 2
        source_y = source["y"] + source["h"] / 2
        phrase_x = phrase["x"] + phrase["w"] / 2
        phrase_y = phrase["y"] + phrase["h"] / 2
        target_x = target["x"] + target["w"] / 2
        target_y = target["y"] + target["h"] / 2
        cls = " cross" if proposition.get("type") == "cross-link" else ""
        line_html.append(
            f'<line class="connector{cls}" x1="{source_x:.1f}" y1="{source_y:.1f}" '
            f'x2="{phrase_x:.1f}" y2="{phrase_y:.1f}" />'
        )
        marker = ' marker-end="url(#arrow)"' if proposition.get("arrow", True) is not False else ""
        line_html.append(
            f'<line class="connector{cls}" x1="{phrase_x:.1f}" y1="{phrase_y:.1f}" '
            f'x2="{target_x:.1f}" y2="{target_y:.1f}"{marker} />'
        )

    propositions = []
    for proposition in data.get("propositions", []):
        sentence = f"{labels[proposition['from']]} {proposition['link']} {labels[proposition['to']]}"
        propositions.append(
            f"<tr><td>{escape_html(proposition['id'])}</td><td>{escape_html(sentence)}</td>"
            f"<td>{escape_html(proposition.get('type', 'hierarchy'))}</td></tr>"
        )

    assessment = data.get("assessment", {})
    assessment_section = ""
    if assessment:
        rows = []
        for label, key in (
            ("Mode", "mode"),
            ("Objective", "objective"),
            ("Orientation", "orientation"),
            ("Reference map", "reference_map"),
            ("Learner map", "learner_map"),
        ):
            if assessment.get(key):
                rows.append(f"<tr><th>{label}</th><td>{escape_html(str(assessment[key]))}</td></tr>")
        summary = "".join(f"<li>{escape_html(item)}</li>" for item in assessment.get("comparison_summary", []))
        summary_block = f"<h3>Comparison Summary</h3><ul>{summary}</ul>" if summary else ""
        assessment_section = (
            '<section class="panel"><h2>Assessment Context</h2>'
            f"<table><tbody>{''.join(rows)}</tbody></table>{summary_block}</section>"
        )

    exercises = []
    for index, exercise in enumerate(data.get("exercises", []), start=1):
        options = "".join(f"<li>{escape_html(option)}</li>" for option in exercise.get("options", []))
        option_block = f"<ol type=\"A\">{options}</ol>" if options else ""
        label = escape_html(exercise.get("type", "exercise").replace("_", " ").title())
        rationale = (
            f"<p><strong>Rationale:</strong> {escape_html(exercise['rationale'])}</p>"
            if exercise.get("rationale")
            else ""
        )
        rubric = (
            f"<p><strong>Rubric:</strong> {escape_html(exercise['rubric'])}</p>"
            if exercise.get("rubric")
            else ""
        )
        exercises.append(
            f"<li><p><strong>{label}:</strong> {escape_html(exercise['prompt'])}</p>{option_block}"
            f"<details><summary>Answer</summary><p>{escape_html(exercise['answer'])}</p>{rationale}{rubric}</details></li>"
        )

    parking = "".join(f"<li>{escape_html(concept)}</li>" for concept in data.get("parking_lot", []))
    resource_rows = []
    for resource in data.get("resources", []):
        concept = labels.get(resource.get("concept", ""), resource.get("concept", ""))
        title = resource.get("title", resource.get("path_or_url", "Resource"))
        target = resource.get("path_or_url", "")
        link = f'<a href="{escape_html(target)}">{escape_html(title)}</a>' if target else escape_html(title)
        resource_rows.append(
            f"<tr><td>{escape_html(concept)}</td><td>{link}</td><td>{escape_html(resource.get('kind', ''))}</td></tr>"
        )
    resources = ""
    if resource_rows:
        resources = (
            '<section class="panel"><h2>Resources</h2><table><thead><tr><th>Concept</th><th>Resource</th>'
            f"<th>Kind</th></tr></thead><tbody>{''.join(resource_rows)}</tbody></table></section>"
        )

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape_html(data['title'])}</title>
  <style>
    :root {{
      color-scheme: light;
      --paper: #f8f7f2;
      --ink: #23211d;
      --muted: #6f6a5f;
      --line: #4e4a43;
      --concept-fill: #fffef9;
      --concept-border: #2f2b25;
      --phrase-fill: #f8f7f2;
      --phrase-border: #aaa294;
      --cross: #9f4c2f;
      --panel: #ffffff;
    }}

    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: Georgia, "Times New Roman", serif;
    }}
    header {{
      padding: 18px 22px 12px;
      border-bottom: 1px solid #d7d1c4;
      background: #fffdf7;
      position: sticky;
      top: 0;
      z-index: 5;
    }}
    h1 {{
      font-size: 22px;
      line-height: 1.15;
      margin: 0 0 6px;
      font-weight: 700;
      letter-spacing: 0;
    }}
    .focus {{
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
      max-width: 86ch;
    }}
    .toolbar {{
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 12px;
      flex-wrap: wrap;
    }}
    button {{
      border: 1px solid #b9b1a3;
      background: #fffaf0;
      color: var(--ink);
      padding: 7px 10px;
      border-radius: 4px;
      font: 13px ui-sans-serif, system-ui, sans-serif;
      cursor: pointer;
    }}
    button:hover {{ background: #f0eadc; }}
    main {{
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      min-height: calc(100vh - 96px);
    }}
    .stage {{
      overflow: auto;
      border-right: 1px solid #d7d1c4;
      background:
        linear-gradient(rgba(40, 36, 30, .035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(40, 36, 30, .035) 1px, transparent 1px),
        var(--paper);
      background-size: 24px 24px;
    }}
    .canvas-wrap {{
      transform-origin: top left;
      width: {canvas_width}px;
      height: {canvas_height}px;
      padding: 0;
    }}
    .canvas {{
      position: relative;
      width: {canvas_width}px;
      height: {canvas_height}px;
    }}
    svg.links {{
      position: absolute;
      inset: 0;
      width: {canvas_width}px;
      height: {canvas_height}px;
      pointer-events: none;
      overflow: visible;
    }}
    .connector {{
      stroke: var(--line);
      stroke-width: 1.45;
      vector-effect: non-scaling-stroke;
    }}
    .connector.cross {{
      stroke: var(--cross);
      stroke-dasharray: 6 5;
    }}
    .node {{
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      white-space: pre-line;
      line-height: 1.12;
      padding: 5px 9px;
      z-index: 2;
      letter-spacing: 0;
    }}
    .concept {{
      background: var(--concept-fill);
      border: 1.5px solid var(--concept-border);
      border-radius: 10px;
      box-shadow: 0 1px 0 rgba(35, 33, 29, .18);
      font-size: 14px;
      font-weight: 700;
    }}
    .phrase {{
      background: var(--phrase-fill);
      border: 1px solid var(--phrase-border);
      border-radius: 3px;
      font-size: 12px;
      font-style: italic;
      color: #35312b;
    }}
    .phrase.cross {{
      border-color: #b36a4c;
      color: #77341e;
      background: #fff8f3;
    }}
    body.theme-cmap-yellow {{
      --paper: #fbfbfb;
      --concept-fill: #ece66b;
      --concept-border: #ece66b;
      --phrase-fill: rgba(255, 255, 255, .82);
      --phrase-border: transparent;
      --line: #333333;
      --cross: #8a452c;
    }}
    body.theme-cmap-yellow .concept {{
      border-radius: 7px;
      border-color: var(--concept-border);
      box-shadow: 5px 5px 0 #8d902f;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      font-weight: 700;
    }}
    body.theme-cmap-yellow .phrase {{
      border-color: transparent;
      background: rgba(255, 255, 255, .72);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      font-style: normal;
    }}
    body.theme-cmap-blue {{
      --paper: #ffffff;
      --concept-fill: #ffffff;
      --concept-border: #18179a;
      --phrase-fill: rgba(255, 255, 255, .82);
      --phrase-border: transparent;
      --line: #111111;
      --cross: #111111;
    }}
    body.theme-cmap-blue .concept {{
      border-radius: 0;
      border: 2px solid var(--concept-border);
      box-shadow: none;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 22px;
      font-weight: 800;
    }}
    body.theme-cmap-blue .phrase {{
      border-color: transparent;
      background: rgba(255, 255, 255, .72);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 18px;
      font-style: normal;
      font-weight: 800;
    }}
    aside {{
      background: #fffdf7;
      overflow: auto;
      padding: 16px;
    }}
    body.details-hidden main {{
      grid-template-columns: 1fr;
    }}
    body.details-hidden aside {{
      display: none;
    }}
    .panel {{
      border-top: 1px solid #d7d1c4;
      padding-top: 14px;
      margin-top: 14px;
    }}
    .panel:first-child {{
      border-top: 0;
      margin-top: 0;
      padding-top: 0;
    }}
    h2 {{
      font: 700 14px ui-sans-serif, system-ui, sans-serif;
      margin: 0 0 10px;
      letter-spacing: 0;
    }}
    h3 {{
      font: 700 12px ui-sans-serif, system-ui, sans-serif;
      margin: 12px 0 7px;
      letter-spacing: 0;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font: 12px ui-sans-serif, system-ui, sans-serif;
    }}
    th, td {{
      border-bottom: 1px solid #e3ded3;
      padding: 7px 5px;
      text-align: left;
      vertical-align: top;
    }}
    th {{ color: var(--muted); font-weight: 700; }}
    ul, ol {{
      padding-left: 20px;
      margin: 0;
      font: 13px ui-sans-serif, system-ui, sans-serif;
      line-height: 1.45;
    }}
    li + li {{ margin-top: 7px; }}
    details {{
      margin-top: 6px;
      color: var(--muted);
    }}
    summary {{ cursor: pointer; }}
    @media (max-width: 900px) {{
      main {{ grid-template-columns: 1fr; }}
      .stage {{ min-height: 62vh; border-right: 0; border-bottom: 1px solid #d7d1c4; }}
      aside {{ max-height: none; }}
    }}
  </style>
</head>
<body class="theme-{escape_html(theme)}">
  <header>
    <h1>{escape_html(data['title'])}</h1>
    <p class="focus"><strong>Focus question:</strong> {escape_html(data['focus_question'])}</p>
    <div class="toolbar" aria-label="Map controls">
      <button type="button" data-zoom="in">Zoom In</button>
      <button type="button" data-zoom="out">Zoom Out</button>
      <button type="button" data-zoom="reset">Reset</button>
      <button type="button" data-toggle-details>Hide Details</button>
    </div>
  </header>
  <main>
    <section class="stage" aria-label="Concept map canvas">
      <div class="canvas-wrap" id="canvasWrap">
        <div class="canvas">
          <svg class="links" viewBox="0 0 {canvas_width} {canvas_height}" role="img" aria-label="Concept map links">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L9,4 L0,8 z" fill="var(--line)"></path>
              </marker>
            </defs>
            {''.join(line_html)}
          </svg>
          {''.join(node_html)}
        </div>
      </div>
    </section>
    <aside>
      <section class="panel">
        <h2>Propositions</h2>
        <table>
          <thead><tr><th>ID</th><th>Proposition</th><th>Type</th></tr></thead>
          <tbody>{''.join(propositions)}</tbody>
        </table>
      </section>
      {assessment_section}
      <section class="panel">
        <h2>Parking Lot</h2>
        <ul>{parking}</ul>
      </section>
      {resources}
      <section class="panel">
        <h2>Learning Checks</h2>
        <ol>{''.join(exercises)}</ol>
      </section>
    </aside>
  </main>
  <script>
    const wrap = document.getElementById('canvasWrap');
    const canvasWidth = {canvas_width};
    const canvasHeight = {canvas_height};
    let scale = 1;
    function applyScale() {{
      wrap.style.transform = `scale(${{scale}})`;
      wrap.style.marginRight = `${{canvasWidth * (scale - 1)}}px`;
      wrap.style.marginBottom = `${{canvasHeight * (scale - 1)}}px`;
    }}
    document.querySelectorAll('[data-zoom]').forEach((button) => {{
      button.addEventListener('click', () => {{
        const action = button.dataset.zoom;
        if (action === 'in') scale = Math.min(1.8, scale + 0.15);
        if (action === 'out') scale = Math.max(0.55, scale - 0.15);
        if (action === 'reset') scale = 1;
        applyScale();
      }});
    }});
    const detailsButton = document.querySelector('[data-toggle-details]');
    if (new URLSearchParams(window.location.search).get('details') === 'hidden') {{
      document.body.classList.add('details-hidden');
      detailsButton.textContent = 'Show Details';
    }}
    detailsButton.addEventListener('click', () => {{
      document.body.classList.toggle('details-hidden');
      detailsButton.textContent = document.body.classList.contains('details-hidden') ? 'Show Details' : 'Hide Details';
    }});
  </script>
</body>
</html>
"""


def add_text(parent: ET.Element, tag: str, text: str) -> ET.Element:
    child = ET.SubElement(parent, tag)
    child.text = text
    return child


def build_cxl(data: dict) -> str:
    ET.register_namespace("", "http://cmap.ihmc.us/xml/cmap/")
    ET.register_namespace("dc", "http://purl.org/dc/elements/1.1/")
    root = ET.Element("{http://cmap.ihmc.us/xml/cmap/}cmap")
    meta = ET.SubElement(root, "res-meta")
    add_text(meta, "{http://purl.org/dc/elements/1.1/}title", data["title"])
    add_text(meta, "{http://purl.org/dc/elements/1.1/}description", data["focus_question"])

    cmap = ET.SubElement(root, "map")
    concept_list = ET.SubElement(cmap, "concept-list")
    linking_phrase_list = ET.SubElement(cmap, "linking-phrase-list")
    connection_list = ET.SubElement(cmap, "connection-list")
    proposition_list = ET.SubElement(cmap, "proposition-list")
    concept_appearance_list = ET.SubElement(cmap, "concept-appearance-list")
    phrase_appearance_list = ET.SubElement(cmap, "linking-phrase-appearance-list")

    for concept in data["concepts"]:
        ET.SubElement(concept_list, "concept", id=concept["id"], label=concept["label"])

    concept_layout, phrase_layout, _canvas_width, _canvas_height = layout_positions(data)
    positions: dict[str, tuple[int, int]] = {}
    for concept in data["concepts"]:
        item = concept_layout[concept["id"]]
        x = int(item["x"])
        y = int(item["y"])
        positions[concept["id"]] = (x, y)
        ET.SubElement(concept_appearance_list, "concept-appearance", id=concept["id"], x=str(x), y=str(y))

    for index, proposition in enumerate(data.get("propositions", []), start=1):
        phrase_id = f"lp_{proposition['id']}"
        conn_a = f"conn_{proposition['id']}_a"
        conn_b = f"conn_{proposition['id']}_b"
        ET.SubElement(linking_phrase_list, "linking-phrase", id=phrase_id, label=proposition["link"])
        ET.SubElement(connection_list, "connection", id=conn_a, **{"from-id": proposition["from"], "to-id": phrase_id})
        ET.SubElement(connection_list, "connection", id=conn_b, **{"from-id": phrase_id, "to-id": proposition["to"]})
        prop = ET.SubElement(proposition_list, "proposition")
        ET.SubElement(prop, "prop-conn", **{"conn-id": conn_a})
        ET.SubElement(prop, "prop-conn", **{"conn-id": conn_b})

        phrase_item = phrase_layout[phrase_id]
        phrase_x = int(phrase_item["x"])
        phrase_y = int(phrase_item["y"])
        ET.SubElement(phrase_appearance_list, "linking-phrase-appearance", id=phrase_id, x=str(phrase_x), y=str(phrase_y))

    rough = ET.tostring(root, encoding="unicode")
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + rough + "\n"


def write_outputs(data: dict, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    base = slug(data["title"])
    mermaid = build_mermaid(data)
    (out_dir / f"{base}.mmd").write_text(mermaid, encoding="utf-8")
    (out_dir / f"{base}.md").write_text(build_markdown(data, mermaid), encoding="utf-8")
    (out_dir / f"{base}.html").write_text(build_html(data), encoding="utf-8")
    (out_dir / f"{base}.cxl").write_text(build_cxl(data), encoding="utf-8")
    print(out_dir / f"{base}.md")
    print(out_dir / f"{base}.mmd")
    print(out_dir / f"{base}.html")
    print(out_dir / f"{base}.cxl")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map_json", type=Path)
    parser.add_argument("--out-dir", type=Path, default=Path("concept-map-output"))
    args = parser.parse_args()
    write_outputs(load_map(args.map_json), args.out_dir)


if __name__ == "__main__":
    main()
