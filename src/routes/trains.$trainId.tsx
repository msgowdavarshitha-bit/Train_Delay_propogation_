import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gauge, MapPin, RefreshCw, TrainFront } from "lucide-react";

import { AppShell } from "@/components/rail/app-shell";
import { JourneyTimeline } from "@/components/rail/journey-timeline";
import {
  ChartCard,
  DelayIndicator,
  ErrorState,
  KpiCard,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  SurfaceCard,
} from "@/components/rail/primitives";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { railApi } from "@/lib/rail/api";
import { formatTimeAmPm } from "@/lib/rail/data";

export const Route = createFileRoute("/trains/$trainId")({
  head: ({ params }) => ({
    meta: [
      { title: `Train ${params.trainId} — Live Status | RailSense` },
      {
        name: "description",
        content: `Live running status, journey timeline and delay forecast for train ${params.trainId}.`,
      },
      { property: "og:title", content: `Train ${params.trainId} — Live Status` },
      { property: "og:description", content: "Journey timeline, progress and delay intelligence." },
    ],
  }),
  component: TrainDetail,
});

const statusTone = {
  running: "success",
  scheduled: "info",
  completed: "neutral",
} as const;

function TrainDetail() {
  const { trainId } = Route.useParams();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["track", trainId],
    queryFn: () => railApi.track(trainId),
    refetchInterval: 20_000,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/live">
            <ArrowLeft className="size-4" /> Back to live tracking
          </Link>
        </Button>

        {isError ? (
          <ErrorState description={`We couldn't load train ${trainId}.`} onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <>
            <PageHeader
              eyebrow={`${data.TrainID} · ${data.TrainType}`}
              title={data.TrainName}
              description={`Last updated ${formatTimeAmPm(data.LastUpdated)} · auto-refreshing`}
              actions={
                <>
                  <StatusBadge tone={statusTone[data.Status]} dot>
                    {data.Status}
                  </StatusBadge>
                  <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} /> Refresh
                  </Button>
                </>
              }
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Predicted delay"
                value={data.PredictedDelay}
                unit="min"
                tone="warning"
                icon={<TrainFront className="size-4.5" />}
              />
              <KpiCard
                label="Journey progress"
                value={`${data.Progress}%`}
                icon={<Gauge className="size-4.5" />}
                hint={data.NextStation ? `Next: ${data.NextStation.StationName}` : "Final stop reached"}
              />
              <KpiCard
                label="Average speed"
                value={data.SpeedKmph}
                unit="km/h"
                tone="cyan"
                hint="Rolling estimate"
              />
              <KpiCard
                label="Expected arrival"
                value={formatTimeAmPm(data.ExpectedArrival)}
                tone="violet"
                icon={<MapPin className="size-4.5" />}
              />
            </div>

            <SurfaceCard className="p-4 sm:p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="label-meta">Currently at</p>
                  <p className="mt-1 truncate text-lg font-semibold">{data.CurrentStation.StationName}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {data.CurrentStation.StationCode} · {data.CurrentStation.Distance} km covered
                  </p>
                </div>
                <DelayIndicator delay={data.PredictedDelay} />
              </div>
              <Progress value={data.Progress} className="mt-4 h-2" />
            </SurfaceCard>

            <ChartCard title="Journey timeline" subtitle="Halts, scheduled times and live position">
              <JourneyTimeline route={data.Route} progress={data.Progress} delay={data.PredictedDelay} />
            </ChartCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <SurfaceCard className="p-5">
                <h3 className="text-sm font-semibold">Delay causes on this service</h3>
                <ul className="mt-4 space-y-3">
                  {Object.entries(data.DelayReasons).map(([reason, count]) => {
                    const total = Object.values(data.DelayReasons).reduce((s, n) => s + n, 0) || 1;
                    return (
                      <li key={reason}>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                          <span className="truncate">{reason}</span>
                          <span className="font-mono text-muted-foreground">
                            {Math.round((count / total) * 100)}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(count / total) * 100}%`, background: "var(--gradient-primary)" }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </SurfaceCard>

              <SurfaceCard className="p-5">
                <h3 className="text-sm font-semibold">All halts</h3>
                <ul className="mt-4 space-y-2">
                  {data.Route.map((stop) => (
                    <li
                      key={stop.StationID}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{stop.StationName}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {stop.StationCode} · {stop.City}
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-mono text-xs">
                        {formatTimeAmPm(stop.ArrivalTime)}
                        <span className="block text-[10px] text-muted-foreground">{stop.Distance} km</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </SurfaceCard>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
