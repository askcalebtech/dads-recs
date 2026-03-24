import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function posterUrl(path: string | null, size: "w185" | "w300" | "w500" | "original" = "w300"): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";
  return `${base}/${size}${path}`;
}

export function formatRuntime(minutes: number | null): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const GENRE_STYLES: Record<string, string> = {
  "Action":          "bg-red-500/15 text-red-300 border-red-500/20",
  "Adventure":       "bg-orange-500/15 text-orange-300 border-orange-500/20",
  "Animation":       "bg-yellow-400/15 text-yellow-300 border-yellow-400/20",
  "Comedy":          "bg-green-500/15 text-green-300 border-green-500/20",
  "Crime":           "bg-purple-500/15 text-purple-300 border-purple-500/20",
  "Documentary":     "bg-blue-400/15 text-blue-300 border-blue-400/20",
  "Drama":           "bg-indigo-400/15 text-indigo-300 border-indigo-400/20",
  "Family":          "bg-pink-400/15 text-pink-300 border-pink-400/20",
  "Fantasy":         "bg-violet-500/15 text-violet-300 border-violet-500/20",
  "History":         "bg-amber-500/15 text-amber-300 border-amber-500/20",
  "Horror":          "bg-rose-900/30 text-rose-400 border-rose-700/30",
  "Music":           "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  "Mystery":         "bg-slate-500/15 text-slate-300 border-slate-500/20",
  "Romance":         "bg-rose-400/15 text-rose-300 border-rose-400/20",
  "Science Fiction": "bg-sky-500/15 text-sky-300 border-sky-500/20",
  "Thriller":        "bg-zinc-500/15 text-zinc-300 border-zinc-500/20",
  "TV Movie":        "bg-neutral-500/15 text-neutral-300 border-neutral-500/20",
  "War":             "bg-stone-500/15 text-stone-300 border-stone-500/20",
  "Western":         "bg-yellow-700/15 text-yellow-400 border-yellow-700/20",
};

export function genreStyle(name: string): string {
  return GENRE_STYLES[name] ?? "bg-zinc-700/30 text-zinc-300 border-zinc-600/30";
}
