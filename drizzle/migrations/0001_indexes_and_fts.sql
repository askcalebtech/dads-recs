-- Performance indexes
CREATE INDEX IF NOT EXISTS `idx_films_title` ON `films` (`title`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_films_year` ON `films` (`year`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_films_tmdb_id` ON `films` (`tmdb_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_watch_history_film_id` ON `watch_history` (`film_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_watch_history_rating` ON `watch_history` (`rating`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_watch_history_watch_date` ON `watch_history` (`watch_date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_actors_name` ON `actors` (`name`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_directors_name` ON `directors` (`name`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_film_actors_actor_id` ON `film_actors` (`actor_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_film_directors_director_id` ON `film_directors` (`director_id`);--> statement-breakpoint
-- FTS5 virtual table for full-text title search
CREATE VIRTUAL TABLE IF NOT EXISTS `films_fts` USING fts5(
  title,
  content='films',
  content_rowid='film_id'
);--> statement-breakpoint
-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS `films_fts_insert` AFTER INSERT ON `films` BEGIN
  INSERT INTO `films_fts`(rowid, title) VALUES (new.film_id, new.title);
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `films_fts_delete` AFTER DELETE ON `films` BEGIN
  INSERT INTO `films_fts`(`films_fts`, rowid, title) VALUES ('delete', old.film_id, old.title);
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `films_fts_update` AFTER UPDATE ON `films` BEGIN
  INSERT INTO `films_fts`(`films_fts`, rowid, title) VALUES ('delete', old.film_id, old.title);
  INSERT INTO `films_fts`(rowid, title) VALUES (new.film_id, new.title);
END;
