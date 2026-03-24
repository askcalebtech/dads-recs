import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

// Returns filter options for the search UI: all genres, year range
export async function GET() {
  try {
    const genres = sqlite
      .prepare(
        `SELECT g.name, COUNT(DISTINCT fg.film_id) AS count
         FROM genres g
         JOIN film_genres fg ON fg.genre_id = g.genre_id
         GROUP BY g.genre_id
         ORDER BY count DESC, g.name`
      )
      .all() as { name: string; count: number }[];

    const yearRange = sqlite
      .prepare(
        `SELECT MIN(year) AS min_year, MAX(year) AS max_year
         FROM films WHERE year IS NOT NULL`
      )
      .get() as { min_year: number; max_year: number };

    const decades = sqlite
      .prepare(
        `SELECT DISTINCT (year / 10) * 10 AS decade
         FROM films WHERE year IS NOT NULL
         ORDER BY decade`
      )
      .all() as { decade: number }[];

    return NextResponse.json({ genres, yearRange, decades });
  } catch (err) {
    console.error("Filter options error:", err);
    return NextResponse.json({ error: "Failed to load filter options" }, { status: 500 });
  }
}
