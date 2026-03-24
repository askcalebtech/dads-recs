CREATE TABLE `actors` (
	`actor_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tmdb_id` integer,
	`profile_path` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `actors_tmdb_id_unique` ON `actors` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `directors` (
	`director_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tmdb_id` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `directors_tmdb_id_unique` ON `directors` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `film_actors` (
	`film_id` integer NOT NULL,
	`actor_id` integer NOT NULL,
	`billing_order` integer,
	PRIMARY KEY(`film_id`, `actor_id`),
	FOREIGN KEY (`film_id`) REFERENCES `films`(`film_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `actors`(`actor_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `film_directors` (
	`film_id` integer NOT NULL,
	`director_id` integer NOT NULL,
	PRIMARY KEY(`film_id`, `director_id`),
	FOREIGN KEY (`film_id`) REFERENCES `films`(`film_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`director_id`) REFERENCES `directors`(`director_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `film_genres` (
	`film_id` integer NOT NULL,
	`genre_id` integer NOT NULL,
	PRIMARY KEY(`film_id`, `genre_id`),
	FOREIGN KEY (`film_id`) REFERENCES `films`(`film_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`genre_id`) REFERENCES `genres`(`genre_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `films` (
	`film_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`tmdb_id` integer,
	`imdb_id` text,
	`runtime_minutes` integer,
	`poster_path` text,
	`overview` text,
	`letterboxd_uri` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `films_tmdb_id_unique` ON `films` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `genres` (
	`genre_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tmdb_id` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `genres_name_unique` ON `genres` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `genres_tmdb_id_unique` ON `genres` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `watch_history` (
	`watch_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`film_id` integer NOT NULL,
	`rating` real,
	`watch_date` text,
	`rewatch` integer DEFAULT 0,
	`review_text` text,
	`logged_date` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`film_id`) REFERENCES `films`(`film_id`) ON UPDATE no action ON DELETE no action
);
