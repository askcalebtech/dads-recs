help:
	@echo "run-ingestion - Auto-detects the latest export folder in scripts/data/"
	@echo "run-enrichment - Fills in posters, cast, genres, etc. for any new films"
	@echo "run-lists     - Ingests Letterboxd list CSVs from scripts/data/lists/"
	@echo "run-etl       - Runs both run-ingestion and run-enrichment"

run-ingestion:
	python3 scripts/ingest_letterboxd.py

run-lists:
	python3 scripts/ingest_lists.py

run-enrichment:
	python3 scripts/enrich_tmdb.py

run-etl:
	make run-ingestion
	make run-lists
	make run-enrichment