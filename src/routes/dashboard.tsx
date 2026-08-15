import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  Clock,
  TrainFront,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/rail/app-shell";
import { NetworkMap } from "@/components/rail/network-map";
import {
  ChartCard,
  DelayIndicator,
  ErrorState,
  KpiCard,
  LoadingSkeleton,
  PageHeader,
  SurfaceCard,
} from "@/components/rail/primitives";
import { Button } from "@/components/ui/button";
import { railApi } from "@/lib/rail/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Network Overview — RailSense" },
      { name: "description", content: "Live Karnataka rail network KPIs, delay heatmaps and running trains." },
      { property: "og:title", content: "Network Overview — RailSense" },
      { property: "og:description", content: "Live KPIs, delay distribution and running trains across Karnataka." },
    ],
  }),
  component: Dashboard,
});

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
};

function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: () => railApi.overview(),
    refetchInterval: 30_000,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Command center"
          title="Network overview"
          description="Live status of every tracked train, delay pressure by station, and AI prediction volume."
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/live">
                  <Activity className="size-4" /> Live tracking
                </Link>
              </Button>
              <Button asChild>
                <Link to="/predict">
                  <Brain className="size-4" /> Predict delay
                </Link>
              </Button>
            </>
          }
        />

        {isError ? (
          <ErrorState description="The network feed did not respond." onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Trains tracked"
                value={data.totalTrains}
                icon={<TrainFront className="size-4.5" />}
                hint={`${data.activeTrains} currently running`}
              />
              <KpiCard
                label="Average delay"
                value={data.avgDelay}
                unit="min"
                tone="warning"
                icon={<Clock className="size-4.5" />}
                hint="Across all active services"
              />
              <KpiCard
                label="Delayed services"
                value={data.delayedTrains}
                tone="violet"
                icon={<AlertTriangle className="size-4.5" />}
                hint="More than 5 minutes behind"
              />
              <KpiCard
                label="On-time rate"
                value={`${data.onTimeRate}%`}
                tone="success"
                icon={<Activity className="size-4.5" />}
                hint={`${data.predictionsToday} predictions today`}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard title="Live corridor map" subtitle="Train positions across Karnataka">
                <NetworkMap live={data.live} className="h-[360px]" />
              </ChartCard>

              <SurfaceCard className="p-4 sm:p-5">
                <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <h3 className="truncate text-sm font-semibold">Running now</h3>
                  <Link to="/live" className="shrink-0 text-xs text-primary hover:underline">
                    View all
                  </Link>
                </div>
                <ul className="space-y-2.5">
                  {data.live.slice(0, 6).map((train) => (
                    <li key={train.TrainID}>
                      <Link
                        to="/trains/$trainId"
                        params={{ trainId: train.TrainID }}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 transition-colors hover:border-primary/30"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{train.TrainName}</span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">
                            {train.Current}
                            {train.Next ? ` → ${train.Next}` : ""}
                          </span>
                        </span>
                        <DelayIndicator delay={train.Delay} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </SurfaceCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Delay trend by departure window" subtitle="Average predicted delay (minutes)">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.hourlyTrend}>
                    <defs>
                      <linearGradient id="delayFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={30} />
                    <RTooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="delay"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#delayFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Delay distribution" subtitle="Services grouped by delay band">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.delayDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={30} allowDecimals={false} />
                    <RTooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                    <Bar dataKey="trains" fill="var(--color-violet)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <SurfaceCard className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">Need a backup plan?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Compare bus, cab and flight options against a delayed train on any corridor.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/alternatives">
                  Compare alternatives <ArrowRight className="size-4" />
                </Link>
              </Button>
            </SurfaceCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
