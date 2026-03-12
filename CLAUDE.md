# Dad's Recs

A personal film recommendation site built around a Letterboxd viewing history. The site is a living database of every movie the owner has seen, designed for his kids to search, browse, and discover what Dad thought about any given film.

## Project Purpose

This is both a personal tool and a portfolio project for a Data Engineer (6+ years, Python/Spark/AWS). The goal is to be **frontend-heavy** while still demonstrating a clear data engineering angle (ingestion pipeline, data normalization, metadata enrichment). A companion portfolio project (NFL QB Personnel Matchup Analysis) already showcases Spark, dbt, Airflow — this project should NOT duplicate those tools.

## Core Use Cases

1. **Search by title**: Kid watches a movie, wants to know if Dad has seen it and what he thought.
2. **Filtered discovery**: Kid wants to find, e.g., horror movies from 1980–2000 rated 3+ stars, sorted by highest rated.
3. **Browse analytics**: Explore Dad's viewing stats — top genres, favorite directors, ratings trends, etc.

**Search is the #1 feature. It must be fast, intuitive, and polished.** Analytics dashboards are secondary.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js (App Router) | Full-stack: React frontend + API routes |
| Language | TypeScript | Strict mode |
| Database | SQLite | Single-user, ~5,000 films. File lives in project. |
| ORM | Drizzle ORM | Type-safe, SQL-like, lightweight |
| Styling | Tailwind CSS + shadcn/ui | Utility-first + polished component library |
| Charts | Recharts | For standard analytics charts |
| Data Pipeline | Python scripts (standalone) | CSV parsing, TMDB enrichment, SQLite loading |
| Deployment | Vercel | Single deployment target |

## Architecture Decisions

- **No separate backend.** Next.js API routes handle all data access. No FastAPI, no Express.
- **No ORM for analytics queries.** Use raw SQL (via Drizzle's `sql` template tag) for complex aggregations. Drizzle for CRUD.
- **No dbt, no Prefect, no Airflow.** Aggregations are SQL views or queries. Enrichment is a Python script run manually.
- **SQLite is the production database.** At this scale (~5k films, ~50k relationships), SQLite is faster than network-round-tripping to a hosted Postgres. The DB file is part of the deployment.
- **TMDB is the canonical metadata source.** Use tmdb_id as the primary external identifier. Store imdb_id for linking out to IMDb.

## Data Model

### Core Tables

**films**
- film_id (PK, integer autoincrement)
- title (text, not null)
- year (integer)
- tmdb_id (integer, unique)
- imdb_id (text)
- runtime_minutes (integer)
- poster_path (text) — TMDB poster path
- overview (text) — short synopsis
- letterboxd_uri (text) — link back to Letterboxd page
- created_at (timestamp)
- updated_at (timestamp)

**directors**
- director_id (PK, integer autoincrement)
- name (text, not null)
- tmdb_id (integer, unique)

**actors**
- actor_id (PK, integer autoincrement)
- name (text, not null)
- tmdb_id (integer, unique)
- profile_path (text) — TMDB headshot path

**genres**
- genre_id (PK, integer autoincrement)
- name (text, not null, unique)
- tmdb_id (integer, unique)

### Junction Tables

**film_directors** — film_id, director_id (composite PK)

**film_actors** — film_id, actor_id, billing_order (integer)

**film_genres** — film_id, genre_id (composite PK)

### Watch Data

**watch_history**
- watch_id (PK, integer autoincrement)
- film_id (FK → films)
- rating (real) — Letterboxd uses 0.5–5.0 scale in 0.5 increments
- watch_date (text) — ISO 8601 date string
- rewatch (integer) — boolean 0/1
- review_text (text, nullable)
- logged_date (text) — when it was logged on Letterboxd
- created_at (timestamp)

### Indexes

Create indexes on:
- films(title) — for search
- films(year) — for filtering
- films(tmdb_id) — for enrichment lookups
- watch_history(film_id) — for joins
- watch_history(rating) — for filtering
- watch_history(watch_date) — for sorting/filtering
- actors(name) — for search
- directors(name) — for search
- film_actors(actor_id) — for reverse lookups
- film_directors(director_id) — for reverse lookups

Also create an FTS5 virtual table on films(title) for fast full-text search.

## Pages & Routes

### / (Home)
- Hero section with app name, brief description
- Prominent search bar (this is the main entry point)
- Quick stats (total films watched, average rating, etc.)
- Recent watches or featured picks

### /search
- Full search interface with text input + filters
- Filters: genre (multi-select), year range, rating range, director, decade
- Sort options: rating (high/low), year (new/old), watch date (recent/oldest), title (A-Z)
- Results displayed as film cards (poster, title, year, rating, genres)
- Responsive grid layout
- URL query params for shareable/bookmarkable searches

### /film/[id]
- Film detail page
- Poster, title, year, runtime, genres
- Dad's rating (displayed prominently with stars)
- Dad's review (if exists)
- Director(s) and cast
- Links: IMDb, Letterboxd, TMDB
- Watch date and rewatch indicator

### /analytics
- Dashboard with charts:
  - Rating distribution (histogram)
  - Films watched per year/month (bar or line)
  - Top 10 directors by average rating (min 3 films)
  - Top 10 actors by appearances
  - Genre breakdown (pie or treemap)
  - Average rating by genre (horizontal bar)
  - Decade distribution
- All charts should be interactive (tooltips, clickable to filter)

### /about
- Brief explanation of what the site is and who it's for

## Search Implementation Details

Search is the centerpiece. It should feel instant and forgiving.

- Use SQLite FTS5 for full-text title search
- Support partial matching / prefix matching
- Debounced input (300ms) with loading indicator
- Show results as user types (autocomplete/suggestion style for quick lookups)
- Combined text search + structured filters should work together
- Empty state should be helpful ("No films found matching...")
- Consider: a "quick search" modal (Cmd+K style) accessible from any page

## Data Pipeline (Python Scripts)

Located in a `/scripts` directory at project root.

### ingest_letterboxd.py
- Reads Letterboxd CSV export (diary.csv, ratings.csv, watched.csv)
- Normalizes data, deduplicates
- Inserts into SQLite
- Idempotent: safe to re-run

### enrich_tmdb.py
- Reads films table, finds entries missing TMDB metadata
- Calls TMDB API (search by title+year, then fetch details)
- Populates: tmdb_id, imdb_id, runtime, poster_path, overview, genres, cast, directors
- Rate-limit aware (TMDB allows ~40 requests/10 seconds)
- Saves progress so it can resume after interruption
- Requires TMDB_API_KEY environment variable

### Scripts should:
- Use a shared db connection utility
- Print clear progress output
- Handle errors gracefully (log and continue, don't crash on one bad film)
- Be runnable with: `python scripts/ingest_letterboxd.py` and `python scripts/enrich_tmdb.py`

## UI/UX Guidelines

- **Dark theme** — fits the cinema aesthetic. Dark background, light text, accent colors for ratings/genres.
- **Film posters are the primary visual element.** Use TMDB poster images wherever possible.
- **Star ratings should be visually prominent** — use filled/half/empty star icons, not just numbers.
- **Responsive design** — must work well on mobile (the kids will use their phones).
- **Fast.** No unnecessary loading spinners. Search should feel instant for a ~5k film dataset.
- **Genre tags should be color-coded** for visual scanning.

## File Structure

```
dads-recs/
├── CLAUDE.md
├── scripts/
│   ├── ingest_letterboxd.py
│   ├── enrich_tmdb.py
│   ├── requirements.txt        # Python deps (requests, etc.)
│   └── data/                   # Place Letterboxd CSV exports here
│       └── .gitkeep
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Home
│   │   ├── search/
│   │   │   └── page.tsx        # Search page
│   │   ├── film/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Film detail
│   │   ├── analytics/
│   │   │   └── page.tsx        # Analytics dashboard
│   │   ├── about/
│   │   │   └── page.tsx        # About page
│   │   ├── api/                # API routes
│   │   │   ├── films/
│   │   │   ├── search/
│   │   │   └── analytics/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── search/             # Search-related components
│   │   ├── film/               # Film card, film detail components
│   │   ├── analytics/          # Chart components
│   │   └── layout/             # Header, footer, navigation
│   ├── lib/
│   │   ├── db.ts               # Drizzle client + SQLite connection
│   │   ├── schema.ts           # Drizzle schema definitions
│   │   └── utils.ts            # Shared utilities
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── drizzle/
│   └── migrations/             # Drizzle migration files
├── public/
│   └── ...                     # Static assets
├── dads-recs.db                # SQLite database file (gitignored in prod, or committed if small)
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local                  # TMDB_API_KEY, etc.
```

## Environment Variables

```
TMDB_API_KEY=           # Required for enrichment script
NEXT_PUBLIC_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p  # For poster URLs
```

## Important Constraints

- **Single user. No auth. No multi-tenancy.** This is a personal site.
- **Read-heavy.** The only writes happen during data ingestion (run locally). The deployed app is read-only.
- **SQLite file is part of deployment.** On Vercel, this means it's bundled at build time. Data updates require a redeploy.
- **TMDB images are loaded via their CDN** (https://image.tmdb.org/t/p/w500/...). Don't download and store poster images locally.
- **Letterboxd CSV is the source of truth** for what films were watched and ratings. TMDB is the source of truth for metadata.

## Implementation Order

1. **Project scaffolding**: Next.js + TypeScript + Tailwind + shadcn/ui + Drizzle + SQLite
2. **Database schema**: Define Drizzle schema, run migrations, verify tables
3. **Python ingestion script**: Parse Letterboxd CSV → populate SQLite
4. **Python enrichment script**: TMDB API → fill in metadata, genres, cast, directors
5. **API routes**: /api/search, /api/films/[id], /api/analytics/*
6. **Search page**: The hero feature — get this right before anything else
7. **Film detail page**: Individual film view
8. **Home page**: Search bar + quick stats + recent watches
9. **Analytics page**: Charts and visualizations
10. **About page**: Simple info page
11. **Polish**: Responsive design, loading states, error handling, dark theme refinement
12. **Deploy to Vercel**
