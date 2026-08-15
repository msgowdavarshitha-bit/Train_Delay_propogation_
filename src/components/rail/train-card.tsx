import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Gauge, TrainFront } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DelayIndicator, StatusBadge, SurfaceCard } from "@/components/rail/primitives";
import { formatTimeAmPm } from "@/lib/rail/data";
import type { SearchResult } from "@/lib/rail/engine";

export function TrainResultCard({ train, index = 0 }: { train: SearchResult; index?: number }) {
  const topReason = Object.entries(train.DelayReasons).sort((a, b) => b[1] - a[1])[0];

  return (
    <SurfaceCard
      className="animate-rise p-4 sm:p-5"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <TrainFront className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">{train.TrainName}</h3>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {train.TrainID} · {train.TrainType} · {train.Classes}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div>
              <p className="label-meta">Departs</p>
              <p className="font-mono text-lg font-bold">{formatTimeAmPm(train.DepartureTime)}</p>
            </div>
            <ArrowRight className="mt-4 size-4 text-muted-foreground" />
            <div>
              <p className="label-meta">Arrives</p>
              <p className="font-mono text-lg font-bold">{formatTimeAmPm(train.ArrivalTime)}</p>
            </div>
            <div>
              <p className="label-meta">Distance</p>
              <p className="font-mono text-lg font-bold">
                {train.Distance}
                <span className="ml-1 text-xs text-muted-foreground">km</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
          <DelayIndicator delay={train.PredictedDelay} />
          {topReason ? (
            <StatusBadge tone="violet">{topReason[0]}</StatusBadge>
          ) : null}
          <Button asChild size="sm" className="lg:mt-2">
            <Link to="/trains/$trainId" params={{ trainId: train.TrainID }}>
              Track train <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" /> AI predicted delay {train.PredictedDelay} min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="size-3.5" /> Confidence high · historical model
        </span>
      </div>
    </SurfaceCard>
  );
}
