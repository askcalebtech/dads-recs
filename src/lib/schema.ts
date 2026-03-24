import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const films = sqliteTable("films", {
  film_id: integer("film_id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  year: integer("year"),
  tmdb_id: integer("tmdb_id").unique(),
  imdb_id: text("imdb_id"),
  runtime_minutes: integer("runtime_minutes"),
  poster_path: text("poster_path"),
  overview: text("overview"),
  letterboxd_uri: text("letterboxd_uri"),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const directors = sqliteTable("directors", {
  director_id: integer("director_id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  tmdb_id: integer("tmdb_id").unique(),
});

export const actors = sqliteTable("actors", {
  actor_id: integer("actor_id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  tmdb_id: integer("tmdb_id").unique(),
  profile_path: text("profile_path"),
});

export const genres = sqliteTable("genres", {
  genre_id: integer("genre_id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  tmdb_id: integer("tmdb_id").unique(),
});

export const filmDirectors = sqliteTable(
  "film_directors",
  {
    film_id: integer("film_id")
      .notNull()
      .references(() => films.film_id),
    director_id: integer("director_id")
      .notNull()
      .references(() => directors.director_id),
  },
  (t) => [primaryKey({ columns: [t.film_id, t.director_id] })]
);

export const filmActors = sqliteTable(
  "film_actors",
  {
    film_id: integer("film_id")
      .notNull()
      .references(() => films.film_id),
    actor_id: integer("actor_id")
      .notNull()
      .references(() => actors.actor_id),
    billing_order: integer("billing_order"),
  },
  (t) => [primaryKey({ columns: [t.film_id, t.actor_id] })]
);

export const filmGenres = sqliteTable(
  "film_genres",
  {
    film_id: integer("film_id")
      .notNull()
      .references(() => films.film_id),
    genre_id: integer("genre_id")
      .notNull()
      .references(() => genres.genre_id),
  },
  (t) => [primaryKey({ columns: [t.film_id, t.genre_id] })]
);

export const lists = sqliteTable("lists", {
  list_id: integer("list_id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  display_name: text("display_name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "yearly" | "franchise" | "director" | "other"
  sort_order: integer("sort_order").default(0),
  film_count: integer("film_count").default(0),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const listFilms = sqliteTable(
  "list_films",
  {
    list_id: integer("list_id")
      .notNull()
      .references(() => lists.list_id),
    film_id: integer("film_id")
      .notNull()
      .references(() => films.film_id),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.list_id, t.film_id] })]
);

export const watchHistory = sqliteTable("watch_history", {
  watch_id: integer("watch_id").primaryKey({ autoIncrement: true }),
  film_id: integer("film_id")
    .notNull()
    .references(() => films.film_id),
  rating: real("rating"),
  watch_date: text("watch_date"),
  rewatch: integer("rewatch").default(0),
  review_text: text("review_text"),
  logged_date: text("logged_date"),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});
