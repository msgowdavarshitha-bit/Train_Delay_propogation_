import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, CalendarDays, Search as SearchIcon, TrainFront } from "lucide-react";

import { AppShell } from "@/components/rail/app-shell";
import { StationSelect } from "@/components/rail/station-select";
import { TrainResultCard } from "@/components/rail/train-card";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SurfaceCard,
} from "@/components/rail/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { railApi, todayISO } from "@/lib/rail/api";
import type { SearchResult } from "@/lib/rail/engine";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Trains — RailSense" },
      { name: "description", content: "Find Karnataka trains between any two stations with AI-predicted delays." },
      { property: "og:title", content: "Search Trains — RailSense" },
      { property: "og:description", content: "Search trains with predicted delay, classes and live tracking." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => railApi.stations() });
  const [source, setSource] = useState("SBC");
  const [destination, setDestination] = useState("HAS");
  const [date, setDate] = useState(todayISO());
  const [results, setResults] = useState<SearchResult[] | null>(null);

  const search = useMutation({
    mutationFn: () => railApi.search(source, destination, date),
    onSuccess: (data) => setResults(data),
  });

  const swap = () => {
    setSource(destination);
    setDestination(source);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Journey planner"
          title="Search trains"
          description="Pick a corridor and date — every result carries an AI delay forecast and one-tap live tracking."
        />

        <SurfaceCard className="p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,0.8fr)_auto] lg:items-end">
            <StationSelect
              label="From"
              stations={stations}
              value={source}
              onChange={setSource}
              placeholder="Origin station"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={swap}
              aria-label="Swap origin and destination"
              className="h-12 w-12 shrink-0 rounded-xl lg:mb-0"
            >
              <ArrowLeftRight className="size-4" />
            </Button>
            <StationSelect
              label="To"
              stations={stations}
              value={destination}
              onChange={setDestination}
              placeholder="Destination station"
            />
            <div className="min-w-0">
              <p className="label-meta mb-1.5">Date</p>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-primary" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12 rounded-xl border-border bg-secondary/50 pl-9"
                  aria-label="Journey date"
                />
              </div>
            </div>
            <Button
              size="lg"
              className="h-12 rounded-xl"
              onClick={() => search.mutate()}
              disabled={search.isPending || source === destination}
            >
              <SearchIcon className="size-4" />
              {search.isPending ? "Searching" : "Search"}
            </Button>
          </div>
          {source === destination ? (
            <p className="mt-3 text-xs text-destructive">Origin and destination must be different.</p>
          ) : null}
        </SurfaceCard>

        {search.isPending ? <LoadingSkeleton rows={3} /> : null}

        {search.isError ? (
          <ErrorState
            description="We couldn't reach the train service. Check your data source in Settings."
            onRetry={() => search.mutate()}
          />
        ) : null}

        {results && !search.isPending ? (
          results.length === 0 ? (
            <EmptyState
              icon={<TrainFront className="size-5" />}
              title="No direct trains found"
              description="No scheduled service links these stations. Try a nearby junction or compare alternative transport."
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {results.length} train{results.length > 1 ? "s" : ""} found · sorted by departure
              </p>
              {results.map((train, i) => (
                <TrainResultCard key={train.TrainID} train={train} index={i} />
              ))}
            </div>
          )
        ) : null}

        {!results && !search.isPending ? (
          <EmptyState
            icon={<SearchIcon className="size-5" />}
            title="Plan your journey"
            description="Choose an origin, destination and date to see trains with predicted delays."
          />
        ) : null}
      </div>
    </AppShell>
  );
}
