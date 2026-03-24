# Dad's Recs

A personal film recommendation site built around a Letterboxd viewing history. Search, browse, and discover what Dad thought about any film he's seen.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Updating the Data

When Dad exports new data from Letterboxd, follow these steps to ingest it into the database.

### 1. Export from Letterboxd

Go to **letterboxd.com → Settings → Import & Export → Export your data**. Download and unzip the export into `scripts/data/`.

### 2. Install Python dependencies (first time only)

```bash
pip install -r scripts/requirements.txt
```

### 3. Run the ETL pipeline

Run ingestion and enrichment together:

```bash
make run-etl
```

Or run each step individually:

```bash
make run-ingestion   # Parse Letterboxd CSVs → populate SQLite
make run-enrichment  # Fetch posters, cast, genres from TMDB
make run-lists       # Ingest Letterboxd list CSVs from scripts/data/lists/
```

**Ingestion** auto-detects the latest export folder in `scripts/data/`. It is idempotent — safe to re-run.

**Enrichment** skips already-enriched films and resumes from where it left off if interrupted. Requires `TMDB_API_KEY` in `.env.local`.

### 4. Redeploy

The SQLite database is bundled at build time. After updating the data, push to git and Vercel will pick up the new data on the next deploy.

## Project Structure

```
dads-recs/
├── scripts/              # Python data pipeline
│   ├── ingest_letterboxd.py
│   ├── enrich_tmdb.py
│   └── data/             # Place Letterboxd CSV exports here
├── src/
│   ├── app/              # Next.js App Router (pages + API routes)
│   ├── components/       # React components
│   └── lib/              # DB client, schema, utilities
├── drizzle/              # DB migrations
├── dads-recs.db          # SQLite database
└── Makefile              # ETL shortcuts
```
