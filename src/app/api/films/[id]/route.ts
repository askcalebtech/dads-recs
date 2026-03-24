import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filmId = parseInt(id);

  if (isNaN(filmId)) {
    return NextResponse.json({ error: "Invalid film ID" }, { status: 400 });
  }

  type FilmRow = {
    film_id: number;
    title: string;
    year: number | null;
    tmdb_id: number | null;
    imdb_id: string | null;
    runtime_minutes: number | null;
    poster_path: string | null;
    overview: string | null;
    letterboxd_uri: string | null;
    rating: number | null;
    watch_date: string | null;
    rewatch: number;
    review_text: string | null;
    logged_date: string | null;
  };

  type GenreRow = { name: string; genre_id: number };
  type DirectorRow = { name: string; director_id: number; tmdb_id: number | null };
  type ActorRow = {
    name: string;
    actor_id: number;
    tmdb_id: number | null;
    profile_path: string | null;
    billing_order: number | null;
  };

  try {
    const film = sqlite
      .prepare(
        `SELECT
          f.film_id, f.title, f.year, f.tmdb_id, f.imdb_id,
          f.runtime_minutes, f.poster_path, f.overview, f.letterboxd_uri,
          wh.rating, wh.watch_date, wh.rewatch, wh.review_text, wh.logged_date
        FROM films f
        JOIN watch_history wh ON wh.film_id = f.film_id
        WHERE f.film_id = ?
        LIMIT 1`
      )
      .get(filmId) as FilmRow | undefined;

    if (!film) {
      return NextResponse.json({ error: "Film not found" }, { status: 404 });
    }

    const genres = sqlite
      .prepare(
        `SELECT g.genre_id, g.name
         FROM genres g
         JOIN film_genres fg ON fg.genre_id = g.genre_id
         WHERE fg.film_id = ?
         ORDER BY g.name`
      )
      .all(filmId) as GenreRow[];

    const directors = sqlite
      .prepare(
        `SELECT d.director_id, d.name, d.tmdb_id
         FROM directors d
         JOIN film_directors fd ON fd.director_id = d.director_id
         WHERE fd.film_id = ?
         ORDER BY d.name`
      )
      .all(filmId) as DirectorRow[];

    const actors = sqlite
      .prepare(
        `SELECT a.actor_id, a.name, a.tmdb_id, a.profile_path, fa.billing_order
         FROM actors a
         JOIN film_actors fa ON fa.actor_id = a.actor_id
         WHERE fa.film_id = ?
         ORDER BY fa.billing_order ASC NULLS LAST`
      )
      .all(filmId) as ActorRow[];

    return NextResponse.json({
      ...film,
      rewatch: film.rewatch === 1,
      genres,
      directors,
      actors,
    });
  } catch (err) {
    console.error("Film detail error:", err);
    return NextResponse.json({ error: "Failed to fetch film" }, { status: 500 });
  }
}
