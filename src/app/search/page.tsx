import { Suspense } from "react";
import type { Metadata } from "next";
import { sqlite } from "@/lib/db";
import { SearchPageClient } from "./SearchPageClient";

export const metadata: Metadata = { title: "Search" };

function getFilterOptions() {
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
    .prepare(`SELECT MIN(year) AS min_year, MAX(year) AS max_year FROM films WHERE year IS NOT NULL`)
    .get() as { min_year: number; max_year: number };

  return { genres, yearRange };
}

export default function SearchPage() {
  const filterOptions = getFilterOptions();

  return (
    <Suspense>
      <SearchPageClient filterOptions={filterOptions} />
    </Suspense>
  );
}
