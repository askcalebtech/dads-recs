import Link from "next/link";
import Image from "next/image";
import { posterUrl } from "@/lib/utils";
import { StarRating } from "./StarRating";
import { GenreBadge } from "./GenreBadge";

interface FilmCardProps {
  film_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  rating: number | null;
  genres: string[];
  directors: string[];
  rewatch?: boolean;
}

export function FilmCard({
  film_id,
  title,
  year,
  poster_path,
  rating,
  genres,
  rewatch,
}: FilmCardProps) {
  const poster = posterUrl(poster_path, "w300");

  return (
    <Link
      href={`/film/${film_id}`}
      className="group flex flex-col rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-3 text-center">
            <span className="text-3xl mb-2">🎬</span>
            <span className="text-xs leading-tight">{title}</span>
          </div>
        )}

        {/* Rating badge overlay */}
        {rating !== null && (
          <div className="absolute top-2 right-2 rounded-md bg-black/70 backdrop-blur-sm px-1.5 py-0.5">
            <StarRating rating={rating} size="sm" />
          </div>
        )}

        {/* Rewatch indicator */}
        {rewatch && (
          <div className="absolute top-2 left-2 rounded-md bg-primary/80 px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
            ↩ rewatch
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-2.5">
        <div>
          <p className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </p>
          {year && (
            <p className="text-xs text-muted-foreground mt-0.5">{year}</p>
          )}
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 3).map((g) => (
              <GenreBadge key={g} name={g} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function FilmCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg overflow-hidden bg-card border border-border animate-pulse">
      <div className="aspect-[2/3] bg-muted" />
      <div className="p-2.5 flex flex-col gap-2">
        <div className="h-3.5 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-1/4" />
        <div className="flex gap-1">
          <div className="h-4 bg-muted rounded w-14" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
      </div>
    </div>
  );
}
