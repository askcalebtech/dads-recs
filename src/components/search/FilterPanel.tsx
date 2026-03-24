"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface Filters {
  genres: string[];
  yearMin: string;
  yearMax: string;
  ratingMin: string;
  decade: string;
  sortBy: string;
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  availableGenres: { name: string; count: number }[];
  yearRange: { min_year: number; max_year: number };
}

const SORT_OPTIONS = [
  { value: "title_asc", label: "Title A–Z" },
  { value: "rating_desc", label: "Rating: High → Low" },
  { value: "rating_asc", label: "Rating: Low → High" },
  { value: "year_desc", label: "Year: Newest first" },
  { value: "year_asc", label: "Year: Oldest first" },
  { value: "watch_date_desc", label: "Watch date: Recent first" },
  { value: "watch_date_asc", label: "Watch date: Oldest first" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "5", label: "★★★★★  5.0" },
  { value: "4.5", label: "★★★★½  4.5+" },
  { value: "4", label: "★★★★   4.0+" },
  { value: "3.5", label: "★★★½   3.5+" },
  { value: "3", label: "★★★    3.0+" },
];

export function FilterPanel({ filters, onChange, availableGenres, yearRange }: FilterPanelProps) {
  const hasActiveFilters =
    filters.genres.length > 0 ||
    filters.yearMin ||
    filters.yearMax ||
    filters.ratingMin ||
    filters.decade;

  function toggleGenre(name: string) {
    const next = filters.genres.includes(name)
      ? filters.genres.filter((g) => g !== name)
      : [...filters.genres, name];
    onChange({ ...filters, genres: next });
  }

  function clearAll() {
    onChange({ genres: [], yearMin: "", yearMax: "", ratingMin: "", decade: "", sortBy: filters.sortBy });
  }

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Sort */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Sort by
        </label>
        <Select value={filters.sortBy} onValueChange={(v) => onChange({ ...filters, sortBy: v ?? "year_desc" })}>
          <SelectTrigger className="h-8 text-sm w-full">
            <span className="flex-1 text-left truncate">
              {SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label ?? "Title A–Z"}
            </span>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs justify-start px-0 text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3 mr-1" />
          Clear filters
        </Button>
      )}

      {/* Minimum rating */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Min. rating
        </label>
        <Select value={filters.ratingMin} onValueChange={(v) => onChange({ ...filters, ratingMin: v ?? "" })}>
          <SelectTrigger className="h-8 text-sm w-full">
            <span className="flex-1 text-left truncate">
              {RATING_OPTIONS.find((o) => o.value === filters.ratingMin)?.label ?? "Any rating"}
            </span>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {RATING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year range */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Year
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={String(yearRange.min_year)}
            min={yearRange.min_year}
            max={yearRange.max_year}
            value={filters.yearMin}
            onChange={(e) => onChange({ ...filters, yearMin: e.target.value, decade: "" })}
            className="h-8 text-sm w-[80px]"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder={String(yearRange.max_year)}
            min={yearRange.min_year}
            max={yearRange.max_year}
            value={filters.yearMax}
            onChange={(e) => onChange({ ...filters, yearMax: e.target.value, decade: "" })}
            className="h-8 text-sm w-[80px]"
          />
        </div>
      </div>

      {/* Genres */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Genres
        </label>
        <div className="flex flex-col gap-1.5">
          {availableGenres.map(({ name, count }) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                id={`genre-${name}`}
                checked={filters.genres.includes(name)}
                onCheckedChange={() => toggleGenre(name)}
              />
              <span className="text-sm group-hover:text-foreground text-muted-foreground transition-colors">
                {name}
              </span>
              <span className="ml-auto text-xs text-muted-foreground/60">{count}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
