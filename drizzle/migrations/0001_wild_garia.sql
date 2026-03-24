CREATE TABLE `list_films` (
	`list_id` integer NOT NULL,
	`film_id` integer NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`list_id`, `film_id`),
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`list_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`film_id`) REFERENCES `films`(`film_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`list_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`film_count` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lists_slug_unique` ON `lists` (`slug`);