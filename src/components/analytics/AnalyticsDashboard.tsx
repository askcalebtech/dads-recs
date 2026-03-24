"use client";

import type { AnalyticsData } from "@/app/analytics/page";
import { StatCards } from "./StatCards";
import { RatingDistributionChart } from "./RatingDistributionChart";
import { FilmsPerYearChart } from "./FilmsPerYearChart";
import { TopDirectorsChart } from "./TopDirectorsChart";
import { TopActorsChart } from "./TopActorsChart";
import { GenreBreakdownChart } from "./GenreBreakdownChart";
import { RatingByGenreChart } from "./RatingByGenreChart";
import { DecadeDistributionChart } from "./DecadeDistributionChart";

interface Props {
  data: AnalyticsData;
}

export function AnalyticsDashboard({ data }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <StatCards stats={data.stats} />

      {/* Row 1: Rating distribution + Films per year */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Rating Distribution">
          <RatingDistributionChart data={data.ratingDistribution} />
        </ChartCard>
        <ChartCard title="Films Watched per Year">
          <FilmsPerYearChart data={data.filmsPerYear} />
        </ChartCard>
      </div>

      {/* Row 2: Decade distribution + Rating by genre */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Films by Decade">
          <DecadeDistributionChart data={data.decadeDistribution} />
        </ChartCard>
        <ChartCard title="Avg. Rating by Genre" subtitle="genres with 5+ films">
          <RatingByGenreChart data={data.ratingByGenre} />
        </ChartCard>
      </div>

      {/* Row 3: Genre breakdown (full width) */}
      <ChartCard title="Genre Breakdown">
        <GenreBreakdownChart data={data.genreBreakdown} />
      </ChartCard>

      {/* Row 4: Top directors + Top actors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Directors" subtitle="by avg. rating, min. 2 films">
          <TopDirectorsChart data={data.topDirectors} />
        </ChartCard>
        <ChartCard title="Top Actors" subtitle="by appearances">
          <TopActorsChart data={data.topActors} />
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
