"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, List } from "lucide-react";
import { posterUrl, formatRuntime } from "@/lib/utils";
import { StarRating } from "@/components/film/StarRating";
import { GenreBadge } from "@/components/film/GenreBadge";
import { FilmCard } from "@/components/film/FilmCard";
import { cn } from "@/lib/utils";

interface FilmEntry {
  position: number;
  film_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  runtime_minutes: number | null;
  rating: number | null;
  genres: string[];
}

interface Props {
  display_name: string;
  description: string | null;
  film_count: number;
  films: FilmEntry[];
}

export function ListDetailClient({ display_name, description, film_count, films }: Props) {
  const [view, setView] = useState<"list" | "grid">("list");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{display_name}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">{description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{film_count} films</p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 shrink-0 rounded-lg border border-border p-1">
          <button
            onClick={() => setView("list")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "grid" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === "list" ? (
        <ListView films={films} />
      ) : (
        <GridView films={films} />
      )}
    </div>
  );
}

function ListView({ films }: { films: FilmEntry[] }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {films.map((film) => (
        <Link
          key={film.film_id}
          href={`/film/${film.film_id}`}
          className="group flex items-center gap-4 py-3 hover:bg-accent/30 rounded-lg px-2 -mx-2 transition-colors"
        >
          {/* Rank */}
          <span className="text-sm font-bold tabular-nums text-muted-foreground w-7 shrink-0 text-right">
            {film.position}
          </span>

          {/* Poster */}
          <div className="relative w-10 shrink-0 aspect-[2/3] rounded overflow-hidden bg-muted">
            {film.poster_path ? (
              <Image
                src={posterUrl(film.poster_path, "w185")!}
                alt={film.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {film.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {film.year && (
                <span className="text-xs text-muted-foreground">{film.year}</span>
              )}
              {film.runtime_minutes && (
                <span className="text-xs text-muted-foreground">
                  {formatRuntime(film.runtime_minutes)}
                </span>
              )}
              {film.genres.slice(0, 2).map((g) => (
                <GenreBadge key={g} name={g} />
              ))}
            </div>
          </div>

          {/* Rating */}
          {film.rating !== null && (
            <div className="shrink-0">
              <StarRating rating={film.rating} size="sm" />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

function GridView({ films }: { films: FilmEntry[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {films.map((film) => (
        <div key={film.film_id} className="relative">
          {/* Position badge */}
          <span className="absolute top-1.5 left-1.5 z-10 text-xs font-bold bg-black/70 text-white rounded px-1.5 py-0.5 leading-none">
            #{film.position}
          </span>
          <FilmCard
            film_id={film.film_id}
            title={film.title}
            year={film.year}
            poster_path={film.poster_path}
            rating={film.rating}
            genres={film.genres}
            directors={[]}
          />
        </div>
      ))}
    </div>
  );
}
