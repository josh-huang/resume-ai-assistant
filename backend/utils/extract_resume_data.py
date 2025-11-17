"""
Utility script to extract structured data from the HuangJiashu Resume.docx file.

The script reads the .docx, captures each section, and writes a JSON payload to
the same directory for downstream consumption (frontend seeding, datasets, etc.).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from docx import Document

ROOT_DIR = Path(__file__).resolve().parents[2]
RESUME_PATH = ROOT_DIR / "backend" / "resumeMaterial" / "HuangJiashu Resume.docx"
BACKEND_OUTPUT_PATH = RESUME_PATH.with_suffix(".json")
FRONTEND_DATA_DIR = ROOT_DIR / "frontend" / "data"
FRONTEND_OUTPUT_PATH = FRONTEND_DATA_DIR / "resume.generated.json"

TITLE_KEYS = {
    "PROFILE": "profile",
    "EDUCATION": "education",
    "RELEVANT PROJECTS": "projects",
    "WORK EXPERIENCE": "experience",
    "TECHNICAL SKILLS": "skills",
    "PROFESSIONAL MEMBERSHIP / CERTIFICATION": "certifications",
}


def _load_lines(path: Path) -> List[str]:
    doc = Document(path)
    return [p.text.strip() for p in doc.paragraphs if p.text.strip()]


def _group_sections(lines: List[str]) -> Dict[str, List[str]]:
    sections: Dict[str, List[str]] = {}
    current_key: str | None = None

    for line in lines:
        normalized = line.strip().upper()
        if normalized in TITLE_KEYS:
            current_key = TITLE_KEYS[normalized]
            sections[current_key] = []
            continue
        if current_key is None:
            continue
        sections[current_key].append(line)

    return sections


def main() -> None:
    if not RESUME_PATH.exists():
        raise FileNotFoundError(f"Resume not found at {RESUME_PATH}")

    lines = _load_lines(RESUME_PATH)
    sections = _group_sections(lines)

    payload = {
        "source": RESUME_PATH.name,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "name": lines[0] if lines else "",
        "contact": lines[1] if len(lines) > 1 else "",
        "sections": sections,
        "raw_lines": lines,
    }

    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)

    serialized = json.dumps(payload, indent=2, ensure_ascii=False)
    BACKEND_OUTPUT_PATH.write_text(serialized, encoding="utf-8")
    FRONTEND_OUTPUT_PATH.write_text(serialized, encoding="utf-8")
    print("Wrote structured resume data to:")
    print(f" - {BACKEND_OUTPUT_PATH}")
    print(f" - {FRONTEND_OUTPUT_PATH}")


if __name__ == "__main__":
    main()

