import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ cards */

export function GlassCard({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("glass rounded-2xl", className)} {...props} />;
}

export function SurfaceCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "surface-card rounded-2xl transition-all duration-200 hover:border-primary/25",
        className,
      )}
      {...props}
    />
  );
}

/* ----------------------------------------------------------- status badge */

const statusBadge = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide uppercase",
  {
    variants: {
      tone: {
        neutral: "border-border bg-secondary text-muted-foreground",
        success: "border-success/30 bg-success/12 text-success",
        warning: "border-warning/30 bg-warning/12 text-warning",
        danger: "border-destructive/35 bg-destructive/12 text-destructive",
        info: "border-primary/35 bg-primary/12 text-primary",
        violet: "border-violet/35 bg-violet/12 text-violet",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface StatusBadgeProps
  extends ComponentProps<"span">,
    VariantProps<typeof statusBadge> {
  dot?: boolean;
}

export function StatusBadge({ tone, dot, className, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadge({ tone }), className)} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function delayTone(delay: number) {
  if (delay <= 5) return "success" as const;
  if (delay <= 15) return "warning" as const;
  if (delay <= 30) return "danger" as const;
  return "danger" as const;
}

export function DelayIndicator({ delay, className }: { delay: number; className?: string }) {
  return (
    <StatusBadge tone={delayTone(delay)} dot className={className}>
      {delay <= 5 ? "On time" : `+${delay} min`}
    </StatusBadge>
  );
}

/* ------------------------------------------------------------------- kpi */

export function KpiCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "primary" | "violet" | "cyan" | "success" | "warning";
}) {
  const toneRing: Record<string, string> = {
    primary: "text-primary bg-primary/12",
    violet: "text-violet bg-violet/12",
    cyan: "text-cyan bg-cyan/12",
    success: "text-success bg-success/12",
    warning: "text-warning bg-warning/12",
  };

  return (
    <SurfaceCard className="animate-rise p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="label-meta truncate">{label}</p>
          <p className="mt-2 font-mono text-2xl leading-none font-bold sm:text-3xl">
            {value}
            {unit ? <span className="ml-1 text-base text-muted-foreground">{unit}</span> : null}
          </p>
        </div>
        {icon ? (
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", toneRing[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-3 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </SurfaceCard>
  );
}

/* ------------------------------------------------------------ page header */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        {eyebrow ? <p className="label-meta text-primary">{eyebrow}</p> : null}
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/* --------------------------------------------------------------- states */

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <SurfaceCard className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        {icon ?? <Inbox className="size-5" />}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </SurfaceCard>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <SurfaceCard
      role="alert"
      className="flex flex-col items-center gap-3 border-destructive/25 px-6 py-12 text-center"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-destructive/12 text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw className="size-4" /> Try again
        </Button>
      ) : null}
    </SurfaceCard>
  );
}

export function LoadingSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl bg-secondary/70" />
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceCard className={cn("p-4 sm:p-5", className)}>
      <div className="mb-4 min-w-0">
        <h3 className="truncate text-sm font-semibold">{title}</h3>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </SurfaceCard>
  );
}
