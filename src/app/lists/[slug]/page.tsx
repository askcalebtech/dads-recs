import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sqlite } from "@/lib/db";
import { ListDetailClient } from "@/components/lists/ListDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

function getList(slug: string) {
  const list = sqlite
    .prepare(
      `SELECT list_id, slug, display_name, description, film_count
       FROM lists WHERE slug = ?`
    )
    .get(slug) as {
    list_id: number;
    slug: string;
    display_name: string;
    description: string | null;
    film_count: number;
  } | undefined;

  if (!list) return null;

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

  return {
    ...list,
    films: films.map((f) => ({ ...f, genres: f.genres ? f.genres.split(",") : [] })),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const list = getList(slug);
  if (!list) return { title: "List not found" };
  return {
    title: list.display_name,
    description: list.description ?? `${list.film_count} films ranked by Dad.`,
  };
}

export default async function ListDetailPage({ params }: Props) {
  const { slug } = await params;
  const list = getList(slug);
  if (!list) notFound();

  return <ListDetailClient {...list} />;
}
