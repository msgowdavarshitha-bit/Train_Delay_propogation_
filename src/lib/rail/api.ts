/**
 * Data access layer.
 *
 * Default: the in-app engine (works everywhere, including the hosted preview).
 * Optional: point at the original Flask backend (Settings → Data source) and
 * every call goes to `${base}/api/...` with the exact endpoints from app.py.
 */
import {
  getAlternatives,
  getOverview,
  getRankings,
  getStations,
  getTrainRoute,
  getTrains,
  predictDelay,
  propagate,
  searchTrains,
  trackTrain,
  todayISO,
  type AlternativesResult,
  type NetworkOverview,
  type PredictionResult,
  type Ranking,
  type RouteStation,
  type SearchResult,
  type TrackResult,
} from "./engine";
import type { Station, TrainSchedule } from "./data";

const STORAGE_KEY = "railsense.apiBase";

export function getApiBase(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setApiBase(base: string) {
  if (typeof window === "undefined") return;
  const trimmed = base.trim().replace(/\/$/, "");
  if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
  else window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("railsense:apibase"));
}

export class RailApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RailApiError";
  }
}

async function remote<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new RailApiError(`Railway service responded with ${response.status}`);
  }
  return (await response.json()) as T;
}

function useRemote() {
  return getApiBase().length > 0;
}

export const railApi = {
  async health(): Promise<{ status: string; source: "local" | "flask" }> {
    if (!useRemote()) return { status: "healthy", source: "local" };
    const data = await remote<{ status: string }>("/api/health");
    return { status: data.status, source: "flask" };
  },

  async stations(): Promise<Station[]> {
    if (!useRemote()) return getStations();
    return remote<Station[]>("/api/stations");
  },

  async trains(): Promise<TrainSchedule[]> {
    if (!useRemote()) return getTrains();
    return remote<TrainSchedule[]>("/api/trains");
  },

  async search(source: string, destination: string, date = todayISO()): Promise<SearchResult[]> {
    if (!useRemote()) return searchTrains(source, destination, date);
    return remote<SearchResult[]>("/api/search", {
      method: "POST",
      body: JSON.stringify({ source, destination, date }),
    });
  },

  async route(trainId: string): Promise<RouteStation[]> {
    if (!useRemote()) return getTrainRoute(trainId);
    return remote<RouteStation[]>(`/api/train/${trainId}/route`);
  },

  async track(trainId: string): Promise<TrackResult> {
    const local = trackTrain(trainId);
    if (!useRemote()) {
      if (!local) throw new RailApiError("Train not found");
      return local;
    }
    const data = await remote<Partial<TrackResult>>(`/api/train/${trainId}/track`);
    // Flask returns a subset of these fields — fill the rest from the local model.
    return { ...(local as TrackResult), ...data } as TrackResult;
  },

  async predict(input: {
    train_id: string;
    station_id?: string;
    date?: string;
    weather?: string;
    temperature?: number;
    day_of_week?: string;
    is_holiday?: string;
    season?: string;
  }): Promise<PredictionResult> {
    const local = predictDelay(input);
    if (!useRemote()) return local;
    const data = await remote<{ predicted_delay: number }>("/api/predict-delay", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const delay = Math.round(data.predicted_delay ?? local.predicted_delay);
    return { ...local, predicted_delay: delay, propagation: propagate(input.train_id, delay) };
  },

  async alternatives(source: string, destination: string, delay = 0): Promise<AlternativesResult> {
    if (!useRemote()) {
      const result = getAlternatives(source, destination, delay);
      if ("error" in result) throw new RailApiError(result.error);
      return result;
    }
    const data = await remote<AlternativesResult>("/api/alternatives", {
      method: "POST",
      body: JSON.stringify({ source, destination, train_delay: delay }),
    });
    const localResult = getAlternatives(source, destination, delay);
    return {
      ...data,
      recommended: "error" in localResult ? (data.alternatives?.[0]?.type ?? "Bus") : localResult.recommended,
    };
  },

  async rankings(): Promise<{ rankings: Ranking[]; overall_stats: Record<string, number>; total_trains: number }> {
    if (!useRemote()) return getRankings();
    return remote("/api/train-rankings");
  },

  /** Network-wide analytics, always derived locally from the schedule model. */
  async overview(): Promise<NetworkOverview> {
    return getOverview();
  },
};

export { todayISO };
