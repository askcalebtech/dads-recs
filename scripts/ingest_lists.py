#!/usr/bin/env python3
from __future__ import annotations
"""
Ingest Letterboxd list CSV exports into the dads-recs SQLite database.

Usage:
    python scripts/ingest_lists.py [--data-dir scripts/data]

The script auto-detects the latest letterboxd export folder and reads the
lists/ subdirectory within it. Each CSV file is one list.

Idempotent: safe to re-run. Memberships are fully replaced on each run.
"""

import argparse
import csv
import io
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_DATA_DIR = PROJECT_ROOT / "scripts" / "data"
DB_PATH = PROJECT_ROOT / "dads-recs.db"

# Slug patterns that map to categories.
# Keys are regex patterns matched against the filename stem (slug).
FRANCHISE_PATTERNS = [
    r"^mcu",
    r"^star-wars",
    r"^alien",
    r"^predator",
    r"^dc",
    r"^spider-man",
    r"^pixar",
    r"^mission-impossible",
    r"^indiana-jones"
]

DIRECTOR_PATTERNS = [
    r"christopher-nolan",
    r"denis-villeneuve",
    r"tarantino",
    r"edgar-wright",
    r"david-fincher",
]

YEARLY_PATTERN = re.compile(r"^movies-of-\d{4}-ranked$")

# ---------------------------------------------------------------------------
# Folder detection (mirrors ingest_letterboxd.py)
# ---------------------------------------------------------------------------


def find_export_dir(data_dir: Path) -> Path:
    """Find the latest letterboxd export folder inside data_dir."""
    if (data_dir / "watched.csv").exists():
        return data_dir
    subdirs = [d for d in data_dir.iterdir() if d.is_dir() and not d.name.startswith(".")]
    if len(subdirs) == 1:
        return subdirs[0]
    if len(subdirs) > 1:
        return sorted(subdirs)[-1]
    print(f"ERROR: No Letterboxd export folder found in {data_dir}")
    sys.exit(1)


# ---------------------------------------------------------------------------
# CSV parsing
# ---------------------------------------------------------------------------


def parse_list_csv(csv_path: Path) -> tuple[str | None, str | None, list[dict]]:
    """
    Parse a Letterboxd list CSV.

    Format:
        Line 1: "Letterboxd list export v7"
        Line 2: "Date,Name,Tags,URL,Description"  (metadata header)
        Line 3: "2024-01-01,My List Name,tags,https://boxd.it/...,description"
        Line 4: blank
        Line 5: "Position,Name,Year,URL,Description"  (film header)
        Line 6+: film rows

    Returns (display_name, description, film_rows).
    """
    with open(csv_path, newline="", encoding="utf-8") as f:
        raw_lines = f.readlines()

    display_name: str | None = None
    description: str | None = None
    film_rows: list[dict] = []

    # Find the metadata row (line after "Letterboxd list export")
    meta_header_idx = None
    for i, line in enumerate(raw_lines):
        if line.strip().startswith("Date,Name,"):
            meta_header_idx = i
            break

    if meta_header_idx is not None and meta_header_idx + 1 < len(raw_lines):
        meta_reader = csv.DictReader(
            io.StringIO("".join(raw_lines[meta_header_idx : meta_header_idx + 2]))
        )
        for row in meta_reader:
            display_name = row.get("Name", "").strip() or None
            description = row.get("Description", "").strip() or None
            break

    # Find the film header row ("Position,Name,Year,...")
    film_header_idx = None
    for i, line in enumerate(raw_lines):
        if line.strip().startswith("Position,"):
            film_header_idx = i
            break

    if film_header_idx is not None:
        film_reader = csv.DictReader(
            io.StringIO("".join(raw_lines[film_header_idx:]))
        )
        for row in film_reader:
            film_rows.append(row)

    return display_name, description, film_rows


# ---------------------------------------------------------------------------
# Categorization & display name
# ---------------------------------------------------------------------------


def categorize(slug: str) -> str:
    if YEARLY_PATTERN.match(slug):
        return "yearly"
    for pattern in FRANCHISE_PATTERNS:
        if re.search(pattern, slug):
            return "franchise"
    for pattern in DIRECTOR_PATTERNS:
        if re.search(pattern, slug):
            return "director"
    return "other"


def default_sort_order(slug: str, category: str) -> int:
    """Yearly lists: use year as sort_order so DESC gives most recent first."""
    if category == "yearly":
        m = re.search(r"(\d{4})", slug)
        if m:
            return int(m.group(1))
    return 0


def display_name_from_slug(slug: str) -> str:
    """Fallback display name when CSV metadata is missing."""
    m = re.match(r"^movies-of-(\d{4})-ranked$", slug)
    if m:
        return f"Movies of {m.group(1)}, Ranked"
    return slug.replace("-", " ").title()


# ---------------------------------------------------------------------------
# Film matching
# ---------------------------------------------------------------------------


def find_film_by_title_year(
    conn: sqlite3.Connection, title: str, year: int | None
) -> int | None:
    if year:
        row = conn.execute(
            "SELECT film_id FROM films WHERE LOWER(title) = LOWER(?) AND year = ?",
            (title, year),
        ).fetchone()
        if row:
            return row[0]
    row = conn.execute(
        "SELECT film_id FROM films WHERE LOWER(title) = LOWER(?)", (title,)
    ).fetchone()
    return row[0] if row else None


def create_stub_film(conn: sqlite3.Connection, title: str, year: int | None) -> int:
    cur = conn.execute(
        "INSERT INTO films (title, year) VALUES (?, ?)", (title, year)
    )
    film_id = cur.lastrowid
    print(f"    [stub] '{title}' ({year}) → film_id={film_id}")
    return film_id


def resolve_film(conn: sqlite3.Connection, row: dict) -> tuple[int, bool]:
    """Return (film_id, was_created_as_stub)."""
    title = row.get("Name", "").strip()
    year_str = row.get("Year", "").strip()
    year = int(year_str) if year_str.isdigit() else None

    film_id = find_film_by_title_year(conn, title, year)
    if film_id:
        return film_id, False

    film_id = create_stub_film(conn, title, year)
    return film_id, True


# ---------------------------------------------------------------------------
# Ingest one list
# ---------------------------------------------------------------------------


def ingest_list(
    conn: sqlite3.Connection,
    csv_path: Path,
    metadata_overrides: dict,
) -> None:
    slug = csv_path.stem
    category = categorize(slug)
    sort_order = default_sort_order(slug, category)

    csv_display_name, csv_description, film_rows = parse_list_csv(csv_path)

    # Priority: metadata_overrides > CSV metadata > slug derivation
    meta = metadata_overrides.get(slug, {})
    display_name = meta.get("display_name") or csv_display_name or display_name_from_slug(slug)
    description = meta.get("description") or csv_description or None

    print(f"\n  {slug!r}")
    print(f"  → {display_name!r} [{category}]  ({len(film_rows)} rows in CSV)")

    if not film_rows:
        print("  [warn] No film rows found, skipping.")
        return

    # Upsert list record
    conn.execute(
        """
        INSERT INTO lists (slug, display_name, description, category, sort_order, film_count, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET
            display_name = excluded.display_name,
            description  = excluded.description,
            category     = excluded.category,
            sort_order   = excluded.sort_order,
            updated_at   = CURRENT_TIMESTAMP
        """,
        (slug, display_name, description, category, sort_order),
    )
    list_id = conn.execute(
        "SELECT list_id FROM lists WHERE slug = ?", (slug,)
    ).fetchone()[0]

    conn.execute("DELETE FROM list_films WHERE list_id = ?", (list_id,))

    matched = stubbed = skipped = 0
    seen_positions: set[int] = set()

    for row in film_rows:
        position_str = row.get("Position", "").strip()
        if not position_str.isdigit():
            skipped += 1
            continue
        position = int(position_str)
        if position in seen_positions:
            skipped += 1
            continue
        seen_positions.add(position)

        title = row.get("Name", "").strip()
        if not title:
            skipped += 1
            continue

        film_id, was_stub = resolve_film(conn, row)
        if was_stub:
            stubbed += 1
        else:
            matched += 1

        conn.execute(
            "INSERT OR IGNORE INTO list_films (list_id, film_id, position) VALUES (?, ?, ?)",
            (list_id, film_id, position),
        )

    actual_count = conn.execute(
        "SELECT COUNT(*) FROM list_films WHERE list_id = ?", (list_id,)
    ).fetchone()[0]
    conn.execute(
        "UPDATE lists SET film_count = ? WHERE list_id = ?",
        (actual_count, list_id),
    )

    print(f"  matched={matched}  stubs={stubbed}  skipped={skipped}  total={actual_count}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest Letterboxd list CSVs")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="Parent directory containing the letterboxd export folder(s)",
    )
    args = parser.parse_args()

    export_dir = find_export_dir(args.data_dir)
    lists_dir = export_dir / "lists"

    if not lists_dir.exists():
        print(f"No lists/ subdirectory found in {export_dir}")
        sys.exit(1)

    csv_files = sorted(lists_dir.glob("*.csv"))
    if not csv_files:
        print(f"No CSV files found in {lists_dir}")
        sys.exit(0)

    print(f"Export folder : {export_dir.name}")
    print(f"Lists folder  : {lists_dir}")
    print(f"Found {len(csv_files)} list CSV(s)")

    # Load optional metadata overrides
    meta_path = lists_dir / "list_metadata.json"
    metadata_overrides: dict = {}
    if meta_path.exists():
        with open(meta_path, encoding="utf-8") as f:
            metadata_overrides = json.load(f)
        print(f"Loaded metadata overrides for: {', '.join(metadata_overrides.keys())}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    try:
        for csv_path in csv_files:
            ingest_list(conn, csv_path, metadata_overrides)
        conn.commit()
        total = conn.execute("SELECT COUNT(*) FROM lists").fetchone()[0]
        print(f"\nDone. {total} lists in database.")
    except Exception as e:
        conn.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
