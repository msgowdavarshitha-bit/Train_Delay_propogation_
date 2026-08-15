import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/rail/app-shell";
import { NetworkMap } from "@/components/rail/network-map";
import {
  DelayIndicator,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  SurfaceCard,
} from "@/components/rail/primitives";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { railApi } from "@/lib/rail/api";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Tracking — RailSense" },
      { name: "description", content: "Track every running Karnataka train live with position, progress and delay." },
      { property: "og:title", content: "Live Tracking — RailSense" },
      { property: "og:description", content: "Real-time train positions, progress bars and delay status." },
    ],
  }),
  component: LivePage,
});

const statusTone = {
  running: "success",
  scheduled: "info",
  completed: "neutral",
} as const;

function LivePage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["overview"],
    queryFn: () => railApi.overview(),
    refetchInterval: 20_000,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Live operations"
          title="Live train tracking"
          description="Positions refresh automatically every 20 seconds across the Karnataka corridor."
          actions={
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} /> Refresh
            </Button>
          }
        />

        {isError ? (
          <ErrorState description="Live feed unavailable right now." onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <>
            <NetworkMap live={data.live} className="h-[380px] sm:h-[460px]" />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.live.map((train, i) => (
                <SurfaceCard
                  key={train.TrainID}
                  className="animate-rise p-4"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{train.TrainName}</h3>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{train.TrainID}</p>
                    </div>
                    <StatusBadge tone={statusTone[train.Status]} dot>
                      {train.Status}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Progress value={train.Progress} className="h-1.5" />
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {train.Current}
                        {train.Next ? ` → ${train.Next}` : " · final stop"}
                      </span>
                      <span className="font-mono">{train.Progress}%</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <DelayIndicator delay={train.Delay} />
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/trains/$trainId" params={{ trainId: train.TrainID }}>
                        <Activity className="size-4" /> Details
                      </Link>
                    </Button>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
