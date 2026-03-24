#!/usr/bin/env python3
"""
Enrich films with TMDB metadata: poster, overview, runtime, genres, cast, directors.

Usage:
    python scripts/enrich_tmdb.py [--limit N] [--reset-progress]

Requires: TMDB_API_KEY environment variable (or set in .env.local at project root).
Rate limit: stays well under TMDB's 40 req/10s cap.
Idempotent/resumable: skips films already enriched; tracks failures in progress file.
"""

import argparse
import json
import os
import sqlite3
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "dads-recs.db"
PROGRESS_FILE = PROJECT_ROOT / "scripts" / ".enrich_progress.json"
ENV_FILE = PROJECT_ROOT / ".env.local"

TMDB_BASE = "https://api.themoviedb.org/3"
REQUEST_DELAY = 0.26  # ~3.8 req/sec, safely under 40/10s limit
MAX_CAST = 15         # store top 15 billed actors per film


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_api_key() -> str:
    key = os.environ.get("TMDB_API_KEY", "")
    if not key and ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith("TMDB_API_KEY="):
                key = line.split("=", 1)[1].strip()
                break
    if not key:
        print("ERROR: TMDB_API_KEY not set. Add it to .env.local or export it.")
        sys.exit(1)
    return key


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text())
    return {"enriched": [], "failed": {}}


def save_progress(progress: dict) -> None:
    PROGRESS_FILE.write_text(json.dumps(progress, indent=2))


def tmdb_get(path: str, api_key: str, params: dict | None = None) -> dict | None:
    url = f"{TMDB_BASE}{path}"
    p = {"api_key": api_key, **(params or {})}
    try:
        resp = requests.get(url, params=p, timeout=10)
        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", 10))
            print(f"  [rate limit] sleeping {retry_after}s...")
            time.sleep(retry_after)
            resp = requests.get(url, params=p, timeout=10)
        if resp.status_code != 200:
            return None
        return resp.json()
    except requests.RequestException as e:
        print(f"  [request error] {e}")
        return None


def best_match(results: list[dict], title: str, year: int | None) -> dict | None:
    """Pick the best TMDB search result for a given title+year."""
    if not results:
        return None

    title_lower = title.lower()

    # Score each result
    def score(r: dict) -> tuple:
        t = (r.get("title") or r.get("original_title") or "").lower()
        ry_str = (r.get("release_date") or "")[:4]
        ry = int(ry_str) if ry_str.isdigit() else None

        exact_title = t == title_lower
        year_match = year is not None and ry == year
        year_close = year is not None and ry is not None and abs(ry - year) <= 1
        popularity = r.get("popularity", 0)

        return (exact_title, year_match, year_close, popularity)

    results_sorted = sorted(results, key=score, reverse=True)
    top = results_sorted[0]

    # Reject if title is wildly different and year doesn't match
    top_title = (top.get("title") or top.get("original_title") or "").lower()
    top_year_str = (top.get("release_date") or "")[:4]
    top_year = int(top_year_str) if top_year_str.isdigit() else None

    if top_title != title_lower and (year is None or top_year != year):
        # Only accept if it's a close-enough match
        from difflib import SequenceMatcher
        ratio = SequenceMatcher(None, top_title, title_lower).ratio()
        if ratio < 0.6:
            return None

    return top


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def upsert_genre(conn: sqlite3.Connection, name: str, tmdb_id: int) -> int:
    row = conn.execute(
        "SELECT genre_id FROM genres WHERE tmdb_id = ?", (tmdb_id,)
    ).fetchone()
    if row:
        return row[0]
    conn.execute(
        "INSERT OR IGNORE INTO genres (name, tmdb_id) VALUES (?, ?)", (name, tmdb_id)
    )
    return conn.execute(
        "SELECT genre_id FROM genres WHERE tmdb_id = ?", (tmdb_id,)
    ).fetchone()[0]


def upsert_director(conn: sqlite3.Connection, name: str, tmdb_id: int) -> int:
    row = conn.execute(
        "SELECT director_id FROM directors WHERE tmdb_id = ?", (tmdb_id,)
    ).fetchone()
    if row:
        return row[0]
    conn.execute(
        "INSERT OR IGNORE INTO directors (name, tmdb_id) VALUES (?, ?)", (name, tmdb_id)
    )
    return conn.execute(
        "SELECT director_id FROM directors WHERE tmdb_id = ?", (tmdb_id,)
    ).fetchone()[0]


def upsert_actor(conn: sqlite3.Connection, name: str, tmdb_id: int, profile_path: str | None) -> int:
    row = conn.execute(
        "SELECT actor_id FROM actors WHERE tmdb_id = ?", (tmdb_id,)
    ).fetchone()
    if row:
        return row[0]
    conn.execute(
        "INSERT OR IGNORE INTO actors (name, tmdb_id, profile_path) VALUES (?, ?, ?)",
        (name, tmdb_id, profile_path),
    )
    return conn.execute(
        "SELECT actor_id FROM actors WHERE tmdb_id = ?", (tmdb_id,)
    ).fetchone()[0]


def merge_and_delete_duplicate(conn: sqlite3.Connection, keep_id: int, drop_id: int) -> None:
    """Move watch_history from drop_id to keep_id, then delete drop_id's film row."""
    # Only move watches that don't already have a watch for keep_id
    # (simple strategy: keep the richer watch entry)
    keep_watches = conn.execute(
        "SELECT COUNT(*) FROM watch_history WHERE film_id = ?", (keep_id,)
    ).fetchone()[0]

    if keep_watches == 0:
        conn.execute(
            "UPDATE watch_history SET film_id = ? WHERE film_id = ?", (keep_id, drop_id)
        )
    else:
        # Merge: if drop has a rating/review the keep doesn't, pull it over
        drop_watch = conn.execute(
            "SELECT rating, review_text, watch_date FROM watch_history WHERE film_id = ? LIMIT 1",
            (drop_id,),
        ).fetchone()
        keep_watch = conn.execute(
            "SELECT watch_id, rating, review_text, watch_date FROM watch_history WHERE film_id = ? LIMIT 1",
            (keep_id,),
        ).fetchone()
        if drop_watch and keep_watch:
            updates = {}
            if keep_watch[1] is None and drop_watch[0] is not None:
                updates["rating"] = drop_watch[0]
            if keep_watch[2] is None and drop_watch[1] is not None:
                updates["review_text"] = drop_watch[1]
            if keep_watch[3] is None and drop_watch[2] is not None:
                updates["watch_date"] = drop_watch[2]
            if updates:
                sets = ", ".join(f"{k} = ?" for k in updates)
                conn.execute(
                    f"UPDATE watch_history SET {sets} WHERE watch_id = ?",
                    (*updates.values(), keep_watch[0]),
                )
        conn.execute("DELETE FROM watch_history WHERE film_id = ?", (drop_id,))

    # Clear junction tables for drop_id
    conn.execute("DELETE FROM film_genres WHERE film_id = ?", (drop_id,))
    conn.execute("DELETE FROM film_directors WHERE film_id = ?", (drop_id,))
    conn.execute("DELETE FROM film_actors WHERE film_id = ?", (drop_id,))
    conn.execute("DELETE FROM films WHERE film_id = ?", (drop_id,))


# ---------------------------------------------------------------------------
# Main enrichment logic
# ---------------------------------------------------------------------------

def enrich(api_key: str, db_path: Path, limit: int | None, progress: dict) -> None:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    already_enriched = set(progress["enriched"])
    failed_ids = progress["failed"]

    # Films missing TMDB data (and not already processed)
    rows = conn.execute(
        "SELECT film_id, title, year FROM films WHERE tmdb_id IS NULL ORDER BY film_id"
    ).fetchall()

    todo = [r for r in rows if str(r["film_id"]) not in already_enriched]
    if limit:
        todo = todo[:limit]

    total = len(todo)
    print(f"Films to enrich: {total}  (skipping {len(already_enriched)} already done)\n")

    enriched_count = 0
    fail_count = 0

    for i, film_row in enumerate(todo, 1):
        film_id = film_row["film_id"]
        title = film_row["title"]
        year = film_row["year"]
        print(f"[{i}/{total}] {title} ({year or '?'})", end="  ", flush=True)

        try:
            # 1. Search TMDB
            search_data = tmdb_get(
                "/search/movie", api_key,
                {"query": title, "year": year or "", "include_adult": "false"}
            )
            time.sleep(REQUEST_DELAY)

            if not search_data or not search_data.get("results"):
                # Retry without year
                search_data = tmdb_get(
                    "/search/movie", api_key,
                    {"query": title, "include_adult": "false"}
                )
                time.sleep(REQUEST_DELAY)

            results = (search_data or {}).get("results", [])
            match = best_match(results, title, year)

            if not match:
                print("→ no match")
                failed_ids[str(film_id)] = "no TMDB match"
                fail_count += 1
                progress["failed"] = failed_ids
                save_progress(progress)
                continue

            tmdb_id = match["id"]

            # 2. Check for duplicate (another film already has this tmdb_id)
            existing = conn.execute(
                "SELECT film_id FROM films WHERE tmdb_id = ? AND film_id != ?",
                (tmdb_id, film_id),
            ).fetchone()
            if existing:
                keep_id = existing["film_id"]
                print(f"→ duplicate of film_id={keep_id}, merging...")
                merge_and_delete_duplicate(conn, keep_id, film_id)
                conn.commit()
                already_enriched.add(str(film_id))
                progress["enriched"] = list(already_enriched)
                save_progress(progress)
                continue

            # 3. Fetch full details + credits in one call
            details = tmdb_get(
                f"/movie/{tmdb_id}", api_key,
                {"append_to_response": "credits"}
            )
            time.sleep(REQUEST_DELAY)

            if not details:
                print("→ details fetch failed")
                failed_ids[str(film_id)] = "details fetch failed"
                fail_count += 1
                progress["failed"] = failed_ids
                save_progress(progress)
                continue

            # 4. Update films table
            conn.execute(
                """UPDATE films SET
                    tmdb_id = ?,
                    imdb_id = ?,
                    runtime_minutes = ?,
                    poster_path = ?,
                    overview = ?,
                    updated_at = CURRENT_TIMESTAMP
                   WHERE film_id = ?""",
                (
                    tmdb_id,
                    details.get("imdb_id"),
                    details.get("runtime"),
                    details.get("poster_path"),
                    details.get("overview"),
                    film_id,
                ),
            )

            # 5. Genres
            conn.execute("DELETE FROM film_genres WHERE film_id = ?", (film_id,))
            for genre in details.get("genres", []):
                genre_id = upsert_genre(conn, genre["name"], genre["id"])
                conn.execute(
                    "INSERT OR IGNORE INTO film_genres (film_id, genre_id) VALUES (?, ?)",
                    (film_id, genre_id),
                )

            # 6. Directors (from crew)
            conn.execute("DELETE FROM film_directors WHERE film_id = ?", (film_id,))
            credits = details.get("credits", {})
            for crew_member in credits.get("crew", []):
                if crew_member.get("job") == "Director":
                    dir_id = upsert_director(conn, crew_member["name"], crew_member["id"])
                    conn.execute(
                        "INSERT OR IGNORE INTO film_directors (film_id, director_id) VALUES (?, ?)",
                        (film_id, dir_id),
                    )

            # 7. Cast (top N billed)
            conn.execute("DELETE FROM film_actors WHERE film_id = ?", (film_id,))
            cast = sorted(credits.get("cast", []), key=lambda c: c.get("order", 999))
            for cast_member in cast[:MAX_CAST]:
                actor_id = upsert_actor(
                    conn,
                    cast_member["name"],
                    cast_member["id"],
                    cast_member.get("profile_path"),
                )
                conn.execute(
                    "INSERT OR IGNORE INTO film_actors (film_id, actor_id, billing_order) VALUES (?, ?, ?)",
                    (film_id, actor_id, cast_member.get("order")),
                )

            conn.commit()

            genres_str = ", ".join(g["name"] for g in details.get("genres", []))
            print(f"→ OK  [{genres_str}]")
            enriched_count += 1
            already_enriched.add(str(film_id))
            progress["enriched"] = list(already_enriched)
            save_progress(progress)

        except Exception as e:
            conn.rollback()
            print(f"→ ERROR: {e}")
            failed_ids[str(film_id)] = str(e)
            fail_count += 1
            progress["failed"] = failed_ids
            save_progress(progress)
            continue

    # Rebuild FTS after bulk enrichment
    print("\nRebuilding FTS index...")
    conn.execute("INSERT INTO films_fts(films_fts) VALUES('rebuild')")
    conn.commit()
    conn.close()

    print(f"\nDone. Enriched: {enriched_count}  Failed: {fail_count}")
    if failed_ids:
        print(f"Failed film IDs saved to {PROGRESS_FILE} — re-run to retry skipped ones")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Enrich films with TMDB metadata")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N films")
    parser.add_argument(
        "--reset-progress",
        action="store_true",
        help="Clear saved progress and start from scratch",
    )
    parser.add_argument("--db", type=Path, default=DB_PATH)
    args = parser.parse_args()

    api_key = load_api_key()

    if args.reset_progress and PROGRESS_FILE.exists():
        PROGRESS_FILE.unlink()
        print("Progress reset.\n")

    progress = load_progress()
    enrich(api_key, args.db, args.limit, progress)


if __name__ == "__main__":
    main()
