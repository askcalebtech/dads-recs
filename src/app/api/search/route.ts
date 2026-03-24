import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

// Escape FTS5 special characters and build a prefix-match query
function buildFtsQuery(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `"${w.replace(/"/g, '""')}"*`)
    .join(" ");
}

const SORT_MAP: Record<string, string> = {
  rating_desc: "wh.rating DESC NULLS LAST, f.title ASC",
  rating_asc: "wh.rating ASC NULLS LAST, f.title ASC",
  year_desc: "f.year DESC NULLS LAST, f.title ASC",
  year_asc: "f.year ASC NULLS LAST, f.title ASC",
  watch_date_desc: "wh.watch_date DESC NULLS LAST, f.title ASC",
  watch_date_asc: "wh.watch_date ASC NULLS LAST, f.title ASC",
  title_asc: "f.title ASC",
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const query = sp.get("q")?.trim() ?? "";
  const genres = sp.getAll("genre").filter(Boolean);
  const yearMin = sp.get("yearMin") ? parseInt(sp.get("yearMin")!) : null;
  const yearMax = sp.get("yearMax") ? parseInt(sp.get("yearMax")!) : null;
  const decade = sp.get("decade") ? parseInt(sp.get("decade")!) : null;
  const ratingMin = sp.get("ratingMin") ? parseFloat(sp.get("ratingMin")!) : null;
  const ratingMax = sp.get("ratingMax") ? parseFloat(sp.get("ratingMax")!) : null;
  const director = sp.get("director")?.trim() ?? "";
  const sortBy = sp.get("sortBy") ?? "year_desc";
  const limit = Math.min(parseInt(sp.get("limit") ?? "60"), 200);
  const offset = parseInt(sp.get("offset") ?? "0");

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query) {
    const ftsQuery = buildFtsQuery(query);
    conditions.push(
      `f.film_id IN (SELECT rowid FROM films_fts WHERE films_fts MATCH ?)`
    );
    params.push(ftsQuery);
  }

  if (yearMin !== null) {
    conditions.push(`f.year >= ?`);
    params.push(yearMin);
  }
  if (yearMax !== null) {
    conditions.push(`f.year <= ?`);
    params.push(yearMax);
  }
  if (decade !== null) {
    conditions.push(`f.year >= ? AND f.year < ?`);
    params.push(decade, decade + 10);
  }
  if (ratingMin !== null) {
    conditions.push(`wh.rating >= ?`);
    params.push(ratingMin);
  }
  if (ratingMax !== null) {
    conditions.push(`wh.rating <= ?`);
    params.push(ratingMax);
  }
  if (genres.length > 0) {
    const placeholders = genres.map(() => "?").join(", ");
    conditions.push(`f.film_id IN (
      SELECT fg2.film_id FROM film_genres fg2
      JOIN genres g2 ON g2.genre_id = fg2.genre_id
      WHERE g2.name IN (${placeholders})
    )`);
    params.push(...genres);
  }
  if (director) {
    conditions.push(`f.film_id IN (
      SELECT fd2.film_id FROM film_directors fd2
      JOIN directors d2 ON d2.director_id = fd2.director_id
      WHERE d2.name LIKE ?
    )`);
    params.push(`%${director}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = SORT_MAP[sortBy] ?? SORT_MAP.title_asc;

  const dataSql = `
    SELECT
      f.film_id,
      f.title,
      f.year,
      f.poster_path,
      f.runtime_minutes,
      wh.rating,
      wh.watch_date,
      wh.rewatch,
      GROUP_CONCAT(DISTINCT g.name) AS genres,
      GROUP_CONCAT(DISTINCT d.name) AS directors
    FROM films f
    JOIN watch_history wh ON wh.film_id = f.film_id
    LEFT JOIN film_genres fg ON fg.film_id = f.film_id
    LEFT JOIN genres g ON g.genre_id = fg.genre_id
    LEFT JOIN film_directors fd ON fd.film_id = f.film_id
    LEFT JOIN directors d ON d.director_id = fd.director_id
    ${where}
    GROUP BY f.film_id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT f.film_id) AS total
    FROM films f
    JOIN watch_history wh ON wh.film_id = f.film_id
    ${where}
  `;

  try {
    type Row = {
      film_id: number;
      title: string;
      year: number | null;
      poster_path: string | null;
      runtime_minutes: number | null;
      rating: number | null;
      watch_date: string | null;
      rewatch: number;
      genres: string | null;
      directors: string | null;
    };

    const rows = sqlite.prepare(dataSql).all([...params, limit, offset]) as Row[];
    const { total } = sqlite.prepare(countSql).get([...params]) as { total: number };

    const films = rows.map((row) => ({
      film_id: row.film_id,
      title: row.title,
      year: row.year,
      poster_path: row.poster_path,
      runtime_minutes: row.runtime_minutes,
      rating: row.rating,
      watch_date: row.watch_date,
      rewatch: row.rewatch === 1,
      genres: row.genres ? row.genres.split(",") : [],
      directors: row.directors ? row.directors.split(",") : [],
    }));

    return NextResponse.json({ films, total, limit, offset });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
