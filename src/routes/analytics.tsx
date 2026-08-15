import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/rail/app-shell";
import {
  ChartCard,
  ErrorState,
  KpiCard,
  LoadingSkeleton,
  PageHeader,
} from "@/components/rail/primitives";
import { railApi } from "@/lib/rail/api";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Delay Analytics — RailSense" },
      { name: "description", content: "Station delay pressure, cause breakdown and corridor performance analytics." },
      { property: "og:title", content: "Delay Analytics — RailSense" },
      { property: "og:description", content: "Where delays build up and what causes them across Karnataka." },
    ],
  }),
  component: AnalyticsPage,
});

const PIE_COLORS = [
  "var(--color-primary)",
  "var(--color-violet)",
  "var(--color-cyan)",
  "var(--color-warning)",
  "var(--color-destructive)",
  "var(--color-success)",
];

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
};

function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: () => railApi.overview(),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Insights"
          title="Delay analytics"
          description="Where delay accumulates across the network, and which causes drive it."
        />

        {isError ? (
          <ErrorState description="Analytics data unavailable." onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Average delay" value={data.avgDelay} unit="min" />
              <KpiCard label="On-time rate" value={`${data.onTimeRate}%`} tone="success" />
              <KpiCard label="Delayed services" value={data.delayedTrains} tone="warning" />
              <KpiCard label="Predictions today" value={data.predictionsToday} tone="violet" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Delay pressure by station" subtitle="Average accumulated delay (minutes)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.delayByStation} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis
                      type="category"
                      dataKey="station"
                      tick={{ fontSize: 11 }}
                      stroke="var(--color-muted-foreground)"
                      width={110}
                    />
                    <RTooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                    <Bar dataKey="delay" fill="var(--color-primary)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Delay causes" subtitle="Share of recorded delay incidents">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.reasons}
                      dataKey="count"
                      nameKey="reason"
                      innerRadius={62}
                      outerRadius={104}
                      paddingAngle={3}
                    >
                      {data.reasons.map((entry, i) => (
                        <Cell key={entry.reason} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {data.reasons.map((entry, i) => (
                    <li key={entry.reason} className="flex min-w-0 items-center gap-2 text-xs">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate">{entry.reason}</span>
                    </li>
                  ))}
                </ul>
              </ChartCard>
            </div>

            <ChartCard title="Departures vs delay by time window" subtitle="Two-hour buckets across the day">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.hourlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={32} />
                  <RTooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                  <Bar dataKey="departures" fill="var(--color-cyan)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="delay" fill="var(--color-violet)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
