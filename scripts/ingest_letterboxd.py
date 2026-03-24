#!/usr/bin/env python3
"""
Ingest Letterboxd CSV export into the dads-recs SQLite database.

Usage:
    python scripts/ingest_letterboxd.py [--data-dir scripts/data/<export-folder>]

Idempotent: safe to re-run. Films are upserted by Letterboxd URI.
"""

import argparse
import csv
import os
import sqlite3
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_DATA_DIR = PROJECT_ROOT / "scripts" / "data"
DB_PATH = PROJECT_ROOT / "dads-recs.db"


# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------

def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        print(f"  [skip] {path.name} not found")
        return []
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def find_export_dir(data_dir: Path) -> Path:
    """Find the Letterboxd export folder inside data_dir."""
    # Accept either the export folder itself or its parent
    if (data_dir / "watched.csv").exists():
        return data_dir
    subdirs = [d for d in data_dir.iterdir() if d.is_dir() and not d.name.startswith(".")]
    if len(subdirs) == 1:
        return subdirs[0]
    if len(subdirs) > 1:
        # Pick the most recent one by name (they're timestamped)
        return sorted(subdirs)[-1]
    print(f"ERROR: No Letterboxd export folder found in {data_dir}")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Ingestion logic
# ---------------------------------------------------------------------------

def ingest(export_dir: Path, db_path: Path) -> None:
    print(f"Export dir : {export_dir}")
    print(f"Database   : {db_path}")
    print()

    # --- Load CSVs ---
    print("Loading CSVs...")
    watched_rows  = read_csv(export_dir / "watched.csv")
    diary_rows    = read_csv(export_dir / "diary.csv")
    ratings_rows  = read_csv(export_dir / "ratings.csv")
    reviews_rows  = read_csv(export_dir / "reviews.csv")
    print(f"  watched : {len(watched_rows)} rows")
    print(f"  diary   : {len(diary_rows)} rows")
    print(f"  ratings : {len(ratings_rows)} rows")
    print(f"  reviews : {len(reviews_rows)} rows")
    print()

    # --- Build lookup tables keyed by Letterboxd URI ---

    # ratings: URI -> float rating
    ratings_by_uri: dict[str, float] = {}
    for row in ratings_rows:
        uri = row["Letterboxd URI"].strip()
        try:
            ratings_by_uri[uri] = float(row["Rating"])
        except (ValueError, KeyError):
            pass

    # diary: URI -> list of diary entries (there can be multiple for rewatches)
    # Also index by (name, year) as a fallback — watched.csv and diary.csv use
    # different short URIs for the same film, so URI lookup alone misses everything.
    diary_by_uri: dict[str, list[dict]] = {}
    diary_by_title_year: dict[tuple, list[dict]] = {}
    for row in diary_rows:
        uri = row["Letterboxd URI"].strip()
        diary_by_uri.setdefault(uri, []).append(row)
        name = row["Name"].strip().lower()
        year_str = row.get("Year", "").strip()
        year = int(year_str) if year_str.isdigit() else None
        diary_by_title_year.setdefault((name, year), []).append(row)

    # reviews: URI -> review text (also indexed by title+year as fallback)
    reviews_by_uri: dict[str, str] = {}
    reviews_by_title_year: dict[tuple, str] = {}
    for row in reviews_rows:
        uri = row["Letterboxd URI"].strip()
        review = row.get("Review", "").strip()
        if review:
            reviews_by_uri[uri] = review
            name = row["Name"].strip().lower()
            year_str = row.get("Year", "").strip()
            year = int(year_str) if year_str.isdigit() else None
            reviews_by_title_year[(name, year)] = review

    # --- Build canonical film list from watched.csv ---
    # watched.csv is the authoritative "has Dad seen this?" source
    films: dict[str, dict] = {}  # URI -> film dict
    for row in watched_rows:
        uri = row["Letterboxd URI"].strip()
        name = row["Name"].strip()
        year_str = row.get("Year", "").strip()
        year = int(year_str) if year_str.isdigit() else None
        films[uri] = {
            "title": name,
            "year": year,
            "letterboxd_uri": uri,
        }

    # Also include any films in diary/ratings not in watched (edge case).
    # Check by title+year before adding, since diary URIs differ from watched URIs
    # for the same film — a URI-only check creates duplicate records.
    films_by_title_year: dict[tuple, str] = {
        (f["title"].lower(), f["year"]): uri for uri, f in films.items()
    }
    for row in diary_rows + ratings_rows:
        uri = row["Letterboxd URI"].strip()
        if uri in films:
            continue
        name = row["Name"].strip()
        year_str = row.get("Year", "").strip()
        year = int(year_str) if year_str.isdigit() else None
        if (name.lower(), year) in films_by_title_year:
            continue  # already present under a different URI
        films[uri] = {"title": name, "year": year, "letterboxd_uri": uri}
        films_by_title_year[(name.lower(), year)] = uri

    print(f"Unique films to ingest: {len(films)}")
    print()

    # --- Build watch_history entries ---
    # Strategy:
    #   - If a film has diary entries, create one watch_history row per diary entry.
    #   - If no diary entries, create one row using watched.csv Date as logged_date.
    #   - Rating comes from ratings_by_uri (explicit) or diary entry, whichever is present.
    #   - Reviews attached to the most recent watch entry.

    watch_entries: list[dict] = []

    for uri, film in films.items():
        title_year_key = (film["title"].lower(), film["year"])
        diary_entries = diary_by_uri.get(uri) or diary_by_title_year.get(title_year_key, [])
        explicit_rating = ratings_by_uri.get(uri)
        review_text = reviews_by_uri.get(uri) or reviews_by_title_year.get(title_year_key)

        if diary_entries:
            # Sort by Watched Date ascending
            sorted_diary = sorted(
                diary_entries,
                key=lambda r: r.get("Watched Date", "") or r.get("Date", "")
            )
            for i, entry in enumerate(sorted_diary):
                is_last = i == len(sorted_diary) - 1
                # Rating: prefer explicit rating on last entry, else diary rating
                rating = None
                if is_last and explicit_rating is not None:
                    rating = explicit_rating
                else:
                    raw = entry.get("Rating", "").strip()
                    if raw:
                        try:
                            rating = float(raw)
                        except ValueError:
                            pass

                rewatch_flag = 1 if entry.get("Rewatch", "").strip().lower() == "yes" else 0
                watch_date = entry.get("Watched Date", "").strip() or None
                logged_date = entry.get("Date", "").strip() or None

                watch_entries.append({
                    "uri": uri,
                    "rating": rating,
                    "watch_date": watch_date,
                    "rewatch": rewatch_flag,
                    "review_text": review_text if is_last else None,
                    "logged_date": logged_date,
                })
        else:
            # No diary entry — use watched.csv date as logged_date
            watched_row = next(
                (r for r in watched_rows if r["Letterboxd URI"].strip() == uri), None
            )
            logged_date = watched_row["Date"].strip() if watched_row else None

            watch_entries.append({
                "uri": uri,
                "rating": explicit_rating,
                "watch_date": None,
                "rewatch": 0,
                "review_text": review_text,
                "logged_date": logged_date,
            })

    # --- Write to database ---
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    inserted_films = 0
    updated_films = 0
    inserted_watches = 0

    try:
        # Upsert films
        print("Inserting films...")
        for uri, film in films.items():
            existing = conn.execute(
                "SELECT film_id FROM films WHERE letterboxd_uri = ?", (uri,)
            ).fetchone()

            if existing:
                conn.execute(
                    """UPDATE films SET title = ?, year = ?, updated_at = CURRENT_TIMESTAMP
                       WHERE letterboxd_uri = ?""",
                    (film["title"], film["year"], uri),
                )
                updated_films += 1
            else:
                conn.execute(
                    """INSERT INTO films (title, year, letterboxd_uri)
                       VALUES (?, ?, ?)""",
                    (film["title"], film["year"], uri),
                )
                inserted_films += 1

        conn.commit()
        print(f"  Inserted: {inserted_films}  Updated: {updated_films}")

        # Build URI -> film_id map
        uri_to_id: dict[str, int] = {}
        for row in conn.execute("SELECT film_id, letterboxd_uri FROM films WHERE letterboxd_uri IS NOT NULL"):
            uri_to_id[row["letterboxd_uri"]] = row["film_id"]

        # Insert watch_history (clear existing first for idempotency)
        print("Inserting watch history...")
        film_ids_to_clear = set(uri_to_id[e["uri"]] for e in watch_entries if e["uri"] in uri_to_id)
        for film_id in film_ids_to_clear:
            conn.execute("DELETE FROM watch_history WHERE film_id = ?", (film_id,))

        for entry in watch_entries:
            film_id = uri_to_id.get(entry["uri"])
            if film_id is None:
                print(f"  [warn] No film_id found for URI: {entry['uri']}")
                continue
            conn.execute(
                """INSERT INTO watch_history (film_id, rating, watch_date, rewatch, review_text, logged_date)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    film_id,
                    entry["rating"],
                    entry["watch_date"],
                    entry["rewatch"],
                    entry["review_text"],
                    entry["logged_date"],
                ),
            )
            inserted_watches += 1

        conn.commit()
        print(f"  Inserted: {inserted_watches} watch entries")

        # Rebuild FTS index
        print("Rebuilding FTS index...")
        conn.execute("INSERT INTO films_fts(films_fts) VALUES('rebuild')")
        conn.commit()
        print("  FTS index rebuilt")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        conn.close()

    print()
    print("Done.")
    print(f"  Films     : {inserted_films + updated_films} total ({inserted_films} new, {updated_films} updated)")
    print(f"  Watches   : {inserted_watches}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ingest Letterboxd CSV export into SQLite")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="Path to Letterboxd export folder (or parent containing it)",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DB_PATH,
        help="Path to SQLite database file",
    )
    args = parser.parse_args()

    export_dir = find_export_dir(args.data_dir)
    ingest(export_dir, args.db)


if __name__ == "__main__":
    main()
