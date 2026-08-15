import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";

import { AppShell } from "@/components/rail/app-shell";
import {
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

export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Train Rankings — RailSense" },
      { name: "description", content: "Punctuality leaderboard for Karnataka trains, ranked by on-time performance." },
      { property: "og:title", content: "Train Rankings — RailSense" },
      { property: "og:description", content: "Which services run on time and which consistently slip." },
    ],
  }),
  component: RankingsPage,
});

const trendMeta = {
  improving: { icon: TrendingUp, tone: "success" as const },
  stable: { icon: Minus, tone: "neutral" as const },
  declining: { icon: TrendingDown, tone: "danger" as const },
};

function RankingsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => railApi.rankings(),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Performance"
          title="Train rankings"
          description="Services ranked by punctuality rate across recorded trips."
        />

        {isError ? (
          <ErrorState description="Ranking data unavailable." onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                label="Trains ranked"
                value={data.total_trains}
                icon={<Trophy className="size-4.5" />}
              />
              <KpiCard
                label="Best punctuality"
                value={`${Math.round(data.overall_stats["top_punctual"] ?? 0)}%`}
                tone="success"
              />
              <KpiCard
                label="Network average delay"
                value={Math.round(data.overall_stats["avg_delay"] ?? 0)}
                unit="min"
                tone="warning"
              />
            </div>

            <div className="space-y-3">
              {data.rankings.map((train, i) => {
                const { icon: TrendIcon, tone } = trendMeta[train.Trend];
                return (
                  <SurfaceCard
                    key={train.TrainID}
                    className="animate-rise p-4 sm:p-5"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,240px)_auto] lg:items-center">
                      <span
                        className={
                          train.Rank <= 3
                            ? "grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 font-mono text-sm font-bold text-primary"
                            : "grid size-10 shrink-0 place-items-center rounded-xl bg-secondary font-mono text-sm font-bold text-muted-foreground"
                        }
                      >
                        {train.Rank}
                      </span>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">{train.TrainName}</h3>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {train.TrainID} · {train.Route}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                          <span className="truncate text-muted-foreground">Punctuality</span>
                          <span className="font-mono font-semibold">{train.PunctualityRate}%</span>
                        </div>
                        <Progress value={train.PunctualityRate} className="mt-1.5 h-1.5" />
                        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                          {train.OnTimeTrips}/{train.TotalTrips} on time · avg {train.AvgDelay} min
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={tone}>
                          <TrendIcon className="size-3" />
                          {train.Trend}
                        </StatusBadge>
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/trains/$trainId" params={{ trainId: train.TrainID }}>
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
