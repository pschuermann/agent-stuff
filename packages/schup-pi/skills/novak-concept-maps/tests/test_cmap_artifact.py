#!/usr/bin/env python3
"""Regression tests for the proposition-first concept-map renderer."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
import warnings
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "cmap_artifact.py"
SPEC = importlib.util.spec_from_file_location("cmap_artifact", SCRIPT)
assert SPEC and SPEC.loader
cmap_artifact = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cmap_artifact)


class CmapArtifactTests(unittest.TestCase):
    def sample_map(self) -> dict:
        return {
            "title": "Provenance Sample",
            "focus_question": "How do evidence and propositions relate?",
            "sources": [
                {
                    "id": "interview-01",
                    "title": "Incident responder interview",
                    "url": "https://example.test/interview-01",
                }
            ],
            "concepts": [
                {"id": "evidence", "label": "Evidence", "rank": 0},
                {"id": "propositions", "label": "Propositions", "rank": 1},
            ],
            "propositions": [
                {
                    "id": "P1",
                    "from": "evidence",
                    "link": "supports",
                    "to": "propositions",
                    "source_refs": ["interview-01"],
                }
            ],
        }

    def test_renders_provenance_in_markdown_and_html(self) -> None:
        data = self.sample_map()
        cmap_artifact.validate_map(data)
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            cmap_artifact.write_outputs(data, output_dir)
            markdown = (output_dir / "provenance-sample.md").read_text(encoding="utf-8")
            html = (output_dir / "provenance-sample.html").read_text(encoding="utf-8")

        self.assertIn("| ID | Proposition | Type | Sources |", markdown)
        self.assertIn("interview-01", markdown)
        self.assertIn("Incident responder interview", markdown)
        self.assertIn("<th>Sources</th>", html)
        self.assertIn("https://example.test/interview-01", html)

    def test_advisories_do_not_reject_reviewable_maps(self) -> None:
        data = self.sample_map()
        data["concepts"] = [
            {"id": "status_a", "label": "Current Status", "rank": 0},
            {"id": "status_b", "label": "current status", "rank": 1},
            {"id": "sentence", "label": "The team makes a plan for the week.", "rank": 1},
        ]
        data["propositions"] = [
            {
                "id": "P1",
                "from": "status_a",
                "link": "context",
                "to": "status_b",
                "source_refs": ["missing-source"],
            }
        ]
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            cmap_artifact.validate_map(data)

        messages = "\n".join(str(item.message) for item in caught)
        self.assertIn("duplicates label", messages)
        self.assertIn("looks sentence-like", messages)
        self.assertIn("navigation or caption", messages)
        self.assertIn("unknown source", messages)

    def test_missing_concept_reference_is_a_structural_error(self) -> None:
        data = self.sample_map()
        data["propositions"][0]["to"] = "not-a-concept"
        with self.assertRaisesRegex(ValueError, "Unknown concept id"):
            cmap_artifact.validate_map(data)

    def test_valid_links_and_decimal_concepts_do_not_emit_advisories(self) -> None:
        data = self.sample_map()
        data["concepts"].append(
            {"id": "axial_tilt", "label": "23.5 Degrees Tilt of Axis of Earth", "rank": 1}
        )
        links = [
            "form", "lay", "require", "produce", "maintain", "show", "aids",
            "begins with", "help to answer", "points", "in",
        ]
        data["propositions"] = [
            {
                "id": f"P{index}",
                "from": "axial_tilt" if index % 2 else "evidence",
                "link": link,
                "to": "propositions",
            }
            for index, link in enumerate(links, start=1)
        ]
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            cmap_artifact.validate_map(data)

        self.assertEqual([], caught)

    def test_curated_examples_render_without_advisories(self) -> None:
        skill_root = SCRIPT.parent.parent
        examples = [
            skill_root / "examples" / "meaningful-learning.json",
            skill_root / "examples" / "assessment-meaningful-learning.json",
            skill_root / "examples" / "replicas" / "birds.json",
            skill_root / "examples" / "replicas" / "seasons.json",
            skill_root / "examples" / "replicas" / "concept-maps.json",
        ]
        with tempfile.TemporaryDirectory() as temp_dir, warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            for path in examples:
                cmap_artifact.write_outputs(cmap_artifact.load_map(path), Path(temp_dir) / path.stem)

        self.assertEqual([], caught)

    def test_missing_concept_id_is_a_structural_error(self) -> None:
        data = self.sample_map()
        del data["concepts"][0]["id"]
        with self.assertRaisesRegex(ValueError, "Concept 1 is missing fields: id"):
            cmap_artifact.validate_map(data)


if __name__ == "__main__":
    unittest.main()
