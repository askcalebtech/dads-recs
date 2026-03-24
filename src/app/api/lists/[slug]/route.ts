import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const list = sqlite
      .prepare(
        `SELECT list_id, slug, display_name, description, category, film_count
         FROM lists WHERE slug = ?`
      )
      .get(slug) as {
      list_id: number;
      slug: string;
      display_name: string;
      description: string | null;
      category: string;
      film_count: number;
    } | undefined;

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const films = sqlite
      .prepare(
        `SELECT
           lf.position,
           f.film_id,
           f.title,
           f.year,
           f.poster_path,
           f.runtime_minutes,
           wh.rating,
           GROUP_CONCAT(DISTINCT g.name) AS genres
         FROM list_films lf
         JOIN films f ON f.film_id = lf.film_id
         LEFT JOIN watch_history wh ON wh.film_id = f.film_id
         LEFT JOIN film_genres fg ON fg.film_id = f.film_id
         LEFT JOIN genres g ON g.genre_id = fg.genre_id
         WHERE lf.list_id = ?
         GROUP BY lf.film_id
         ORDER BY lf.position`
      )
      .all(list.list_id) as {
      position: number;
      film_id: number;
      title: string;
      year: number | null;
      poster_path: string | null;
      runtime_minutes: number | null;
      rating: number | null;
      genres: string | null;
    }[];

    return NextResponse.json({
      ...list,
      films: films.map((f) => ({
        ...f,
        genres: f.genres ? f.genres.split(",") : [],
      })),
    });
  } catch (err) {
    console.error("List detail API error:", err);
    return NextResponse.json({ error: "Failed to load list" }, { status: 500 });
  }
}
