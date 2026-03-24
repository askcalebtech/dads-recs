"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const PRIMARY = "#d4913a";
const PRIMARY_DIM = "#d4913a80";
const TICK = "#71717a";
const GRID = "#3f3f46";
const TOOLTIP_BG = "#171717";
const TOOLTIP_BORDER = "#3f3f46";

interface Props {
  data: { rating: number; count: number }[];
}

const ALL_RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export function RatingDistributionChart({ data }: Props) {
  const countByRating = Object.fromEntries(data.map((d) => [d.rating, d.count]));
  const chartData = ALL_RATINGS.map((r) => ({
    rating: r,
    label: r % 1 === 0 ? `${r}★` : `${r}`,
    count: countByRating[r] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: TICK }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: TICK }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "#27272a" }}
          contentStyle={{
            background: TOOLTIP_BG,
            border: `1px solid ${TOOLTIP_BORDER}`,
            borderRadius: "0.5rem",
            fontSize: 12,
          }}
          labelStyle={{ color: "#fafafa", fontWeight: 600 }}
          itemStyle={{ color: "#a1a1aa" }}
          formatter={(v) => [Number(v), "films"]}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {chartData.map((entry) => (
            <Cell
              key={entry.rating}
              fill={entry.rating >= 4 ? PRIMARY : PRIMARY_DIM}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
