import Link from "next/link";
import { Film, Star, Eye, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { sqlite } from "@/lib/db";
import { FilmCard } from "@/components/film/FilmCard";
import { HomeSearch } from "@/components/home/HomeSearch";

export const metadata: Metadata = {
  title: "Dad's Recs — Every movie Dad has seen, rated, and reviewed",
  description:
    "Browse and search every film Dad has watched on Letterboxd. Find out what he thought before you watch.",
};

// ─── Data fetching ────────────────────────────────────────────────────────────

function getStats() {
  return sqlite
    .prepare(
      `SELECT
         COUNT(DISTINCT f.film_id)                              AS total_films,
         ROUND(AVG(wh.rating), 2)                               AS avg_rating,
         COUNT(CASE WHEN wh.rating >= 4.0 THEN 1 END)           AS highly_rated,
         COUNT(CASE WHEN wh.rewatch = 1 THEN 1 END)             AS rewatch_count
       FROM films f
       JOIN watch_history wh ON wh.film_id = f.film_id`
    )
    .get() as {
    total_films: number;
    avg_rating: number | null;
    highly_rated: number;
    rewatch_count: number;
  };
}

type RecentFilm = {
  film_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  rating: number | null;
  rewatch: number;
  genres: string;
  directors: string;
};

function getRecentWatches(limit = 12) {
  return sqlite
    .prepare(
      `SELECT
         f.film_id, f.title, f.year, f.poster_path,
         wh.rating, wh.rewatch,
         GROUP_CONCAT(DISTINCT g.name)  AS genres,
         GROUP_CONCAT(DISTINCT d.name)  AS directors
       FROM films f
       JOIN watch_history wh ON wh.film_id = f.film_id
       LEFT JOIN film_genres  fg ON fg.film_id  = f.film_id
       LEFT JOIN genres        g  ON g.genre_id  = fg.genre_id
       LEFT JOIN film_directors fd ON fd.film_id = f.film_id
       LEFT JOIN directors      d  ON d.director_id = fd.director_id
       WHERE wh.watch_date IS NOT NULL
       GROUP BY f.film_id
       ORDER BY wh.watch_date DESC
       LIMIT ?`
    )
    .all(limit) as RecentFilm[];
}

function getHighlightedPick() {
  // Most recent first-time watch rated 4.5 stars or above
  return sqlite
    .prepare(
      `SELECT
         f.film_id, f.title, f.year, f.poster_path,
         wh.rating, wh.review_text, wh.watch_date,
         GROUP_CONCAT(DISTINCT g.name) AS genres,
         GROUP_CONCAT(DISTINCT d.name) AS directors
       FROM films f
       JOIN watch_history wh ON wh.film_id = f.film_id
       LEFT JOIN film_genres  fg ON fg.film_id  = f.film_id
       LEFT JOIN genres        g  ON g.genre_id  = fg.genre_id
       LEFT JOIN film_directors fd ON fd.film_id = f.film_id
       LEFT JOIN directors      d  ON d.director_id = fd.director_id
       WHERE wh.rating >= 4.5 AND wh.rewatch = 0
       GROUP BY f.film_id
       ORDER BY wh.watch_date DESC
       LIMIT 1`
    )
    .get() as
    | (RecentFilm & { review_text: string | null; watch_date: string })
    | undefined;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const stats = getStats();
  const recentWatches = getRecentWatches();
  const pick = getHighlightedPick();

  const statCards = [
    {
      icon: Eye,
      label: "Films watched",
      value: stats.total_films.toLocaleString(),
    },
    {
      icon: Star,
      label: "Avg. rating",
      value: stats.avg_rating ? `${stats.avg_rating.toFixed(1)} / 5` : "—",
    },
    {
      icon: TrendingUp,
      label: "Rated 4★ or higher",
      value: stats.highly_rated.toLocaleString(),
    },
    {
      icon: Film,
      label: "Rewatches",
      value: stats.rewatch_count.toLocaleString(),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center pt-16 pb-12 gap-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary uppercase tracking-wider">
          <Film className="h-3 w-3" />
          Dad&apos;s movie diary
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          Every film Dad has{" "}
          <span className="text-primary">watched &amp; rated</span>
        </h1>

        <p className="max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          Search {stats.total_films.toLocaleString()} films to find out what Dad
          thought before you hit play.
        </p>

        {/* Search bar — client component for navigation */}
        <HomeSearch />

        <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
          <span>Try:</span>
          {["Inception", "Horror", "Christopher Nolan", "1990s"].map((s) => (
            <Link
              key={s}
              href={`/search?q=${encodeURIComponent(s)}`}
              className="rounded-full border border-border px-3 py-0.5 hover:border-primary/50 hover:text-foreground transition-colors"
            >
              {s}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-12">
        {statCards.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4"
          >
            <Icon className="h-4 w-4 text-primary" />
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      {/* ── Featured pick ────────────────────────────────────────────────── */}
      {pick && (
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Dad&apos;s latest highly-rated pick
          </h2>
          <Link
            href={`/film/${pick.film_id}`}
            className="group flex gap-5 rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
          >
            {pick.poster_path && (
              <div className="relative w-20 shrink-0 aspect-[2/3] rounded-md overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://image.tmdb.org/t/p/w185${pick.poster_path}`}
                  alt={pick.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex flex-col justify-center gap-1.5 min-w-0">
              <p className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
                {pick.title}
                {pick.year && (
                  <span className="font-normal text-muted-foreground ml-2 text-sm">
                    ({pick.year})
                  </span>
                )}
              </p>
              <p className="text-primary font-medium text-sm">
                {"★".repeat(Math.floor(pick.rating ?? 0))}
                {(pick.rating ?? 0) % 1 === 0.5 ? "½" : ""}{" "}
                {pick.rating?.toFixed(1)}
              </p>
              {pick.review_text && (
                <p className="text-sm text-muted-foreground italic line-clamp-2 leading-relaxed">
                  &ldquo;{pick.review_text}&rdquo;
                </p>
              )}
            </div>
          </Link>
        </section>
      )}

      {/* ── Recent watches ───────────────────────────────────────────────── */}
      {recentWatches.length > 0 && (
        <section className="pb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recently watched
            </h2>
            <Link
              href="/search?sortBy=watch_date_desc"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {recentWatches.map((film) => (
              <FilmCard
                key={film.film_id}
                film_id={film.film_id}
                title={film.title}
                year={film.year}
                poster_path={film.poster_path}
                rating={film.rating}
                rewatch={film.rewatch === 1}
                genres={film.genres ? film.genres.split(",") : []}
                directors={film.directors ? film.directors.split(",") : []}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
