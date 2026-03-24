"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PRIMARY_DIM = "#d4913ab3";
const TICK = "#71717a";
const GRID = "#3f3f46";
const TOOLTIP_BG = "#171717";
const TOOLTIP_BORDER = "#3f3f46";

interface Props {
  data: { name: string; film_count: number; avg_rating: number | null }[];
}

export function GenreBreakdownChart({ data }: Props) {
  const chartData = data.slice(0, 15);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: TICK }}
          tickLine={false}
          axisLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
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
        <Bar
          dataKey="film_count"
          name="films"
          fill={PRIMARY_DIM}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
