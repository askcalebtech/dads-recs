import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export async function GET() {
  try {
    // Quick stats
    const stats = sqlite
      .prepare(
        `SELECT
          COUNT(DISTINCT f.film_id) AS total_films,
          COUNT(DISTINCT CASE WHEN wh.rating IS NOT NULL THEN f.film_id END) AS rated_films,
          ROUND(AVG(wh.rating), 2) AS avg_rating,
          COUNT(DISTINCT d.director_id) AS total_directors,
          COUNT(DISTINCT g.genre_id) AS total_genres,
          MIN(f.year) AS earliest_year,
          MAX(f.year) AS latest_year,
          COUNT(DISTINCT CASE WHEN wh.rewatch = 1 THEN wh.watch_id END) AS total_rewatches
        FROM films f
        LEFT JOIN watch_history wh ON wh.film_id = f.film_id
        LEFT JOIN film_directors fd ON fd.film_id = f.film_id
        LEFT JOIN directors d ON d.director_id = fd.director_id
        LEFT JOIN film_genres fg ON fg.film_id = f.film_id
        LEFT JOIN genres g ON g.genre_id = fg.genre_id`
      )
      .get() as Record<string, number>;

    // Rating distribution (0.5–5.0 in 0.5 steps)
    const ratingDistribution = sqlite
      .prepare(
        `SELECT rating, COUNT(*) AS count
         FROM watch_history
         WHERE rating IS NOT NULL
         GROUP BY rating
         ORDER BY rating`
      )
      .all() as { rating: number; count: number }[];

    // Films watched per year (only entries with a known watch_date)
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
      .all() as { year: number; count: number; avg_rating: number }[];

    // Top 15 directors by avg rating (min 2 films)
    const topDirectors = sqlite
      .prepare(
        `SELECT
          d.name,
          COUNT(DISTINCT fd.film_id) AS film_count,
          ROUND(AVG(wh.rating), 2) AS avg_rating
         FROM directors d
         JOIN film_directors fd ON fd.director_id = d.director_id
         JOIN watch_history wh ON wh.film_id = fd.film_id
         WHERE wh.rating IS NOT NULL
         GROUP BY d.director_id
         HAVING film_count >= 2
         ORDER BY avg_rating DESC, film_count DESC
         LIMIT 15`
      )
      .all() as { name: string; film_count: number; avg_rating: number }[];

    // Top 15 actors by appearances
    const topActors = sqlite
      .prepare(
        `SELECT
          a.name,
          COUNT(DISTINCT fa.film_id) AS film_count,
          ROUND(AVG(wh.rating), 2) AS avg_rating
         FROM actors a
         JOIN film_actors fa ON fa.actor_id = a.actor_id
         JOIN watch_history wh ON wh.film_id = fa.film_id
         GROUP BY a.actor_id
         ORDER BY film_count DESC, avg_rating DESC
         LIMIT 15`
      )
      .all() as { name: string; film_count: number; avg_rating: number }[];

    // Genre breakdown (count + avg rating)
    const genreBreakdown = sqlite
      .prepare(
        `SELECT
          g.name,
          COUNT(DISTINCT fg.film_id) AS film_count,
          ROUND(AVG(wh.rating), 2) AS avg_rating
         FROM genres g
         JOIN film_genres fg ON fg.genre_id = g.genre_id
         LEFT JOIN watch_history wh ON wh.film_id = fg.film_id
         GROUP BY g.genre_id
         ORDER BY film_count DESC`
      )
      .all() as { name: string; film_count: number; avg_rating: number }[];

    // Decade distribution
    const decadeDistribution = sqlite
      .prepare(
        `SELECT
          (f.year / 10) * 10 AS decade,
          COUNT(*) AS count,
          ROUND(AVG(wh.rating), 2) AS avg_rating
         FROM films f
         LEFT JOIN watch_history wh ON wh.film_id = f.film_id
         WHERE f.year IS NOT NULL
         GROUP BY decade
         ORDER BY decade`
      )
      .all() as { decade: number; count: number; avg_rating: number }[];

    // Average rating by genre
    const ratingByGenre = sqlite
      .prepare(
        `SELECT
          g.name,
          ROUND(AVG(wh.rating), 2) AS avg_rating,
          COUNT(DISTINCT fg.film_id) AS film_count
         FROM genres g
         JOIN film_genres fg ON fg.genre_id = g.genre_id
         JOIN watch_history wh ON wh.film_id = fg.film_id
         WHERE wh.rating IS NOT NULL
         GROUP BY g.genre_id
         HAVING film_count >= 5
         ORDER BY avg_rating DESC`
      )
      .all() as { name: string; avg_rating: number; film_count: number }[];

    // Recent watches (last 10 with dates)
    const recentWatches = sqlite
      .prepare(
        `SELECT
          f.film_id, f.title, f.year, f.poster_path,
          wh.rating, wh.watch_date, wh.logged_date
         FROM films f
         JOIN watch_history wh ON wh.film_id = f.film_id
         WHERE wh.watch_date IS NOT NULL
         ORDER BY wh.watch_date DESC
         LIMIT 10`
      )
      .all() as {
        film_id: number;
        title: string;
        year: number | null;
        poster_path: string | null;
        rating: number | null;
        watch_date: string | null;
        logged_date: string | null;
      }[];

    return NextResponse.json({
      stats,
      ratingDistribution,
      filmsPerYear,
      topDirectors,
      topActors,
      genreBreakdown,
      decadeDistribution,
      ratingByGenre,
      recentWatches,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Analytics failed" }, { status: 500 });
  }
}
