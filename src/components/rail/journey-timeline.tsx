import { cn } from "@/lib/utils";
import { formatTimeAmPm } from "@/lib/rail/data";
import type { RouteStation } from "@/lib/rail/engine";

/**
 * Horizontal journey timeline: dots per station, animated train marker at the
 * live progress point. Falls back to a vertical layout on narrow screens.
 */
export function JourneyTimeline({
  route,
  progress,
  delay,
}: {
  route: RouteStation[];
  progress: number;
  delay: number;
}) {
  const tone = delay <= 5 ? "var(--color-success)" : delay <= 15 ? "var(--color-warning)" : "var(--color-destructive)";

  return (
    <div>
      {/* Horizontal (md+) */}
      <div className="relative hidden px-2 pt-10 pb-2 md:block">
        <div className="absolute inset-x-2 top-[4.25rem] h-1 rounded-full bg-secondary" />
        <div
          className="absolute top-[4.25rem] left-2 h-1 rounded-full transition-[width] duration-700"
          style={{ width: `calc(${Math.min(progress, 100)}% - 0.5rem)`, background: "var(--gradient-primary)" }}
        />
        <div
          className="absolute top-[3.4rem] z-10 grid size-6 -translate-x-1/2 place-items-center rounded-full border-2 border-background shadow-lg transition-[left] duration-700"
          style={{ left: `${Math.min(Math.max(progress, 1), 99)}%`, background: tone }}
          aria-hidden
        >
          <span className="size-2 rounded-full bg-background" />
        </div>

        <ol className="relative flex justify-between">
          {route.map((stop) => (
            <li key={stop.StationID} className="flex min-w-0 flex-1 flex-col items-center text-center">
              <span className="mb-3 block max-w-[9rem] truncate text-xs font-semibold">
                {stop.StationName}
              </span>
              <span
                className={cn(
                  "size-3.5 rounded-full border-2 border-background",
                  stop.IsCurrentStation
                    ? "bg-primary ring-4 ring-primary/25"
                    : stop.IsPassed
                      ? "bg-success"
                      : "bg-muted-foreground/40",
                )}
              />
              <span className="mt-3 font-mono text-[11px] text-muted-foreground">
                {formatTimeAmPm(stop.ArrivalTime)}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/70">{stop.Distance} km</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Vertical (mobile) */}
      <ol className="relative space-y-4 border-l border-border pl-5 md:hidden">
        {route.map((stop) => (
          <li key={stop.StationID} className="relative">
            <span
              className={cn(
                "absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-background",
                stop.IsCurrentStation
                  ? "bg-primary ring-4 ring-primary/25"
                  : stop.IsPassed
                    ? "bg-success"
                    : "bg-muted-foreground/40",
              )}
            />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{stop.StationName}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {stop.StationCode} · {stop.Distance} km
                </p>
              </div>
              <p className="shrink-0 font-mono text-xs">{formatTimeAmPm(stop.ArrivalTime)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
