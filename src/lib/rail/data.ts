/**
 * Datasets ported verbatim from the Flask backend's CSV files:
 *   backend/data/stations.csv, train_schedules.csv, routes.csv, delay_history.csv
 * Field names match the backend JSON payloads so the same UI can consume either
 * this in-app engine or the live Flask API.
 */

export interface Station {
  StationID: string;
  StationName: string;
  StationCode: string;
  City: string;
  State: string;
  Latitude: number;
  Longitude: number;
}

export interface TrainSchedule {
  TrainID: string;
  TrainName: string;
  SourceStation: string;
  DestinationStation: string;
  DepartureTime: string;
  ArrivalTime: string;
  TotalDistance: number;
  TravelDays: number;
  TrainType: string;
  Classes: string;
}

export interface RouteStop {
  TrainID: string;
  StationSequence: string;
  StationOrder: number;
  ArrivalTime: string;
  DepartureTime: string;
  Distance: number;
  DayNumber: number;
  HaltTime: number;
}

export interface DelayRecord {
  TrainID: string;
  StationID: string;
  DelayMinutes: number;
  DelayReason: string;
  Weather: string;
  Temperature: number;
  DayOfWeek: string;
  Season: string;
}

export const STATIONS: Station[] = [
  {
    StationID: "ST001",
    StationName: "Yesvantpur Junction",
    StationCode: "YPR",
    City: "Bengaluru",
    State: "Karnataka",
    Latitude: 13.0284,
    Longitude: 77.5273,
  },
  {
    StationID: "ST002",
    StationName: "Yelahanka Junction",
    StationCode: "YNK",
    City: "Bengaluru",
    State: "Karnataka",
    Latitude: 13.1007,
    Longitude: 77.5963,
  },
  {
    StationID: "ST003",
    StationName: "Nelamangala",
    StationCode: "NMGA",
    City: "Bengaluru Rural",
    State: "Karnataka",
    Latitude: 13.0997,
    Longitude: 77.3937,
  },
  {
    StationID: "ST004",
    StationName: "Kunigal",
    StationCode: "KIGL",
    City: "Tumakuru",
    State: "Karnataka",
    Latitude: 13.0249,
    Longitude: 77.1301,
  },
  {
    StationID: "ST005",
    StationName: "Yediyur",
    StationCode: "YY",
    City: "Tumakuru",
    State: "Karnataka",
    Latitude: 12.9318,
    Longitude: 76.9372,
  },
  {
    StationID: "ST006",
    StationName: "Shravanabelagola",
    StationCode: "SBGA",
    City: "Hassan",
    State: "Karnataka",
    Latitude: 12.8622,
    Longitude: 76.7033,
  },
  {
    StationID: "ST007",
    StationName: "Channarayapatna",
    StationCode: "CNPA",
    City: "Hassan",
    State: "Karnataka",
    Latitude: 12.9044,
    Longitude: 76.391,
  },
  {
    StationID: "ST008",
    StationName: "Hassan Junction",
    StationCode: "HAS",
    City: "Hassan",
    State: "Karnataka",
    Latitude: 13.0088,
    Longitude: 76.0984,
  },
];

export const TRAINS: TrainSchedule[] = [
  ["16512", "K.S.R Bengaluru Express", "HAS", "YPR", "02:55", "05:53", "Express"],
  ["16596", "Panchaganga SF Express", "HAS", "YPR", "03:55", "06:23", "Superfast"],
  ["22680", "InterCity SF Express", "HAS", "YPR", "07:00", "10:05", "Superfast"],
  ["16208", "Yesvantpur Express", "HAS", "YPR", "10:15", "14:55", "Express"],
  ["16576", "Gomteshwara Express", "HAS", "YPR", "12:55", "16:30", "Express"],
  ["06584", "MEMU Special", "HAS", "YPR", "14:10", "17:07", "MEMU"],
  ["16575", "Gomteshwara Express", "YPR", "HAS", "07:00", "10:05", "Express"],
  ["16539", "Mangaluru Weekly Express", "YPR", "HAS", "07:00", "10:10", "Express"],
  ["16515", "Karwar Express", "YPR", "HAS", "07:00", "10:05", "Express"],
  ["11311", "Hassan Express", "YPR", "HAS", "07:10", "10:56", "Express"],
  ["66525", "Bengaluru Hassan MEMU", "YPR", "HAS", "09:57", "13:55", "MEMU"],
  ["06583", "MEMU Special", "YPR", "HAS", "09:57", "13:55", "MEMU"],
].map(([id, name, src, dst, dep, arr, type]) => ({
  TrainID: id!,
  TrainName: name!,
  SourceStation: src!,
  DestinationStation: dst!,
  DepartureTime: dep!,
  ArrivalTime: arr!,
  TotalDistance: 174,
  TravelDays: 0,
  TrainType: type!,
  Classes: "2S,SL,3A",
}));

const HAS_TO_YPR: Array<[string, number]> = [
  ["HAS", 174],
  ["CNPA", 160],
  ["SBGA", 145],
  ["YY", 110],
  ["KIGL", 85],
  ["NMGA", 45],
  ["YNK", 15],
  ["YPR", 0],
];

const YPR_TO_HAS: Array<[string, number]> = [
  ["YPR", 0],
  ["YNK", 15],
  ["NMGA", 45],
  ["KIGL", 85],
  ["YY", 110],
  ["SBGA", 145],
  ["CNPA", 160],
  ["HAS", 174],
];

/** Offsets in minutes from the train's origin departure, per route.csv timings. */
const DOWN_OFFSETS = [0, 15, 45, 75, 110, 145, 160, 174];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toHHMM(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Rebuilds routes.csv: even spacing between origin departure and destination arrival. */
function buildRoute(train: TrainSchedule): RouteStop[] {
  const seq = train.SourceStation === "HAS" ? HAS_TO_YPR : YPR_TO_HAS;
  const start = toMinutes(train.DepartureTime);
  const end = toMinutes(train.ArrivalTime);
  const span = (end - start + 1440) % 1440;
  const last = DOWN_OFFSETS[DOWN_OFFSETS.length - 1]!;

  return seq.map(([code, distance], i) => {
    const share = (DOWN_OFFSETS[i] ?? 0) / last;
    const at = start + Math.round(share * span);
    const isFirst = i === 0;
    const isLast = i === seq.length - 1;
    return {
      TrainID: train.TrainID,
      StationSequence: code,
      StationOrder: i + 1,
      ArrivalTime: isFirst ? "Start" : toHHMM(at - 2),
      DepartureTime: isLast ? "End" : toHHMM(at),
      Distance: distance,
      DayNumber: 0,
      HaltTime: isFirst || isLast ? 0 : 2,
    };
  });
}

export const ROUTES: RouteStop[] = TRAINS.flatMap(buildRoute);

const REASON_CYCLE = [
  "No Delay",
  "Bad weather (rain, fog, storms, floods)",
  "Track maintenance or repair work",
  "Signal failures",
  "Heavy railway traffic / track congestion",
  "Late arrival from previous station",
  "Engine or mechanical problems",
  "Accidents or derailments",
  "Single-line track crossings and waiting",
  "Platform unavailability at stations",
  "Emergency situations like chain pulling or security checks",
];

/** delay_history.csv — five graded observations per train (0/5/10/15/20 min). */
export const DELAY_HISTORY: DelayRecord[] = TRAINS.flatMap((train, ti) =>
  [0, 5, 10, 15, 20].map((minutes, si) => ({
    TrainID: train.TrainID,
    StationID: train.SourceStation,
    DelayMinutes: minutes,
    DelayReason: minutes === 0 ? "No Delay" : REASON_CYCLE[((ti * 5 + si) % 10) + 1]!,
    Weather: minutes >= 15 ? "Rain" : "Clear",
    Temperature: 26,
    DayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][ti % 7]!,
    Season: "Summer",
  })),
);

export const stationByCode = new Map(STATIONS.map((s) => [s.StationCode, s]));
export const stationById = new Map(STATIONS.map((s) => [s.StationID, s]));
export const trainById = new Map(TRAINS.map((t) => [t.TrainID, t]));

export function resolveStation(input: string): Station | undefined {
  return stationById.get(input) ?? stationByCode.get(input);
}

export function formatTimeAmPm(value: string): string {
  if (!value || value === "Start" || value === "End") return value;

  // ISO timestamps (e.g. LastUpdated) render as local clock time.
  if (value.includes("T")) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }
  }

  const [rawH, rawM] = value.split(":");
  const h = Number(rawH);
  const m = Number(rawM);
  if (Number.isNaN(h)) return value;
  const minutes = Number.isNaN(m) ? 0 : m;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export { toMinutes, toHHMM };
