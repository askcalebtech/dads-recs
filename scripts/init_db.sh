#!/usr/bin/env bash
# Initialize the SQLite database from scratch.
# Run from project root: bash scripts/init_db.sh

set -e

DB_PATH="dads-recs.db"

echo "Running Drizzle migrations..."
npx drizzle-kit migrate

echo "Applying FTS5 indexes..."
sqlite3 "$DB_PATH" < drizzle/migrations/0001_indexes_and_fts.sql

echo "Database ready at $DB_PATH"
