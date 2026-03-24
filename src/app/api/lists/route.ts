import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

type PreviewFilm = {
  film_id: number;
  poster_path: string | null;
};

type ListRow = {
  list_id: number;
  slug: string;
  display_name: string;
  description: string | null;
  category: string;
  sort_order: number;
  film_count: number;
};

export async function GET() {
  try {
    const lists = sqlite
      .prepare(
        `SELECT list_id, slug, display_name, description, category, sort_order, film_count
         FROM lists
         ORDER BY category, sort_order DESC, display_name`
      )
      .all() as ListRow[];

    // Fetch first 4 poster-bearing films for each list in one query
    const listIds = lists.map((l) => l.list_id);
    const previewRows =
      listIds.length > 0
        ? (sqlite
            .prepare(
              `SELECT lf.list_id, f.film_id, f.poster_path
               FROM list_films lf
               JOIN films f ON f.film_id = lf.film_id
               WHERE lf.list_id IN (${listIds.map(() => "?").join(",")})
               ORDER BY lf.list_id, lf.position`
            )
            .all(...listIds) as (PreviewFilm & { list_id: number })[])
        : [];

    // Group preview films per list (first 4)
    const previewsByList: Record<number, PreviewFilm[]> = {};
    for (const row of previewRows) {
      if (!previewsByList[row.list_id]) previewsByList[row.list_id] = [];
      if (previewsByList[row.list_id].length < 4) {
        previewsByList[row.list_id].push({
          film_id: row.film_id,
          poster_path: row.poster_path,
        });
      }
    }

    // Group lists by category in the desired display order
    const categoryOrder = ["yearly", "franchise", "director", "other"];
    const grouped: Record<string, (ListRow & { preview_films: PreviewFilm[] })[]> = {};

    for (const list of lists) {
      const key = list.category;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        ...list,
        preview_films: previewsByList[list.list_id] ?? [],
      });
    }

    // Sort yearly desc by sort_order (which is stored as negative year)
    if (grouped.yearly) {
      grouped.yearly.sort((a, b) => b.sort_order - a.sort_order);
    }

    const result = categoryOrder
      .filter((cat) => grouped[cat]?.length)
      .map((cat) => ({ category: cat, lists: grouped[cat] }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Lists API error:", err);
    return NextResponse.json({ error: "Failed to load lists" }, { status: 500 });
  }
}
