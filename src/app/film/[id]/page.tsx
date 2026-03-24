import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { sqlite } from "@/lib/db";
import { posterUrl, formatRuntime, cn } from "@/lib/utils";
import { StarRating } from "@/components/film/StarRating";
import { GenreBadge } from "@/components/film/GenreBadge";
import { ArrowLeft, ExternalLink, Calendar, Clock, RefreshCw } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

function getFilm(id: number) {
  type FilmRow = {
    film_id: number; title: string; year: number | null;
    tmdb_id: number | null; imdb_id: string | null;
    runtime_minutes: number | null; poster_path: string | null;
    overview: string | null; letterboxd_uri: string | null;
    rating: number | null; watch_date: string | null;
    rewatch: number; review_text: string | null; logged_date: string | null;
  };
  return sqlite
    .prepare(
      `SELECT f.film_id, f.title, f.year, f.tmdb_id, f.imdb_id,
              f.runtime_minutes, f.poster_path, f.overview, f.letterboxd_uri,
              wh.rating, wh.watch_date, wh.rewatch, wh.review_text, wh.logged_date
       FROM films f
       JOIN watch_history wh ON wh.film_id = f.film_id
       WHERE f.film_id = ? LIMIT 1`
    )
    .get(id) as FilmRow | undefined;
}

function getGenres(id: number) {
  return sqlite
    .prepare(
      `SELECT g.name FROM genres g
       JOIN film_genres fg ON fg.genre_id = g.genre_id
       WHERE fg.film_id = ? ORDER BY g.name`
    )
    .all(id) as { name: string }[];
}

function getDirectors(id: number) {
  return sqlite
    .prepare(
      `SELECT d.name, d.tmdb_id FROM directors d
       JOIN film_directors fd ON fd.director_id = d.director_id
       WHERE fd.film_id = ? ORDER BY d.name`
    )
    .all(id) as { name: string; tmdb_id: number | null }[];
}

function getCast(id: number) {
  return sqlite
    .prepare(
      `SELECT a.name, a.tmdb_id, a.profile_path, fa.billing_order
       FROM actors a
       JOIN film_actors fa ON fa.actor_id = a.actor_id
       WHERE fa.film_id = ?
       ORDER BY fa.billing_order ASC NULLS LAST
       LIMIT 15`
    )
    .all(id) as { name: string; tmdb_id: number | null; profile_path: string | null; billing_order: number | null }[];
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const film = getFilm(parseInt(id));
  if (!film) return { title: "Film not found" };
  return {
    title: film.year ? `${film.title} (${film.year})` : film.title,
    description: film.overview ?? undefined,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FilmPage({ params }: Props) {
  const { id } = await params;
  const filmId = parseInt(id);
  if (isNaN(filmId)) notFound();

  const film = getFilm(filmId);
  if (!film) notFound();

  const genres = getGenres(filmId);
  const directors = getDirectors(filmId);
  const cast = getCast(filmId);

  const poster = posterUrl(film.poster_path, "w500");
  const tmdbUrl = film.tmdb_id ? `https://www.themoviedb.org/movie/${film.tmdb_id}` : null;
  const imdbUrl = film.imdb_id ? `https://www.imdb.com/title/${film.imdb_id}` : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to search
      </Link>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Poster */}
        <div className="shrink-0 self-start">
          <div className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden bg-muted border border-border shadow-xl">
            {poster ? (
              <Image
                src={poster}
                alt={film.title}
                fill
                sizes="(max-width: 768px) 192px, 256px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <span className="text-5xl">🎬</span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{film.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
            {film.year && <span>{film.year}</span>}
            {film.runtime_minutes && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRuntime(film.runtime_minutes)}
                </span>
              </>
            )}
            {film.rewatch === 1 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-primary">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rewatch
                </span>
              </>
            )}
          </div>

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {genres.map((g) => (
                <Link key={g.name} href={`/search?genre=${encodeURIComponent(g.name)}`}>
                  <GenreBadge name={g.name} />
                </Link>
              ))}
            </div>
          )}

          {/* Dad's rating */}
          <div className="mt-5">
            {film.rating !== null ? (
              <div className="inline-flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dad&apos;s rating
                </span>
                <StarRating rating={film.rating} size="lg" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not yet rated</p>
            )}
          </div>

          {film.watch_date && (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Watched {film.watch_date}</span>
            </div>
          )}

          {film.review_text && (
            <blockquote className="mt-5 border-l-2 border-primary pl-4 text-sm leading-relaxed text-foreground/90 italic">
              &ldquo;{film.review_text}&rdquo;
            </blockquote>
          )}

          {film.overview && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{film.overview}</p>
          )}

          {directors.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {directors.length === 1 ? "Director" : "Directors"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {directors.map((d) => (
                  <Link
                    key={d.name}
                    href={`/search?director=${encodeURIComponent(d.name)}`}
                    className="text-sm hover:text-primary transition-colors"
                  >
                    {d.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* External links */}
          <div className="mt-5 flex flex-wrap gap-3">
            {film.letterboxd_uri && <OutboundLink href={film.letterboxd_uri} label="Letterboxd" />}
            {imdbUrl && <OutboundLink href={imdbUrl} label="IMDb" />}
            {tmdbUrl && <OutboundLink href={tmdbUrl} label="TMDB" />}
          </div>
        </div>
      </div>

      {cast.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Cast
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {cast.map((actor) => (
              <ActorCard key={actor.name} {...actor} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OutboundLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs",
        "text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
      )}
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  );
}

function ActorCard({ name, profile_path }: {
  name: string;
  profile_path: string | null;
  tmdb_id: number | null;
  billing_order: number | null;
}) {
  const photo = posterUrl(profile_path, "w185");

  return (
    <Link
      href={`/search?q=${encodeURIComponent(name)}`}
      className="group flex flex-col items-center gap-1.5 text-center"
    >
      <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden bg-muted border border-border group-hover:border-primary/40 transition-colors">
        {photo ? (
          <Image
            src={photo}
            alt={name}
            fill
            sizes="(max-width: 640px) 30vw, 15vw"
            className="object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-2xl">
            👤
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-tight line-clamp-2">
        {name}
      </span>
    </Link>
  );
}
