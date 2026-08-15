import { useMemo } from "react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { STATIONS } from "@/lib/rail/data";
import type { NetworkOverview } from "@/lib/rail/engine";

const W = 800;
const H = 460;
const PAD = 56;

function useProjection() {
  return useMemo(() => {
    const lats = STATIONS.map((s) => s.Latitude);
    const lons = STATIONS.map((s) => s.Longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return (lat: number, lon: number) => ({
      x: PAD + ((lon - minLon) / (maxLon - minLon || 1)) * (W - PAD * 2),
      y: H - PAD - ((lat - minLat) / (maxLat - minLat || 1)) * (H - PAD * 2),
    });
  }, []);
}

function trainColor(delay: number) {
  if (delay <= 5) return "var(--color-success)";
  if (delay <= 15) return "var(--color-warning)";
  return "var(--color-destructive)";
}

export function NetworkMap({
  live,
  className,
}: {
  live: NetworkOverview["live"];
  className?: string;
}) {
  const project = useProjection();
  const hub = STATIONS[0];

  return (
    <div className={cn("relative overflow-hidden rounded-2xl surface-card", className)}>
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="relative block h-full w-full"
        role="img"
        aria-label="Live map of Karnataka rail corridors and running trains"
      >
        {hub
          ? STATIONS.slice(1).map((station) => {
              const a = project(hub.Latitude, hub.Longitude);
              const b = project(station.Latitude, station.Longitude);
              return (
                <line
                  key={`corridor-${station.StationID}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="color-mix(in oklab, var(--color-primary) 30%, transparent)"
                  strokeWidth={1.5}
                  strokeDasharray="6 8"
                  className="animate-dash"
                />
              );
            })
          : null}

        {STATIONS.map((station) => {
          const { x, y } = project(station.Latitude, station.Longitude);
          return (
            <g key={station.StationID}>
              <circle cx={x} cy={y} r={5} fill="var(--color-background)" stroke="var(--color-primary)" strokeWidth={2} />
              <text
                x={x + 10}
                y={y + 4}
                className="fill-muted-foreground"
                style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
              >
                {station.StationCode}
              </text>
            </g>
          );
        })}

        {live.map((train) => {
          const { x, y } = project(train.Lat, train.Lon);
          const color = trainColor(train.Delay);
          return (
            <g key={train.TrainID}>
              <circle cx={x} cy={y} r={12} fill={color} opacity={0.18} />
              <circle cx={x} cy={y} r={5.5} fill={color}>
                <title>{`${train.TrainName} · ${train.Current} · ${train.Delay} min delay`}</title>
              </circle>
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute right-3 bottom-3 flex flex-wrap gap-2 sm:right-4 sm:bottom-4">
        {[
          { label: "On time", color: "var(--color-success)" },
          { label: "Minor", color: "var(--color-warning)" },
          { label: "Major", color: "var(--color-destructive)" },
        ].map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-1.5 rounded-full border border-border bg-background/85 px-2.5 py-1 text-[11px] backdrop-blur"
          >
            <span className="size-2 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="absolute top-3 left-3 flex flex-wrap gap-2 sm:top-4 sm:left-4">
        {live.slice(0, 3).map((train) => (
          <Link
            key={train.TrainID}
            to="/trains/$trainId"
            params={{ trainId: train.TrainID }}
            className="rounded-full border border-border bg-background/85 px-2.5 py-1 font-mono text-[11px] backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
          >
            {train.TrainID} · {train.Delay}m
          </Link>
        ))}
      </div>
    </div>
  );
}
