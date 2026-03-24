"use client";

import { Film, Star, Users, Clapperboard, Calendar, RefreshCw } from "lucide-react";
import type { AnalyticsData } from "@/app/analytics/page";

interface Props {
  stats: AnalyticsData["stats"];
}

export function StatCards({ stats }: Props) {
  const cards = [
    { icon: Film, label: "Films watched", value: stats.total_films.toLocaleString() },
    {
      icon: Star,
      label: "Avg. rating",
      value: stats.avg_rating ? `${stats.avg_rating.toFixed(2)}` : "—",
    },
    { icon: Users, label: "Directors", value: stats.total_directors.toLocaleString() },
    { icon: Clapperboard, label: "Genres", value: stats.total_genres.toLocaleString() },
    {
      icon: Calendar,
      label: "Year span",
      value:
        stats.earliest_year && stats.latest_year
          ? `${stats.earliest_year}–${stats.latest_year}`
          : "—",
    },
    { icon: RefreshCw, label: "Rewatches", value: stats.total_rewatches.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1.5">
          <Icon className="h-4 w-4 text-primary" />
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
