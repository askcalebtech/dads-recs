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

---

## Lists Feature

### Overview

Dad's Recs now includes a curated lists page. These are imported from Letterboxd list CSV exports and displayed as visual, clickable tiles — similar to how Letterboxd displays lists on a user's profile.

### Data Source

Letterboxd list CSVs are exported separately from the main diary/ratings export. Each list CSV contains at minimum:
- Position (integer — the rank)
- Name (film title)
- Year (release year)
- Letterboxd URI

The films in these lists should already exist in the `films` table from the main ingestion pipeline. The list data just tracks membership and ranking.

### Lists to Support

**Yearly Rankings** (dynamic — pattern-matched):
- `movies-of-2010-ranked.csv` through `movies-of-2026-ranked.csv`
- New years will be added going forward. The system should auto-detect any file matching the pattern `movies-of-YYYY-ranked.csv`.

**Franchise Rankings**:
- `mcu-ranked.csv`
- `star-wars-ranked.csv`
- `alien-ranked.csv`
- `predator-ranked.csv`
- `dc-ranked.csv`
- `spider-man-ranked.csv`
- `pixar-ranked.csv`
- `mission-impossible-ranked.csv`

**Director Rankings**:
- `christopher-nolan-ranked.csv`
- `denis-villeneuve-ranked.csv`
- `tarantino-ranked.csv`
- `edgar-wright-ranked.csv`
- `david-fincher-ranked.csv`

**Other**:
- `31-years-31-movies.csv` — Title/count changes yearly (e.g., "32 Years 32 Movies" next year). Store the display name from the list metadata, not the filename.

### Data Model Addition

**lists**
- list_id (PK, integer autoincrement)
- slug (text, unique, not null) — URL-friendly identifier, derived from filename (e.g., "mcu-ranked", "movies-of-2024-ranked")
- display_name (text, not null) — human-readable name (e.g., "MCU Ranked", "Movies of 2024, Ranked")
- description (text, nullable) — optional list description from Letterboxd
- category (text, not null) — one of: "yearly", "franchise", "director", "other"
- sort_order (integer) — controls display order within category
- film_count (integer) — total films in the list
- created_at (timestamp)
- updated_at (timestamp)

**list_films**
- list_id (FK → lists)
- film_id (FK → films)
- position (integer, not null) — rank within the list (1 = top)
- Composite PK: (list_id, film_id)

Index on: list_films(list_id, position) for ordered retrieval.

### Display Name Derivation

The ingestion script should derive `display_name` from the filename using these rules:
- `movies-of-YYYY-ranked.csv` → "Movies of YYYY, Ranked"
- `mcu-ranked.csv` → "MCU Ranked"
- `star-wars-ranked.csv` → "Star Wars Ranked"
- `31-years-31-movies.csv` → "31 Years 31 Movies"
- General pattern: replace hyphens with spaces, title-case, drop `.csv`
- Allow manual override via an optional `list_metadata.json` file in `scripts/data/lists/` for custom display names or descriptions.

### Python Script Addition

**scripts/ingest_lists.py**
- Reads all CSV files from `scripts/data/lists/`
- Auto-categorizes based on filename patterns:
  - Matches `movies-of-\d{4}-ranked` → category "yearly"
  - Matches known franchise slugs → category "franchise"
  - Matches known director slugs → category "director"
  - Everything else → category "other"
- For each list CSV:
  - Creates or updates the list record
  - Matches each film to the `films` table by title + year (or Letterboxd URI if available)
  - Inserts list_films with position
- Logs warnings for any films that can't be matched (they may not be in the main watch history)
- Idempotent: safe to re-run
- Run with: `python scripts/ingest_lists.py`

Films that appear in lists but NOT in the main watch history should still be handled. The script should:
1. First try to match by Letterboxd URI
2. Then try title + year match
3. If no match, create a stub entry in the films table (title + year only, flagged for TMDB enrichment)

### Page & Routes

#### /lists
- Page title: "Dad's Lists"
- Lists displayed as a grid of clickable tiles, grouped by category
- Category sections in order: Yearly Rankings, Franchise Rankings, Director Rankings, Other
- Yearly rankings should be sorted by year descending (most recent first)
- Other categories sorted by the `sort_order` field

**Tile design:**
- Each tile shows:
  - The list display_name
  - Film count (e.g., "24 films")
  - A 2×2 grid of the first 4 film posters as a visual preview
- If fewer than 4 films, fill remaining slots with a dark placeholder
- Tiles link to `/lists/[slug]`
- Hover effect: subtle scale or brightness shift

#### /lists/[slug]
- Full list view
- List display_name as page title
- Description (if exists) below title
- Films displayed in ranked order (position 1 at top)
- Each film row/card shows: rank number, poster, title, year, Dad's rating (if rated), genres
- Clicking a film goes to `/film/[id]`
- Consider a toggle between "list view" (compact, numbered) and "grid view" (poster cards)

### API Routes

**GET /api/lists**
- Returns all lists with their first 4 films (for tile previews)
- Grouped by category
- Include poster_path for preview films

**GET /api/lists/[slug]**
- Returns full list detail with all films in position order
- Include film metadata: title, year, poster_path, rating, genres, runtime

### UI Notes

- List tiles should match the dark cinema theme
- The 2×2 poster preview grid is the primary visual element of each tile — make it prominent
- On mobile, tiles should be full-width or 2-column
- The /lists page should feel like browsing a collection, not reading a table
- Yearly rankings section could optionally display as a horizontal scrollable row instead of a grid, since there will be many of them (17+ and growing)

### File Structure Addition

```
scripts/
├── data/
│   └── lists/                    # Place Letterboxd list CSV exports here
│       ├── movies-of-2024-ranked.csv
│       ├── mcu-ranked.csv
│       ├── ...
│       └── list_metadata.json    # Optional: custom display names/descriptions
├── ingest_lists.py
```

```
src/
├── app/
│   ├── lists/
│   │   ├── page.tsx              # Lists overview with tiles
│   │   └── [slug]/
│   │       └── page.tsx          # Individual list view
│   ├── api/
│   │   └── lists/
│   │       ├── route.ts          # GET all lists with previews
│   │       └── [slug]/
│   │           └── route.ts      # GET single list detail
├── components/
│   └── lists/                    # List tile, list grid, list detail components
```

### Implementation Order (for this feature)

1. Add `lists` and `list_films` tables to the Drizzle schema + run migration
2. Build `ingest_lists.py` script
3. Build API routes: /api/lists and /api/lists/[slug]
4. Build /lists page with tile grid
5. Build /lists/[slug] detail page
6. Add "Lists" link to site navigation
7. Test with actual Letterboxd list exports

### Navigation Update

Add "Lists" to the site header navigation, between "Search" and "Analytics" (or wherever feels natural).
