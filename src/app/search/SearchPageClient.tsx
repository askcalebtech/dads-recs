"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilmCard, FilmCardSkeleton } from "@/components/film/FilmCard";
import { FilterPanel, type Filters } from "@/components/search/FilterPanel";

interface SearchResult {
  film_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  runtime_minutes: number | null;
  rating: number | null;
  watch_date: string | null;
  rewatch: boolean;
  genres: string[];
  directors: string[];
}

interface FilterOptions {
  genres: { name: string; count: number }[];
  yearRange: { min_year: number; max_year: number };
}

const LIMIT = 60;

function filtersToParams(query: string, filters: Filters, offset: number): URLSearchParams {
  const p = new URLSearchParams();
  if (query) p.set("q", query);
  filters.genres.forEach((g) => p.append("genre", g));
  if (filters.yearMin) p.set("yearMin", filters.yearMin);
  if (filters.yearMax) p.set("yearMax", filters.yearMax);
  if (filters.ratingMin) p.set("ratingMin", filters.ratingMin);
  if (filters.decade) p.set("decade", filters.decade);
  if (filters.sortBy && filters.sortBy !== "year_desc") p.set("sortBy", filters.sortBy);
  if (offset > 0) p.set("offset", String(offset));
  return p;
}

export function SearchPageClient({ filterOptions }: { filterOptions: FilterOptions }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise state from URL
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [filters, setFilters] = useState<Filters>({
    genres: searchParams.getAll("genre"),
    yearMin: searchParams.get("yearMin") ?? "",
    yearMax: searchParams.get("yearMax") ?? "",
    ratingMin: searchParams.get("ratingMin") ?? "",
    decade: searchParams.get("decade") ?? "",
    sortBy: searchParams.get("sortBy") ?? "year_desc",
  });
  const [films, setFilms] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync URL without navigation (replace state)
  const syncUrl = useCallback(
    (q: string, f: Filters, off: number) => {
      const p = filtersToParams(q, f, off);
      router.replace(`/search?${p.toString()}`, { scroll: false });
    },
    [router]
  );

  const fetchFilms = useCallback(
    async (q: string, f: Filters, off: number, append: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const p = filtersToParams(q, f, off);
        p.set("limit", String(LIMIT));
        const res = await fetch(`/api/search?${p.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setFilms((prev) => (append ? [...prev, ...data.films] : data.films));
        setTotal(data.total);
      } catch (err) {
        if ((err as Error).name !== "AbortError") console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Debounced query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      syncUrl(query, filters, 0);
      fetchFilms(query, filters, 0, false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Immediate filter/sort change
  useEffect(() => {
    setOffset(0);
    syncUrl(query, filters, 0);
    fetchFilms(query, filters, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function loadMore() {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    syncUrl(query, filters, nextOffset);
    fetchFilms(query, filters, nextOffset, true);
  }

  const hasMore = total !== null && films.length < total;
  const activeFilterCount =
    filters.genres.length +
    (filters.yearMin || filters.yearMax ? 1 : 0) +
    (filters.ratingMin ? 1 : 0) +
    (filters.decade ? 1 : 0);

  const filterPanel = (
    <FilterPanel
      filters={filters}
      onChange={setFilters}
      availableGenres={filterOptions.genres}
      yearRange={{ min_year: filterOptions.yearRange.min_year, max_year: filterOptions.yearRange.max_year }}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, director, or genre…"
          className="pl-9 pr-9 h-11 text-base bg-card border-border focus-visible:ring-primary"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-52 shrink-0">
          {filterPanel}
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Toolbar: count + mobile filter trigger */}
          <div className="flex items-center justify-between mb-4 gap-3">
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Searching…"
                : total === null
                ? ""
                : `${total.toLocaleString()} film${total !== 1 ? "s" : ""}`}
            </p>

            {/* Mobile filters */}
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" size="sm" className="lg:hidden h-8 gap-1.5" />
                }
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0 leading-5">
                    {activeFilterCount}
                  </span>
                )}
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                {filterPanel}
              </SheetContent>
            </Sheet>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 20 }).map((_, i) => <FilmCardSkeleton key={i} />)}
            </div>
          ) : films.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
              <span className="text-5xl">🎬</span>
              <p className="text-lg font-medium">No films found</p>
              <p className="text-sm">Try a different search or adjust the filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {films.map((film) => (
                  <FilmCard key={film.film_id} {...film} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="min-w-32"
                  >
                    {loadingMore ? "Loading…" : `Load more (${total! - films.length} remaining)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
