# Dad's Recs

A personal film database and recommendation site built around a Letterboxd viewing history. Search, browse, and discover what Dad thought about any film he's seen — built for his kids, designed as a portfolio project.

**Live site:** [dads-recs.vercel.app](https://dads-recs.vercel.app/)

---

## What It Is

Dad's Recs is a full-stack web app that turns a Letterboxd CSV export into a searchable, filterable film database. The core use case is simple: a kid watches something and wants to know if Dad has seen it and what he thought. Search is the hero feature.

Beyond search, the site includes:
- **Filtered browsing** — genre, year range, decade, minimum rating, director
- **Curated lists** — yearly rankings and franchise/director rankings imported from Letterboxd
- **Analytics dashboard** — rating distributions, top directors, genre breakdowns, decade trends
- **Film detail pages** — poster, synopsis, cast, Dad's rating and review, links to IMDb/Letterboxd

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Database | SQLite via `better-sqlite3` |
| ORM / schema | Drizzle ORM |
| Styling | Tailwind CSS v4 + base-ui |
| Charts | Recharts |
| Data pipeline | Python 3 (stdlib + `requests`) |
| Deployment | Vercel |

**Why SQLite?** At ~800 films and ~50k relationships, a file-based database outperforms a network-round-trip to hosted Postgres for every server component render. The DB is committed to the repo and bundled at build time — Vercel's read-only filesystem is a feature here, not a constraint.

---

## Architecture

```
Letterboxd CSV export
        │
        ▼
ingest_letterboxd.py   ← normalizes watch history, ratings, reviews
        │
        ▼
    SQLite DB  ──── enrich_tmdb.py  ← adds posters, cast, genres, runtime
        │                └── TMDB API (rate-limited, resumable)
        │
        ▼
  Next.js build         ← DB bundled into serverless function output
        │
        ▼
  Vercel deploy         ← all data reads are synchronous SQLite queries
```

Server components query SQLite directly and synchronously — no API round-trips for page renders. Client components hit `/api/*` routes for interactive search and filtering.

---

## Data Engineering

This project's interesting engineering is in the Python pipeline that transforms raw Letterboxd exports into a normalized, enriched database. A few non-obvious problems worth calling out:

### Cross-file URI mismatch in Letterboxd exports

Letterboxd's CSV export splits data across multiple files (`watched.csv`, `diary.csv`, `ratings.csv`, `reviews.csv`). The natural join key is the Letterboxd URI — but the same film gets a **different short URI in each file**. For example, *First Reformed* might appear as `boxd.it/go9C` in `watched.csv` and `boxd.it/4v9bS3` in `diary.csv`.

A URI-only join silently drops all rewatch flags, watch dates, and reviews. The fix was building a secondary index keyed by `(title.lower(), year)` for each file and falling back to it when the URI lookup misses:

```python
diary_entries = diary_by_uri.get(uri) or diary_by_title_year.get((title.lower(), year), [])
```

The same mismatch caused duplicate film records: the "include diary films not in watched" loop used `if uri not in films` — which always passed for diary URIs, creating a second DB row for the same film. Fixed by checking `(title, year)` before inserting.

### TMDB enrichment: matching, deduplication, and resumability

The enrichment script needs to reliably match ~800 free-text film titles to TMDB records. Naive title search fails for foreign-language films, disambiguation (multiple films share a title), and year-off-by-one cases (festival year vs. release year).

The matching strategy scores each TMDB result on four signals — exact title, year match, year within 1, and TMDB popularity — then applies a fuzzy string similarity threshold to reject poor matches rather than silently picking the wrong film.

Because TMDB enrichment takes ~5 minutes for a full run, the script tracks completed and failed film IDs in a JSON progress file. Interruptions are safe: re-running skips already-enriched films and retries failures. When a TMDB ID collision is detected (two DB rows matched to the same film), the script merges watch data onto the canonical record and deletes the duplicate.

### FTS5 full-text search

Search is the primary feature and needs to feel instant. The app uses SQLite's FTS5 virtual table on the `films.title` column, with prefix-match queries built from user input:

```sql
SELECT rowid FROM films_fts WHERE films_fts MATCH '"first"* "refo"*'
```

Each search word is quoted (escaping FTS5 special characters) and suffixed with `*` for prefix matching. This gives sub-millisecond results on the full dataset with debounced input at 300ms — fast enough to feel like autocomplete.

### Deploying SQLite on Vercel

Vercel's serverless functions run on a read-only filesystem and use static output file tracing to determine which files each function needs. Since the DB path is a dynamic string (`process.cwd() + "/dads-recs.db"`), the tracer can't detect it automatically — the DB wouldn't exist at runtime even though it's in the repo.

Fix: `outputFileTracingIncludes` in `next.config.ts` explicitly adds the DB to every function's bundle. Additionally, `better-sqlite3` is a native Node.js addon that must be compiled for Linux during the Vercel build (not shipped as a macOS binary from the developer's machine).

---

## Running from Scratch

### Prerequisites

- Node.js 20+
- Python 3.9+
- A [TMDB API key](https://developer.themoviedb.org/docs/getting-started) (free)
- A Letterboxd account with data to export

### 1. Clone and install

```bash
git clone https://github.com/your-username/dads-recs.git
cd dads-recs
npm install
pip install -r scripts/requirements.txt
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Add your TMDB_API_KEY to .env.local
```

### 3. Initialize the database

```bash
npm run db:migrate
```

### 4. Export from Letterboxd

Go to **letterboxd.com → Settings → Import & Export → Export your data**. Download and unzip the export into `scripts/data/`. The scripts auto-detect the latest export folder.

For lists (yearly rankings, franchises, etc.), place Letterboxd list CSV exports in the `lists/` subfolder inside your export directory.

### 5. Run the data pipeline

```bash
make run-etl      # ingest Letterboxd CSVs + enrich with TMDB metadata
```

Or individually:

```bash
make run-ingestion   # Letterboxd CSVs → SQLite (idempotent)
make run-lists       # list CSVs → lists + list_films tables (idempotent)
make run-enrichment  # TMDB API → posters, cast, genres, runtime (resumable)
```

Enrichment runs at ~3.8 req/sec to stay under TMDB's rate limit. For ~800 films expect around 5–6 minutes. Progress is saved automatically — interrupt and re-run safely.

### 6. Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

### Updating data later

Export new data from Letterboxd, drop it in `scripts/data/`, and re-run the pipeline. Everything is idempotent. After running, commit the updated `dads-recs.db` and push — Vercel picks up the new data on the next deploy.

---

## Project Structure

```
dads-recs/
├── scripts/
│   ├── ingest_letterboxd.py   # Letterboxd CSV → SQLite (watch history, ratings, reviews)
│   ├── ingest_lists.py        # Letterboxd list CSVs → lists + list_films tables
│   ├── enrich_tmdb.py         # TMDB API → posters, cast, genres, runtime
│   ├── check-db.mjs           # Pre-build DB sanity check (runs on Vercel)
│   └── data/                  # Place Letterboxd exports here (gitignored)
├── src/
│   ├── app/                   # Next.js App Router — pages and API routes
│   │   ├── page.tsx           # Home
│   │   ├── search/            # Search page (debounced, filterable, URL-synced)
│   │   ├── film/[id]/         # Film detail
│   │   ├── lists/             # List overview + individual list pages
│   │   ├── analytics/         # Stats dashboard
│   │   └── api/               # Search, film, and list API routes
│   ├── components/
│   │   ├── film/              # FilmCard, FilmDetail
│   │   ├── search/            # FilterPanel
│   │   ├── lists/             # ListTile, ListDetailClient
│   │   ├── analytics/         # Recharts chart components
│   │   └── layout/            # Header, navigation
│   └── lib/
│       ├── db.ts              # better-sqlite3 client
│       └── schema.ts          # Drizzle schema
├── drizzle/                   # Generated migrations
├── dads-recs.db               # SQLite database (committed, bundled at build time)
├── Makefile                   # ETL shortcuts
└── vercel.json                # Build command override
```

---

## Data Model

The schema separates watch data from film metadata, allowing a film to be watched multiple times (rewatches) and supporting multiple directors, actors, and genres per film through junction tables.

```
films ──< film_genres >── genres
     ──< film_directors >── directors
     ──< film_actors >── actors
     ──< watch_history        (rating, watch_date, rewatch, review_text)
     ──< list_films >── lists
```

`films` stores metadata sourced from TMDB (poster, overview, runtime, cast, genres) with the Letterboxd URI as an external reference. `watch_history` is the source of truth for ratings and reviews, keyed from the Letterboxd export. `lists` and `list_films` support ranked, curated collections with a slug-based URL scheme.
