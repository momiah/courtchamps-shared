import type { Court } from "../types/court";
import type { LadderMatch, LadderMatchArrival } from "../types/ladderMatch";
import { NO_SHOW_GRACE_MINUTES } from "../types/noShow";
import { getLadderMatchStartMs, toMs } from "./ladderAutoCancel";

export const CHECKIN_RADIUS_METERS = 500;
export const LADDER_ARRIVAL_MAX_AGE_MS = 60 * 1000;
export const LADDER_ARRIVAL_MAX_ACCURACY_METERS = 100;
export const LADDER_ARRIVAL_EARLY_MINUTES = 30;

const MINUTE_MS = 60 * 1000;
const EARTH_RADIUS_METERS = 6371000;

export interface LatLng {
  latitude: number;
  longitude: number;
}

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

export const distanceInMeters = (a: LatLng, b: LatLng): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const getCourtCoords = (
  court?: Pick<Court, "location"> | null,
): LatLng | null => {
  const latitude = toFiniteNumber(court?.location?.latitude);
  const longitude = toFiniteNumber(court?.location?.longitude);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
};

export interface LadderArrivalReading extends LatLng {
  accuracy: number | null;
  timestamp: number;
  mocked?: boolean;
}

export type LadderArrivalRejection =
  | "no_court"
  | "mocked"
  | "stale"
  | "inaccurate"
  | "too_far";

export type LadderArrivalCheck =
  | { ok: true; distanceMeters: number }
  | { ok: false; reason: LadderArrivalRejection; distanceMeters?: number };

export type LadderArrivalResult =
  | { ok: true; distanceMeters: number; opponentArrived: boolean }
  | { ok: false; reason: LadderArrivalRejection; distanceMeters?: number };

export const checkLadderArrivalReading = ({
  reading,
  court,
  nowMs,
}: {
  reading: LadderArrivalReading;
  court?: Pick<Court, "location"> | null;
  nowMs: number;
}): LadderArrivalCheck => {
  const courtCoords = getCourtCoords(court);
  if (!courtCoords) return { ok: false, reason: "no_court" };
  if (reading.mocked) return { ok: false, reason: "mocked" };
  if (
    !Number.isFinite(reading.timestamp) ||
    Math.abs(nowMs - reading.timestamp) > LADDER_ARRIVAL_MAX_AGE_MS
  ) {
    return { ok: false, reason: "stale" };
  }
  if (
    reading.accuracy === null ||
    !Number.isFinite(reading.accuracy) ||
    reading.accuracy > LADDER_ARRIVAL_MAX_ACCURACY_METERS
  ) {
    return { ok: false, reason: "inaccurate" };
  }
  const distanceMeters = Math.round(distanceInMeters(reading, courtCoords));
  if (distanceMeters > CHECKIN_RADIUS_METERS) {
    return { ok: false, reason: "too_far", distanceMeters };
  }
  return { ok: true, distanceMeters };
};

export const LADDER_ARRIVAL_REJECTION_MESSAGES: Record<LadderArrivalRejection, string> = {
  no_court: "This court has no location on file, so we can't confirm you're there.",
  mocked: "Your location is coming from a mock-location app. Turn it off and try again.",
  stale: "We couldn't get a fresh location. Please try again.",
  inaccurate: "Your location isn't accurate enough yet. Move into the open and try again.",
  too_far: "You need to be at the court to do this.",
};

const arrivalWindowStartMs = (
  match: Pick<LadderMatch, "matchDate" | "matchTime">,
): number | null => {
  const start = getLadderMatchStartMs(match.matchDate, match.matchTime?.start);
  return start === null ? null : start - LADDER_ARRIVAL_EARLY_MINUTES * MINUTE_MS;
};

export const getLadderArrival = (
  match: Pick<LadderMatch, "arrivals" | "matchDate" | "matchTime">,
  userId: string,
): LadderMatchArrival | null => {
  const arrival = match.arrivals?.[userId];
  const windowStart = arrivalWindowStartMs(match);
  const verifiedAt = toMs(arrival?.verifiedAt);
  if (!arrival || verifiedAt === null || windowStart === null) return null;
  return verifiedAt >= windowStart ? arrival : null;
};

export const hasArrivedForLadderMatch = (
  match: Pick<LadderMatch, "arrivals" | "matchDate" | "matchTime">,
  userIds: string[],
): boolean => userIds.some((userId) => !!getLadderArrival(match, userId));

export const getLadderNoShowUnlockMs = (
  match: Pick<LadderMatch, "matchDate" | "matchTime">,
): number | null => {
  const start = getLadderMatchStartMs(match.matchDate, match.matchTime?.start);
  return start === null ? null : start + NO_SHOW_GRACE_MINUTES * MINUTE_MS;
};

export const getLadderOpponentIds = (
  match: Pick<LadderMatch, "teams" | "participants">,
  userId: string,
): string[] => {
  const teams = match.teams ?? [];
  if (teams.length >= 2) {
    return teams.find((team) => !team.playerIds.includes(userId))?.playerIds ?? [];
  }
  return (match.participants ?? []).filter((id) => id !== userId);
};
