import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Brain, Gauge, Radar, Route as RouteIcon, TrainFront } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard, StatusBadge, SurfaceCard } from "@/components/rail/primitives";
import { NetworkMap } from "@/components/rail/network-map";
import { railApi } from "@/lib/rail/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RailSense — Karnataka Train Delay & Live Tracking AI" },
      {
        name: "description",
        content:
          "Live train tracking, AI delay prediction and delay-propagation intelligence across the Karnataka rail network.",
      },
      { property: "og:title", content: "RailSense — Karnataka Train Delay Intelligence" },
      {
        property: "og:description",
        content: "Predict delays, watch propagation ripple across stations, and find faster alternatives.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Radar,
    title: "Live network tracking",
    body: "Every train plotted on the Karnataka corridor map with position, speed and next halt refreshed continuously.",
  },
  {
    icon: Brain,
    title: "AI delay prediction",
    body: "A trained model scores weather, season, day-of-week and holiday pressure to forecast arrival delay.",
  },
  {
    icon: Activity,
    title: "Delay propagation",
    body: "See how an initial delay compounds station by station before it reaches your destination.",
  },
  {
    icon: RouteIcon,
    title: "Smarter alternatives",
    body: "Compare bus, cab and flight against a delayed train on time, cost and availability.",
  },
];

function Landing() {
  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: () => railApi.overview() });

  return (
    <div className="ambient-glow min-h-screen bg-background">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="flex items-center gap-2.5">
          <span
            className="grid size-9 place-items-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <TrainFront className="size-4.5" />
          </span>
          <span className="text-sm font-bold tracking-tight">RailSense</span>
        </span>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/dashboard">Open console</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
          <div className="animate-rise min-w-0">
            <StatusBadge tone="info" dot>
              Karnataka rail network · live
            </StatusBadge>
            <h1 className="mt-5 text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Predict the delay
              <span className="text-gradient block">before it reaches you.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Know and plan your journey — RailSense fuses historical delay data, live running status and a
              delay-propagation engine into one command center for Karnataka trains.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/search">
                  Search trains <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/live">See live map</Link>
              </Button>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4">
              {[
                { label: "Trains tracked", value: overview?.totalTrains ?? "—" },
                { label: "Running now", value: overview?.activeTrains ?? "—" },
                { label: "On-time rate", value: overview ? `${overview.onTimeRate}%` : "—" },
              ].map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="label-meta truncate">{stat.label}</dt>
                  <dd className="mt-1 font-mono text-2xl font-bold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <GlassCard className="animate-rise overflow-hidden p-2 sm:p-3">
            <NetworkMap live={overview?.live ?? []} className="h-[320px] sm:h-[420px]" />
          </GlassCard>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <SurfaceCard
              key={title}
              className="animate-rise p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <SurfaceCard className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight">Run the full intelligence console</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Delay heatmaps, punctuality rankings, propagation charts and alert routing — all built on the
              same engine that powers the predictions above.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/dashboard">
              <Gauge className="size-4" /> Open dashboard
            </Link>
          </Button>
        </SurfaceCard>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>RailSense · Train delay propagation & live tracking, Karnataka</span>
          <Link to="/settings" className="hover:text-foreground">
            Data source settings
          </Link>
        </div>
      </footer>
    </div>
  );
}
