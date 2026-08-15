import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bus, Car, Plane, Route as RouteIcon, TrainFront } from "lucide-react";

import { AppShell } from "@/components/rail/app-shell";
import { StationSelect } from "@/components/rail/station-select";
import {
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  SurfaceCard,
} from "@/components/rail/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { railApi } from "@/lib/rail/api";
import type { Alternative } from "@/lib/rail/engine";

export const Route = createFileRoute("/alternatives")({
  head: () => ({
    meta: [
      { title: "Alternative Transport — RailSense" },
      { name: "description", content: "Compare bus, cab and flight against a delayed train on time and cost." },
      { property: "og:title", content: "Alternative Transport — RailSense" },
      { property: "og:description", content: "Find the fastest way through when your train is running late." },
    ],
  }),
  component: AlternativesPage,
});

const ICONS = {
  Train: TrainFront,
  Bus: Bus,
  Car: Car,
  Flight: Plane,
} as const;

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function AlternativeCard({
  option,
  recommended,
  index,
}: {
  option: Alternative;
  recommended: boolean;
  index: number;
}) {
  const Icon = ICONS[option.type];
  return (
    <SurfaceCard
      className={
        recommended
          ? "animate-rise border-primary/40 p-5 ring-1 ring-primary/20"
          : "animate-rise p-5"
      }
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{option.type}</h3>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {option.departure_time} → {option.arrival_time}
          </p>
        </div>
        {recommended ? <StatusBadge tone="success">Recommended</StatusBadge> : null}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div>
          <dt className="label-meta">Duration</dt>
          <dd className="mt-1 font-mono text-sm font-bold">{formatDuration(option.duration)}</dd>
        </div>
        <div>
          <dt className="label-meta">Cost</dt>
          <dd className="mt-1 font-mono text-sm font-bold">₹{option.cost}</dd>
        </div>
        <div>
          <dt className="label-meta">Delay</dt>
          <dd className="mt-1 font-mono text-sm font-bold">{option.delay} min</dd>
        </div>
      </dl>

      <p className="mt-3 truncate text-xs text-muted-foreground">
        {option.available ? `Next available ${option.next_available}` : "Not available on this corridor"}
      </p>
    </SurfaceCard>
  );
}

function AlternativesPage() {
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => railApi.stations() });
  const [source, setSource] = useState("SBC");
  const [destination, setDestination] = useState("HAS");
  const [delay, setDelay] = useState(45);

  const compare = useMutation({
    mutationFn: () => railApi.alternatives(source, destination, delay),
  });
  const result = compare.data;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Contingency"
          title="Alternative transport"
          description="When a train slips, compare road, cab and air options on total time and cost."
        />

        <SurfaceCard className="p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto] lg:items-end">
            <StationSelect label="From" stations={stations} value={source} onChange={setSource} />
            <StationSelect label="To" stations={stations} value={destination} onChange={setDestination} />
            <div className="min-w-0">
              <p className="label-meta mb-1.5">Train delay (min)</p>
              <Input
                type="number"
                min={0}
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="h-12 rounded-xl bg-secondary/50"
              />
            </div>
            <Button
              size="lg"
              className="h-12 rounded-xl"
              onClick={() => compare.mutate()}
              disabled={compare.isPending || source === destination}
            >
              <RouteIcon className="size-4" /> Compare
            </Button>
          </div>
        </SurfaceCard>

        {compare.isPending ? <LoadingSkeleton rows={2} /> : null}
        {compare.isError ? (
          <ErrorState
            description="Could not compare alternatives for this corridor."
            onRetry={() => compare.mutate()}
          />
        ) : null}

        {result ? (
          <>
            <SurfaceCard className="grid gap-2 p-5 sm:grid-cols-3">
              <div>
                <p className="label-meta">Corridor</p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {result.source} → {result.destination}
                </p>
              </div>
              <div>
                <p className="label-meta">Distance</p>
                <p className="mt-1 font-mono text-sm font-semibold">{Math.round(result.distance)} km</p>
              </div>
              <div>
                <p className="label-meta">Train delay</p>
                <p className="mt-1 font-mono text-sm font-semibold">{result.train_delay} min</p>
              </div>
            </SurfaceCard>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {result.alternatives.map((option, i) => (
                <AlternativeCard
                  key={option.type}
                  option={option}
                  recommended={option.type === result.recommended}
                  index={i}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
