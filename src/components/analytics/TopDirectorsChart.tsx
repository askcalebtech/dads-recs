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
import { useRouter } from "next/navigation";

const PRIMARY = "#d4913a";
const PRIMARY_DIM = "#d4913a80";
const TICK = "#71717a";
const GRID = "#3f3f46";
const TOOLTIP_BG = "#171717";
const TOOLTIP_BORDER = "#3f3f46";

interface Props {
  data: { name: string; film_count: number; avg_rating: number }[];
}

export function TopDirectorsChart({ data }: Props) {
  const router = useRouter();

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 48, left: 8, bottom: 0 }}
        onClick={(payload: unknown) => {
          const d = payload as { activePayload?: { payload: { name: string } }[] } | null;
          if (d?.activePayload?.[0]) {
            router.push(`/search?director=${encodeURIComponent(d.activePayload[0].payload.name)}`);
          }
        }}
        style={{ cursor: "pointer" }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 5]}
          tickCount={6}
          tick={{ fontSize: 11, fill: TICK }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 11, fill: TICK }}
          tickLine={false}
          axisLine={false}
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
          formatter={(v) => [Number(v).toFixed(2), "avg rating"]}
        />
        <Bar dataKey="avg_rating" name="avg_rating" radius={[0, 3, 3, 0]} maxBarSize={14}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.avg_rating >= 4 ? PRIMARY : PRIMARY_DIM}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
