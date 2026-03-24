import Link from "next/link";
import Image from "next/image";
import { posterUrl } from "@/lib/utils";

interface PreviewFilm {
  film_id: number;
  poster_path: string | null;
}

interface ListTileProps {
  slug: string;
  display_name: string;
  film_count: number;
  preview_films: PreviewFilm[];
}

// Each poster is 1/3.25 of the container width (4 posters, 25% overlap each).
// Total width = W + 3 × 0.75W = 3.25W → W = 100/3.25 ≈ 30.77%
// Overlap = 0.25W ≈ 7.69% of container width.
const POSTER_WIDTH = "30.77%";
const POSTER_OVERLAP = "-7.69%"; // negative margin-right

export function ListTile({ slug, display_name, film_count, preview_films }: ListTileProps) {
  const slots: (PreviewFilm | null)[] = [...preview_films.slice(0, 4)];
  while (slots.length < 4) slots.push(null);

  return (
    <Link
      href={`/lists/${slug}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5"
    >
      {/* Overlapping poster strip — full poster height, no vertical crop */}
      <div className="flex overflow-hidden rounded-t-xl">
        {slots.map((film, i) => (
          <div
            key={i}
            className="relative shrink-0 bg-muted"
            style={{
              width: POSTER_WIDTH,
              aspectRatio: "2/3",
              zIndex: 4 - i,
              marginRight: i < 3 ? POSTER_OVERLAP : 0,
              boxShadow: i > 0 ? "2px 0 6px rgba(0,0,0,0.5)" : undefined,
            }}
          >
            {film?.poster_path ? (
              <Image
                src={posterUrl(film.poster_path, "w185")!}
                alt=""
                fill
                sizes="(max-width: 640px) 25vw, 12vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ zIndex: 4 - i }}
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}
          </div>
        ))}
      </div>

      {/* Label */}
      <div className="flex flex-col gap-0.5 p-3">
        <p className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {display_name}
        </p>
        <p className="text-xs text-muted-foreground">{film_count} films</p>
      </div>
    </Link>
  );
}
