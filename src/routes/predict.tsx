import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Brain, Sparkles, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/rail/app-shell";
import {
  ChartCard,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  SurfaceCard,
} from "@/components/rail/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { railApi, todayISO } from "@/lib/rail/api";
import { formatTimeAmPm } from "@/lib/rail/data";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "AI Delay Prediction — RailSense" },
      { name: "description", content: "Forecast train delay from weather, season, day and holiday pressure." },
      { property: "og:title", content: "AI Delay Prediction — RailSense" },
      { property: "og:description", content: "Predict delay minutes and see how they propagate down the route." },
    ],
  }),
  component: PredictPage,
});

const WEATHER = ["Clear", "Cloudy", "Rain", "Heavy Rain", "Fog", "Storm"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SEASONS = ["Summer", "Monsoon", "Winter", "Post-Monsoon"];

const riskTone = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
} as const;

function Gauge({ value, risk }: { value: number; risk: keyof typeof riskTone }) {
  const pct = Math.min(value / 60, 1);
  const radius = 70;
  const circumference = Math.PI * radius;
  const color =
    risk === "LOW" ? "var(--color-success)" : risk === "MEDIUM" ? "var(--color-warning)" : "var(--color-destructive)";

  return (
    <div className="relative mx-auto w-full max-w-[220px]">
      <svg viewBox="0 0 180 105" className="w-full" role="img" aria-label={`Predicted delay ${value} minutes`}>
        <path
          d="M 20 95 A 70 70 0 0 1 160 95"
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d="M 20 95 A 70 70 0 0 1 160 95"
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="font-mono text-4xl leading-none font-bold">{value}</p>
        <p className="label-meta mt-1">minutes late</p>
      </div>
    </div>
  );
}

function PredictPage() {
  const { data: trains = [] } = useQuery({ queryKey: ["trains"], queryFn: () => railApi.trains() });
  const [trainId, setTrainId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [weather, setWeather] = useState("Clear");
  const [temperature, setTemperature] = useState(28);
  const [dayOfWeek, setDayOfWeek] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]!);
  const [season, setSeason] = useState("Monsoon");
  const [isHoliday, setIsHoliday] = useState("No");

  const activeTrain = trainId || trains[0]?.TrainID || "";

  const predict = useMutation({
    mutationFn: () =>
      railApi.predict({
        train_id: activeTrain,
        date,
        weather,
        temperature,
        day_of_week: dayOfWeek,
        season,
        is_holiday: isHoliday,
      }),
  });

  const result = predict.data;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="AI intelligence"
          title="Delay prediction"
          description="Score a specific service against weather, season and calendar pressure, then watch the delay propagate."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <SurfaceCard className="space-y-4 p-5">
            <div>
              <p className="label-meta mb-1.5">Train</p>
              <Select value={activeTrain} onValueChange={setTrainId}>
                <SelectTrigger className="h-12 w-full rounded-xl bg-secondary/50">
                  <SelectValue placeholder="Select train" />
                </SelectTrigger>
                <SelectContent>
                  {trains.map((train) => (
                    <SelectItem key={train.TrainID} value={train.TrainID}>
                      {train.TrainID} · {train.TrainName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label-meta mb-1.5">Date</p>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12 rounded-xl bg-secondary/50"
                />
              </div>
              <div>
                <p className="label-meta mb-1.5">Weather</p>
                <Select value={weather} onValueChange={setWeather}>
                  <SelectTrigger className="h-12 w-full rounded-xl bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEATHER.map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="label-meta mb-1.5">Temperature (°C)</p>
                <Input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="h-12 rounded-xl bg-secondary/50"
                />
              </div>
              <div>
                <p className="label-meta mb-1.5">Day of week</p>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger className="h-12 w-full rounded-xl bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="label-meta mb-1.5">Season</p>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger className="h-12 w-full rounded-xl bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEASONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="label-meta mb-1.5">Public holiday</p>
                <Select value={isHoliday} onValueChange={setIsHoliday}>
                  <SelectTrigger className="h-12 w-full rounded-xl bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              size="lg"
              className="h-12 w-full rounded-xl"
              onClick={() => predict.mutate()}
              disabled={!activeTrain || predict.isPending}
            >
              <Sparkles className="size-4" />
              {predict.isPending ? "Running model…" : "Predict delay"}
            </Button>
          </SurfaceCard>

          <div className="space-y-4">
            {predict.isPending ? <LoadingSkeleton rows={2} /> : null}
            {predict.isError ? (
              <ErrorState description="Prediction service unavailable." onRetry={() => predict.mutate()} />
            ) : null}

            {result && !predict.isPending ? (
              <>
                <SurfaceCard className="animate-rise p-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="label-meta">Forecast</p>
                      <h2 className="mt-1 truncate text-lg font-semibold">{result.category}</h2>
                    </div>
                    <StatusBadge tone={riskTone[result.risk]} dot>
                      {result.risk} risk
                    </StatusBadge>
                  </div>

                  <div className="mt-4">
                    <Gauge value={result.predicted_delay} risk={result.risk} />
                  </div>

                  <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                    <div>
                      <dt className="label-meta">Scheduled</dt>
                      <dd className="mt-1 font-mono text-sm font-bold">
                        {formatTimeAmPm(result.scheduled_arrival)}
                      </dd>
                    </div>
                    <div>
                      <dt className="label-meta">Expected</dt>
                      <dd className="mt-1 font-mono text-sm font-bold">
                        {formatTimeAmPm(result.expected_arrival)}
                      </dd>
                    </div>
                    <div>
                      <dt className="label-meta">Confidence</dt>
                      <dd className="mt-1 font-mono text-sm font-bold">{result.confidence}%</dd>
                    </div>
                  </dl>
                </SurfaceCard>

                <SurfaceCard className="animate-rise p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Brain className="size-4 text-primary" /> Contributing factors
                  </h3>
                  <ul className="space-y-3">
                    {result.factors.map((factor) => (
                      <li key={factor.label}>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                          <span className="truncate font-medium">{factor.label}</span>
                          <span className="font-mono text-muted-foreground">
                            {factor.weight > 0 ? "+" : ""}
                            {factor.weight} min
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(Math.abs(factor.weight) * 8, 100)}%`,
                              background: "var(--gradient-primary)",
                            }}
                          />
                        </div>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">{factor.detail}</p>
                      </li>
                    ))}
                  </ul>
                </SurfaceCard>
              </>
            ) : null}

            {!result && !predict.isPending && !predict.isError ? (
              <SurfaceCard className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <Brain className="size-5" />
                </span>
                <h3 className="text-base font-semibold">Model idle</h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Configure the conditions on the left and run the prediction to see delay, risk band and propagation.
                </p>
              </SurfaceCard>
            ) : null}
          </div>
        </div>

        {result?.propagation.length ? (
          <ChartCard
            title="Delay propagation along the route"
            subtitle="How the initial delay compounds station by station"
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={result.propagation}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="StationCode" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={32} />
                <RTooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Delay"
                  stroke="var(--color-violet)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--color-violet)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {result.propagation.map((stop) => (
                <li
                  key={stop.StationCode}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{stop.StationName}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {formatTimeAmPm(stop.ScheduledArrival)} → {formatTimeAmPm(stop.ProjectedArrival)}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-warning">
                    <TrendingUp className="size-3.5" />+{stop.Delay}m
                  </span>
                </li>
              ))}
            </ul>
          </ChartCard>
        ) : null}
      </div>
    </AppShell>
  );
}
