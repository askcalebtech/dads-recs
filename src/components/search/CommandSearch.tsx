"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Search, X } from "lucide-react";
import Image from "next/image";
import { posterUrl, cn } from "@/lib/utils";
import { StarRating } from "@/components/film/StarRating";

interface SearchResult {
  film_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  rating: number | null;
  genres: string[];
}

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Register Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=8&sortBy=title_asc`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const films = (data.films as Array<SearchResult & { genres: string | string[] }>).map((f) => ({
        ...f,
        genres: Array.isArray(f.genres) ? f.genres : f.genres ? String(f.genres).split(",") : [],
      }));
      setResults(films);
      setActiveIndex(0);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(q), 250);
  }

  function navigate(filmId: number) {
    setOpen(false);
    router.push(`/film/${filmId}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (results[activeIndex]) {
        navigate(results[activeIndex].film_id);
      } else if (query.trim()) {
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function goToFullSearch() {
    setOpen(false);
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
  }

  return (
    <>
      {/* Trigger button shown in header */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "hidden sm:flex items-center gap-2 rounded-md border border-border bg-card/60",
          "px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
        )}
      >
        <Search className="h-3 w-3" />
        <span>Quick search</span>
        <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-starting-style:opacity-0 data-ending-style:opacity-0 transition-opacity duration-150" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-card shadow-2xl data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95 transition-all duration-150">
            {/* Input row */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search films, directors, actors…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => handleQueryChange("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                esc
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <ul className="max-h-80 overflow-y-auto py-1.5">
                {results.map((film, idx) => {
                  const poster = posterUrl(film.poster_path, "w185");
                  return (
                    <li key={film.film_id}>
                      <button
                        onClick={() => navigate(film.film_id)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                          idx === activeIndex ? "bg-accent" : "hover:bg-accent/50"
                        )}
                      >
                        <div className="relative w-8 shrink-0 aspect-[2/3] rounded overflow-hidden bg-muted">
                          {poster ? (
                            <Image src={poster} alt={film.title} fill sizes="32px" className="object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">🎬</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{film.title}</p>
                          <p className="text-xs text-muted-foreground">{film.year ?? "—"}</p>
                        </div>
                        {film.rating !== null && (
                          <StarRating rating={film.rating} size="sm" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Loading / empty state */}
            {loading && (
              <p className="px-4 py-3 text-xs text-muted-foreground">Searching…</p>
            )}
            {!loading && query && results.length === 0 && (
              <p className="px-4 py-3 text-xs text-muted-foreground">No films found for &ldquo;{query}&rdquo;</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> open</span>
              </div>
              <button
                onClick={goToFullSearch}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Full search →
              </button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
