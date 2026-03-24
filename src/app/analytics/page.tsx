import type { Metadata } from "next";
import { sqlite } from "@/lib/db";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const metadata: Metadata = { title: "Analytics" };

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalyticsData = {
  stats: {
    total_films: number;
    rated_films: number;
    avg_rating: number | null;
    total_directors: number;
    total_genres: number;
    earliest_year: number | null;
    latest_year: number | null;
    total_rewatches: number;
  };
  ratingDistribution: { rating: number; count: number }[];
  filmsPerYear: { year: number; count: number; avg_rating: number | null }[];
  topDirectors: { name: string; film_count: number; avg_rating: number }[];
  topActors: { name: string; film_count: number; avg_rating: number }[];
  genreBreakdown: { name: string; film_count: number; avg_rating: number | null }[];
  decadeDistribution: { decade: number; count: number; avg_rating: number | null }[];
  ratingByGenre: { name: string; avg_rating: number; film_count: number }[];
};

// ─── Data fetching ────────────────────────────────────────────────────────────

function getAnalyticsData(): AnalyticsData {
  const stats = sqlite
    .prepare(
      `SELECT
        COUNT(DISTINCT f.film_id)                                        AS total_films,
        COUNT(DISTINCT CASE WHEN wh.rating IS NOT NULL THEN f.film_id END) AS rated_films,
        ROUND(AVG(wh.rating), 2)                                         AS avg_rating,
        COUNT(DISTINCT d.director_id)                                    AS total_directors,
        COUNT(DISTINCT g.genre_id)                                       AS total_genres,
        MIN(f.year)                                                      AS earliest_year,
        MAX(f.year)                                                      AS latest_year,
        COUNT(DISTINCT CASE WHEN wh.rewatch = 1 THEN wh.watch_id END)   AS total_rewatches
       FROM films f
       JOIN watch_history wh ON wh.film_id = f.film_id
       LEFT JOIN film_directors fd ON fd.film_id = f.film_id
       LEFT JOIN directors d ON d.director_id = fd.director_id
       LEFT JOIN film_genres fg ON fg.film_id = f.film_id
       LEFT JOIN genres g ON g.genre_id = fg.genre_id`
    )
    .get() as AnalyticsData["stats"];

  const ratingDistribution = sqlite
    .prepare(
      `SELECT rating, COUNT(*) AS count
       FROM watch_history
       WHERE rating IS NOT NULL
       GROUP BY rating
       ORDER BY rating`
    )
    .all() as AnalyticsData["ratingDistribution"];

  const filmsPerYear = sqlite
    .prepare(
      `SELECT
        CAST(SUBSTR(wh.watch_date, 1, 4) AS INTEGER) AS year,
        COUNT(*) AS count,
        ROUND(AVG(wh.rating), 2) AS avg_rating
       FROM watch_history wh
       WHERE wh.watch_date IS NOT NULL
       GROUP BY year
       ORDER BY year`
    )
    .all() as AnalyticsData["filmsPerYear"];

  const topDirectors = sqlite
    .prepare(
      `SELECT d.name, COUNT(DISTINCT fd.film_id) AS film_count, ROUND(AVG(wh.rating), 2) AS avg_rating
       FROM directors d
       JOIN film_directors fd ON fd.director_id = d.director_id
       JOIN watch_history wh ON wh.film_id = fd.film_id
       WHERE wh.rating IS NOT NULL
       GROUP BY d.director_id
       HAVING film_count >= 2
       ORDER BY avg_rating DESC, film_count DESC
       LIMIT 15`
    )
    .all() as AnalyticsData["topDirectors"];

  const topActors = sqlite
    .prepare(
      `SELECT a.name, COUNT(DISTINCT fa.film_id) AS film_count, ROUND(AVG(wh.rating), 2) AS avg_rating
       FROM actors a
       JOIN film_actors fa ON fa.actor_id = a.actor_id
       JOIN watch_history wh ON wh.film_id = fa.film_id
       GROUP BY a.actor_id
       ORDER BY film_count DESC, avg_rating DESC
       LIMIT 15`
    )
    .all() as AnalyticsData["topActors"];

  const genreBreakdown = sqlite
    .prepare(
      `SELECT g.name, COUNT(DISTINCT fg.film_id) AS film_count, ROUND(AVG(wh.rating), 2) AS avg_rating
       FROM genres g
       JOIN film_genres fg ON fg.genre_id = g.genre_id
       LEFT JOIN watch_history wh ON wh.film_id = fg.film_id
       GROUP BY g.genre_id
       ORDER BY film_count DESC`
    )
    .all() as AnalyticsData["genreBreakdown"];

  const decadeDistribution = sqlite
    .prepare(
      `SELECT (f.year / 10) * 10 AS decade, COUNT(*) AS count, ROUND(AVG(wh.rating), 2) AS avg_rating
       FROM films f
       LEFT JOIN watch_history wh ON wh.film_id = f.film_id
       WHERE f.year IS NOT NULL
       GROUP BY decade
       ORDER BY decade`
    )
    .all() as AnalyticsData["decadeDistribution"];

  const ratingByGenre = sqlite
    .prepare(
      `SELECT g.name, ROUND(AVG(wh.rating), 2) AS avg_rating, COUNT(DISTINCT fg.film_id) AS film_count
       FROM genres g
       JOIN film_genres fg ON fg.genre_id = g.genre_id
       JOIN watch_history wh ON wh.film_id = fg.film_id
       WHERE wh.rating IS NOT NULL
       GROUP BY g.genre_id
       HAVING film_count >= 5
       ORDER BY avg_rating DESC`
    )
    .all() as AnalyticsData["ratingByGenre"];

  return {
    stats,
    ratingDistribution,
    filmsPerYear,
    topDirectors,
    topActors,
    genreBreakdown,
    decadeDistribution,
    ratingByGenre,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const data = getAnalyticsData();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stats and patterns across {data.stats.total_films.toLocaleString()} films
        </p>
      </div>
      <AnalyticsDashboard data={data} />
    </div>
  );
}
