import type { Metadata } from "next";
import { sqlite } from "@/lib/db";
import { ListTile } from "@/components/lists/ListTile";

export const metadata: Metadata = {
  title: "Lists",
  description: "Dad's curated film rankings — by year, franchise, director, and more.",
};

const CATEGORY_LABELS: Record<string, string> = {
  yearly: "Yearly Rankings",
  franchise: "Franchise Rankings",
  director: "Director Rankings",
  other: "Other Lists",
};

const CATEGORY_ORDER = ["yearly", "franchise", "director", "other"];

type PreviewFilm = { film_id: number; poster_path: string | null };
type ListRow = {
  list_id: number;
  slug: string;
  display_name: string;
  film_count: number;
  category: string;
  sort_order: number;
  preview_films: PreviewFilm[];
};

function getLists(): Record<string, ListRow[]> {
  const lists = sqlite
    .prepare(
      `SELECT list_id, slug, display_name, film_count, category, sort_order
       FROM lists
       ORDER BY category, sort_order DESC, display_name`
    )
    .all() as Omit<ListRow, "preview_films">[];

  if (lists.length === 0) return {};

  const listIds = lists.map((l) => l.list_id);
  const previewRows = sqlite
    .prepare(
      `SELECT lf.list_id, f.film_id, f.poster_path
       FROM list_films lf
       JOIN films f ON f.film_id = lf.film_id
       WHERE lf.list_id IN (${listIds.map(() => "?").join(",")})
       ORDER BY lf.list_id, lf.position`
    )
    .all(...listIds) as (PreviewFilm & { list_id: number })[];

  const previewsByList: Record<number, PreviewFilm[]> = {};
  for (const row of previewRows) {
    if (!previewsByList[row.list_id]) previewsByList[row.list_id] = [];
    if (previewsByList[row.list_id].length < 4) {
      previewsByList[row.list_id].push({ film_id: row.film_id, poster_path: row.poster_path });
    }
  }

  const grouped: Record<string, ListRow[]> = {};
  for (const list of lists) {
    const cat = list.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...list, preview_films: previewsByList[list.list_id] ?? [] });
  }

  // Yearly: most recent first (sort_order stored as negative year)
  if (grouped.yearly) {
    grouped.yearly.sort((a, b) => b.sort_order - a.sort_order);
  }

  return grouped;
}

export default function ListsPage() {
  const grouped = getLists();
  const categories = CATEGORY_ORDER.filter((cat) => grouped[cat]?.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dad&apos;s Lists</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Curated rankings by year, franchise, director, and more.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">No lists yet</p>
          <p className="text-sm">
            Add Letterboxd list CSVs to{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">scripts/data/lists/</code>{" "}
            and run <code className="text-xs bg-muted px-1.5 py-0.5 rounded">make run-lists</code>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {categories.map((cat) => (
            <section key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>

              {cat === "yearly" ? (
                /* Yearly: horizontal scroll row */
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                  {grouped[cat].map((list) => (
                    <div key={list.slug} className="shrink-0 w-44 snap-start">
                      <ListTile {...list} />
                    </div>
                  ))}
                </div>
              ) : (
                /* Other categories: responsive grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {grouped[cat].map((list) => (
                    <ListTile key={list.slug} {...list} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
