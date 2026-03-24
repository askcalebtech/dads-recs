"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PRIMARY = "#d4913a";
const PRIMARY_DIM = "#d4913a99";
const TICK = "#71717a";
const GRID = "#3f3f46";
const TOOLTIP_BG = "#171717";
const TOOLTIP_BORDER = "#3f3f46";

interface Props {
  data: { year: number; count: number; avg_rating: number | null }[];
}

export function FilmsPerYearChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: TICK }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="count"
          tick={{ fontSize: 11, fill: TICK }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="rating"
          orientation="right"
          domain={[0, 5]}
          tick={{ fontSize: 11, fill: TICK }}
          tickLine={false}
          axisLine={false}
          tickCount={6}
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
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: TICK }}
          iconType="circle"
          iconSize={8}
        />
        <Bar
          yAxisId="count"
          dataKey="count"
          name="Films"
          fill={PRIMARY_DIM}
          radius={[3, 3, 0, 0]}
          maxBarSize={24}
        />
        <Line
          yAxisId="rating"
          dataKey="avg_rating"
          name="Avg rating"
          stroke={PRIMARY}
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
