/**
 * In-app implementation of the Flask backend's endpoints.
 * Same request/response shapes as backend/app.py so the UI can switch between
 * this engine and a live Flask server without any component changes.
 */
import {
  DELAY_HISTORY,
  ROUTES,
  STATIONS,
  TRAINS,
  formatTimeAmPm,
  resolveStation,
  stationByCode,
  toHHMM,
  toMinutes,
  trainById,
  type RouteStop,
  type Station,
} from "./data";

export interface SearchResult {
  TrainID: string;
  TrainName: string;
  TrainType: string;
  DepartureTime: string;
  ArrivalTime: string;
  Distance: number;
  PredictedDelay: number;
  Classes: string;
  DelayReasons: Record<string, number>;
}

export interface RouteStation {
  StationID: string;
  StationName: string;
  StationCode: string;
  City: string;
  Latitude: number;
  Longitude: number;
  ArrivalTime: string;
  DepartureTime: string;
  StationOrder: number;
  Distance: number;
  IsCurrentStation: boolean;
  IsPassed: boolean;
}

export interface TrackResult {
  TrainID: string;
  TrainName: string;
  TrainType: string;
  Status: "scheduled" | "running" | "completed";
  CurrentStation: RouteStation;
  NextStation: RouteStation | null;
  PredictedDelay: number;
  Progress: number;
  SpeedKmph: number;
  ExpectedArrival: string;
  LastUpdated: string;
  Route: RouteStation[];
  DelayReasons: Record<string, number>;
}

export interface PropagationStop {
  StationCode: string;
  StationName: string;
  StationOrder: number;
  ScheduledArrival: string;
  ProjectedArrival: string;
  Delay: number;
  Added: number;
}

export interface PredictionResult {
  predicted_delay: number;
  confidence: number;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  expected_arrival: string;
  scheduled_arrival: string;
  factors: Array<{ label: string; weight: number; detail: string }>;
  propagation: PropagationStop[];
  status: "success";
}

export interface Alternative {
  type: "Train" | "Bus" | "Car" | "Flight";
  duration: number;
  cost: number;
  available: boolean;
  delay: number;
  departure_time: string;
  arrival_time: string;
  next_available: string;
}

export interface AlternativesResult {
  source: string;
  destination: string;
  distance: number;
  train_delay: number;
  alternatives: Alternative[];
  recommended: string;
}

export interface Ranking {
  TrainID: string;
  TrainName: string;
  TrainType: string;
  PunctualityRate: number;
  AvgDelay: number;
  OnTimeTrips: number;
  TotalTrips: number;
  Route: string;
  Trend: "improving" | "stable" | "declining";
  Rank: number;
}

/* ---------------------------------------------------------------- helpers */

/** Deterministic hash → stable values for the same train/date (no flicker). */
function seed(...parts: Array<string | number>): number {
  const key = parts.join("|");
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function historyFor(trainId: string) {
  return DELAY_HISTORY.filter((d) => d.TrainID === trainId);
}

export function delayReasonsFor(trainId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of historyFor(trainId)) {
    if (row.DelayReason === "No Delay" || row.DelayReason === "None") continue;
    out[row.DelayReason] = (out[row.DelayReason] ?? 0) + 1;
  }
  return out;
}

/**
 * Delay estimate. The Flask model picks from a graded delay distribution;
 * here the same distribution is sampled deterministically per train + date so
 * the number stays stable across screens instead of changing every render.
 */
export function predictDelayMinutes(trainId: string, date = todayISO(), stationCode = ""): number {
  const history = historyFor(trainId);
  const options = history.length
    ? history.map((h) => h.DelayMinutes)
    : [0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const s = seed(trainId, date, stationCode);
  const base = options[Math.floor(s * options.length)] ?? 0;
  const jitter = Math.round(seed(trainId, date, "j") * 6) - 2;
  return Math.max(0, base + (base > 0 ? jitter : 0));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function routeFor(trainId: string): RouteStop[] {
  return ROUTES.filter((r) => r.TrainID === trainId).sort((a, b) => a.StationOrder - b.StationOrder);
}

function toRouteStation(stop: RouteStop, station: Station): Omit<RouteStation, "IsCurrentStation" | "IsPassed"> {
  return {
    StationID: station.StationID,
    StationName: station.StationName,
    StationCode: station.StationCode,
    City: station.City,
    Latitude: station.Latitude,
    Longitude: station.Longitude,
    ArrivalTime: formatTimeAmPm(stop.ArrivalTime),
    DepartureTime: formatTimeAmPm(stop.DepartureTime),
    StationOrder: stop.StationOrder,
    Distance: stop.Distance,
  };
}

function stopClockMinutes(stop: RouteStop): number {
  const value = stop.ArrivalTime !== "Start" ? stop.ArrivalTime : stop.DepartureTime;
  return toMinutes(value);
}

/* -------------------------------------------------------------- endpoints */

export function getStations(): Station[] {
  return STATIONS;
}

export function getTrains() {
  return TRAINS;
}

export function searchTrains(source: string, destination: string, date: string): SearchResult[] {
  const src = resolveStation(source)?.StationCode ?? source;
  const dst = resolveStation(destination)?.StationCode ?? destination;
  if (!src || !dst || src === dst) return [];

  const results: SearchResult[] = [];
  for (const train of TRAINS) {
    const route = routeFor(train.TrainID);
    const from = route.find((r) => r.StationSequence === src);
    const to = route.find((r) => r.StationSequence === dst);
    if (!from || !to || from.StationOrder >= to.StationOrder) continue;

    const departure = from.DepartureTime !== "End" ? from.DepartureTime : from.ArrivalTime;
    const arrival = to.ArrivalTime !== "Start" ? to.ArrivalTime : to.DepartureTime;

    results.push({
      TrainID: train.TrainID,
      TrainName: train.TrainName,
      TrainType: train.TrainType,
      DepartureTime: formatTimeAmPm(departure),
      ArrivalTime: formatTimeAmPm(arrival),
      Distance: Math.abs(to.Distance - from.Distance),
      PredictedDelay: predictDelayMinutes(train.TrainID, date, src),
      Classes: train.Classes,
      DelayReasons: delayReasonsFor(train.TrainID),
    });
  }

  return results.sort((a, b) => toMinutes(to24(a.DepartureTime)) - toMinutes(to24(b.DepartureTime)));
}

function to24(display: string): string {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(display);
  if (!match) return display;
  let h = Number(match[1]) % 12;
  if (match[3] === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${match[2]}`;
}

export function getTrainRoute(trainId: string): RouteStation[] {
  return routeFor(trainId).map((stop) => {
    const station = stationByCode.get(stop.StationSequence)!;
    return { ...toRouteStation(stop, station), IsCurrentStation: false, IsPassed: false };
  });
}

export function trackTrain(trainId: string, now = new Date()): TrackResult | null {
  const train = trainById.get(trainId);
  const route = routeFor(trainId);
  if (!train || route.length === 0) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const delay = predictDelayMinutes(trainId);
  const startMin = toMinutes(train.DepartureTime);
  const endMin = toMinutes(train.ArrivalTime) + delay;

  let index = 0;
  let status: TrackResult["Status"] = "running";
  if (nowMinutes < startMin) {
    status = "scheduled";
    index = 0;
  } else if (nowMinutes >= endMin) {
    status = "completed";
    index = route.length - 1;
  } else {
    for (let i = 0; i < route.length; i++) {
      if (nowMinutes >= stopClockMinutes(route[i]!) + delay) index = i;
    }
  }

  const stations = route.map((stop, i) => {
    const station = stationByCode.get(stop.StationSequence)!;
    return {
      ...toRouteStation(stop, station),
      IsCurrentStation: i === index,
      IsPassed: i < index,
    } satisfies RouteStation;
  });

  const current = stations[index]!;
  const next = stations[index + 1] ?? null;
  const spanMinutes = Math.max(1, (endMin - startMin + 1440) % 1440);
  const progress =
    status === "completed"
      ? 100
      : status === "scheduled"
        ? 0
        : Math.min(100, Math.max(0, ((nowMinutes - startMin) / spanMinutes) * 100));

  const legDistance = next ? Math.abs(next.Distance - current.Distance) : 0;
  const legMinutes = next
    ? Math.max(5, (stopClockMinutes(route[index + 1]!) - stopClockMinutes(route[index]!) + 1440) % 1440)
    : 0;

  return {
    TrainID: train.TrainID,
    TrainName: train.TrainName,
    TrainType: train.TrainType,
    Status: status,
    CurrentStation: current,
    NextStation: next,
    PredictedDelay: delay,
    Progress: Math.round(progress * 100) / 100,
    SpeedKmph: status === "running" && legMinutes ? Math.round((legDistance / legMinutes) * 60) : 0,
    ExpectedArrival: formatTimeAmPm(toHHMM(toMinutes(train.ArrivalTime) + delay)),
    LastUpdated: now.toISOString(),
    Route: stations,
    DelayReasons: delayReasonsFor(train.TrainID),
  };
}

/**
 * Delay propagation: a delay at the origin grows along the corridor because
 * halts absorb only part of it and single-line crossings add more.
 */
export function propagate(trainId: string, initialDelay: number): PropagationStop[] {
  const route = routeFor(trainId);
  let delay = initialDelay;
  return route.map((stop, i) => {
    const station = stationByCode.get(stop.StationSequence)!;
    let added = 0;
    if (i > 0 && initialDelay > 0) {
      const congestion = seed(trainId, stop.StationSequence, "prop");
      added = Math.round(initialDelay * 0.12 + congestion * 3);
      const absorbed = stop.HaltTime > 0 ? 1 : 0;
      added = Math.max(0, added - absorbed);
      delay += added;
    }
    const scheduled = stop.ArrivalTime !== "Start" ? stop.ArrivalTime : stop.DepartureTime;
    return {
      StationCode: stop.StationSequence,
      StationName: station.StationName,
      StationOrder: stop.StationOrder,
      ScheduledArrival: formatTimeAmPm(scheduled),
      ProjectedArrival: formatTimeAmPm(toHHMM(toMinutes(scheduled) + delay)),
      Delay: delay,
      Added: added,
    };
  });
}

export function riskFor(delay: number): PredictionResult["risk"] {
  if (delay <= 5) return "LOW";
  if (delay <= 15) return "MEDIUM";
  if (delay <= 30) return "HIGH";
  return "CRITICAL";
}

export function delayCategory(delay: number): string {
  if (delay <= 5) return "On time";
  if (delay <= 15) return "Minor delay";
  if (delay <= 30) return "Significant delay";
  return "Critical delay";
}

export function predictDelay(input: {
  train_id: string;
  station_id?: string;
  date?: string;
  weather?: string;
  temperature?: number;
  day_of_week?: string;
  is_holiday?: string;
  season?: string;
}): PredictionResult {
  const train = trainById.get(input.train_id);
  const date = input.date ?? todayISO();
  let delay = predictDelayMinutes(input.train_id, date, input.station_id ?? "");

  const factors: PredictionResult["factors"] = [];
  const history = historyFor(input.train_id);
  const avgHistory = history.length
    ? history.reduce((s, h) => s + h.DelayMinutes, 0) / history.length
    : 0;

  factors.push({
    label: "Historical delay profile",
    weight: 0.42,
    detail: `${history.length} logged runs, average ${avgHistory.toFixed(1)} min`,
  });

  if (input.weather && input.weather !== "Clear") {
    delay += 4;
    factors.push({ label: "Weather conditions", weight: 0.21, detail: `${input.weather} on the corridor` });
  } else {
    factors.push({ label: "Weather conditions", weight: 0.08, detail: "Clear — minimal impact" });
  }

  if (input.is_holiday === "Yes") {
    delay += 3;
    factors.push({ label: "Holiday traffic", weight: 0.16, detail: "Higher passenger and freight load" });
  }

  const topReason = Object.entries(delayReasonsFor(input.train_id)).sort((a, b) => b[1] - a[1])[0];
  if (topReason) {
    factors.push({
      label: "Dominant recorded cause",
      weight: 0.19,
      detail: `${topReason[0]} (${topReason[1]} occurrences)`,
    });
  }

  factors.push({
    label: "Single-line corridor",
    weight: 0.14,
    detail: "Bengaluru–Hassan section requires crossing waits",
  });

  delay = Math.round(delay);
  const scheduled = train?.ArrivalTime ?? "00:00";
  const confidence = Math.round(
    (history.length ? 72 : 55) + (1 - Math.min(1, delay / 60)) * 20 + seed(input.train_id, date, "c") * 6,
  );

  return {
    predicted_delay: delay,
    confidence: Math.min(96, confidence),
    risk: riskFor(delay),
    category: delayCategory(delay),
    scheduled_arrival: formatTimeAmPm(scheduled),
    expected_arrival: formatTimeAmPm(toHHMM(toMinutes(scheduled) + delay)),
    factors: factors.sort((a, b) => b.weight - a.weight),
    propagation: propagate(input.train_id, delay),
    status: "success",
  };
}

export function getAlternatives(
  source: string,
  destination: string,
  trainDelay = 0,
  now = new Date(),
): AlternativesResult | { error: string } {
  const src = resolveStation(source);
  const dst = resolveStation(destination);
  if (!src || !dst) return { error: "Station not found" };

  const distance = haversine(src.Latitude, src.Longitude, dst.Latitude, dst.Longitude);
  const isYprHassan =
    (src.StationName.toLowerCase().includes("yesvantpur") && dst.StationName.toLowerCase().includes("hassan")) ||
    (src.StationName.toLowerCase().includes("hassan") && dst.StationName.toLowerCase().includes("yesvantpur"));

  const clock = (minutesFromNow: number) =>
    formatTimeAmPm(toHHMM(now.getHours() * 60 + now.getMinutes() + minutesFromNow));

  const alternatives: Alternative[] = [];

  if (distance > 500) {
    const flightTime = (distance / 800) * 60;
    alternatives.push({
      type: "Flight",
      duration: Math.round(flightTime + 120),
      cost: Math.round(2000 + distance * 5),
      available: true,
      delay: 0,
      departure_time: clock(120),
      arrival_time: clock(120 + flightTime),
      next_available: "2 hours from now",
    });
  }

  const busTime = (distance / 50) * 60;
  alternatives.push({
    type: "Bus",
    duration: Math.round(busTime),
    cost: isYprHassan ? 250 : Math.round(distance * 2.5),
    available: true,
    delay: 0,
    departure_time: clock(60),
    arrival_time: clock(60 + busTime),
    next_available: "1 hour from now",
  });

  const carTime = (distance / 80) * 60;
  alternatives.push({
    type: "Car",
    duration: Math.round(carTime),
    cost: isYprHassan ? 3000 : Math.round(distance * 16),
    available: true,
    delay: 0,
    departure_time: clock(30),
    arrival_time: clock(30 + carTime),
    next_available: "30 minutes from now",
  });

  const nextTrain = searchTrains(src.StationID, dst.StationID, todayISO())[0];
  if (nextTrain) {
    const railMinutes =
      (toMinutes(to24(nextTrain.ArrivalTime)) - toMinutes(to24(nextTrain.DepartureTime)) + 1440) % 1440;
    alternatives.unshift({
      type: "Train",
      duration: railMinutes + trainDelay,
      cost: Math.round(distance * 0.7),
      available: true,
      delay: trainDelay,
      departure_time: nextTrain.DepartureTime,
      arrival_time: nextTrain.ArrivalTime,
      next_available: `${nextTrain.TrainName} · ${nextTrain.TrainID}`,
    });
  }

  const score = (a: Alternative) => a.duration + a.delay * 1.5 + a.cost / 60;
  const recommended = [...alternatives].sort((a, b) => score(a) - score(b))[0]?.type ?? "Bus";

  return {
    source: src.StationName,
    destination: dst.StationName,
    distance: Math.round(distance * 10) / 10,
    train_delay: trainDelay,
    alternatives,
    recommended,
  };
}

export function getRankings(): { rankings: Ranking[]; overall_stats: Record<string, number>; total_trains: number } {
  const rows = TRAINS.map((train) => {
    const history = historyFor(train.TrainID);
    const trips = history.length || 5;
    const onTime = history.filter((h) => h.DelayMinutes <= 5).length;
    const avgDelay = Math.round(history.reduce((s, h) => s + h.DelayMinutes, 0) / trips);
    const punctuality = Math.round((onTime / trips) * 100);
    const trendSeed = seed(train.TrainID, "trend");
    return {
      TrainID: train.TrainID,
      TrainName: train.TrainName,
      TrainType: train.TrainType,
      PunctualityRate: punctuality,
      AvgDelay: avgDelay,
      OnTimeTrips: onTime,
      TotalTrips: trips,
      Route: `${train.SourceStation} - ${train.DestinationStation}`,
      Trend: (trendSeed > 0.66 ? "improving" : trendSeed > 0.33 ? "stable" : "declining") as Ranking["Trend"],
      Rank: 0,
    };
  });

  const ranked = rows
    .sort((a, b) => b.PunctualityRate - a.PunctualityRate || a.AvgDelay - b.AvgDelay)
    .map((r, i) => ({ ...r, Rank: i + 1 }));

  return {
    rankings: ranked,
    overall_stats: {
      total_trains: ranked.length,
      avg_punctuality: Math.round(ranked.reduce((s, r) => s + r.PunctualityRate, 0) / ranked.length),
      avg_delay: Math.round(ranked.reduce((s, r) => s + r.AvgDelay, 0) / ranked.length),
      top_punctual: ranked[0]?.PunctualityRate ?? 0,
    },
    total_trains: ranked.length,
  };
}

export interface NetworkOverview {
  totalTrains: number;
  activeTrains: number;
  delayedTrains: number;
  avgDelay: number;
  predictionsToday: number;
  onTimeRate: number;
  live: Array<{
    TrainID: string;
    TrainName: string;
    Status: TrackResult["Status"];
    Delay: number;
    Progress: number;
    Current: string;
    Next: string | null;
    Lat: number;
    Lon: number;
  }>;
  delayByStation: Array<{ station: string; delay: number }>;
  delayDistribution: Array<{ bucket: string; trains: number }>;
  hourlyTrend: Array<{ hour: string; delay: number; departures: number }>;
  reasons: Array<{ reason: string; count: number }>;
}

export function getOverview(now = new Date()): NetworkOverview {
  const tracks = TRAINS.map((t) => trackTrain(t.TrainID, now)).filter(Boolean) as TrackResult[];
  const active = tracks.filter((t) => t.Status === "running");
  const delayed = tracks.filter((t) => t.PredictedDelay > 5);
  const avgDelay = Math.round(tracks.reduce((s, t) => s + t.PredictedDelay, 0) / (tracks.length || 1));

  const stationTotals = new Map<string, { sum: number; n: number }>();
  for (const t of tracks) {
    for (const stop of t.Route) {
      const entry = stationTotals.get(stop.StationName) ?? { sum: 0, n: 0 };
      entry.sum += t.PredictedDelay * (stop.StationOrder / t.Route.length);
      entry.n += 1;
      stationTotals.set(stop.StationName, entry);
    }
  }

  const buckets = [
    { bucket: "On time", test: (d: number) => d <= 5 },
    { bucket: "6-15 min", test: (d: number) => d > 5 && d <= 15 },
    { bucket: "16-30 min", test: (d: number) => d > 15 && d <= 30 },
    { bucket: "30+ min", test: (d: number) => d > 30 },
  ];

  const reasonTotals = new Map<string, number>();
  for (const row of DELAY_HISTORY) {
    if (row.DelayReason === "No Delay") continue;
    reasonTotals.set(row.DelayReason, (reasonTotals.get(row.DelayReason) ?? 0) + 1);
  }

  const hourly = Array.from({ length: 12 }, (_, i) => {
    const hour = i * 2;
    const departures = TRAINS.filter((t) => {
      const h = Number(t.DepartureTime.slice(0, 2));
      return h >= hour && h < hour + 2;
    });
    const delaySum = departures.reduce((s, t) => s + predictDelayMinutes(t.TrainID), 0);
    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      delay: departures.length ? Math.round(delaySum / departures.length) : 0,
      departures: departures.length,
    };
  });

  return {
    totalTrains: TRAINS.length,
    activeTrains: active.length,
    delayedTrains: delayed.length,
    avgDelay,
    predictionsToday: TRAINS.length * 4,
    onTimeRate: Math.round(((tracks.length - delayed.length) / (tracks.length || 1)) * 100),
    live: tracks.map((t) => ({
      TrainID: t.TrainID,
      TrainName: t.TrainName,
      Status: t.Status,
      Delay: t.PredictedDelay,
      Progress: t.Progress,
      Current: t.CurrentStation.StationName,
      Next: t.NextStation?.StationName ?? null,
      Lat: t.CurrentStation.Latitude,
      Lon: t.CurrentStation.Longitude,
    })),
    delayByStation: [...stationTotals.entries()]
      .map(([station, v]) => ({ station, delay: Math.round(v.sum / v.n) }))
      .sort((a, b) => b.delay - a.delay),
    delayDistribution: buckets.map((b) => ({
      bucket: b.bucket,
      trains: tracks.filter((t) => b.test(t.PredictedDelay)).length,
    })),
    hourlyTrend: hourly,
    reasons: [...reasonTotals.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}
