import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type { LadderMatch } from "../types/ladderMatch";
import { hasOpenLadderDispute } from "./ladderMatchResult";

/** Hours of inactivity before an accepted match auto-expires. */
export const LADDER_MATCH_EXPIRE_HOURS = 72;

const HOUR_MS = 60 * 60 * 1000;

const toMs = (
  value?: Date | { toDate: () => Date } | string | number | null,
): number | null => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value.toDate === "function") {
    const ms = value.toDate().getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
};

/** Ladder match dates and times are UK wall-clock times. */
export const LADDER_MATCH_TIME_ZONE = "Europe/London";

const londonFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LADDER_MATCH_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const londonOffsetMs = (utcMs: number): number => {
  const parts = Object.fromEntries(
    londonFormat
      .formatToParts(new Date(utcMs))
      .map((part) => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
};

/** Parse a "DD-MM-YYYY" date and "HH:MM" UK start time into epoch ms, or null. */
export const getLadderMatchStartMs = (
  matchDate?: string,
  matchTime?: string,
): number | null => {
  if (!matchDate) return null;
  const [day, month, year] = matchDate.split("-").map(Number);
  if (![day, month, year].every(Number.isFinite) || !day || !month || !year) {
    return null;
  }
  const [hours, minutes] = (matchTime ?? "00:00").split(":").map(Number);
  const wallClock = Date.UTC(
    year,
    month - 1,
    day,
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
  );
  if (!Number.isFinite(wallClock)) return null;
  const guess = wallClock - londonOffsetMs(wallClock);
  return wallClock - londonOffsetMs(guess);
};

/** The most recent activity on a match: its last game report/approval or check-in. */
const lastLadderActivityMs = (
  match: Pick<LadderMatch, "lastUpdated" | "checkIn">,
): number | null => {
  const candidates = [
    toMs(match.lastUpdated),
    toMs(match.checkIn?.completedAt),
  ].filter((n): n is number => n !== null);
  return candidates.length ? Math.max(...candidates) : null;
};

/**
 * True when an accepted match has gone silent past the expire window with no
 * activity from any player. The clock starts at the scheduled start and is
 * reset by any activity (check-in, game report or approval). An extension
 * holds it until the extension runs out, and a match still under dispute is
 * left for the dispute flow. User-requested cancellations use the separate
 * `cancelled` status, not this.
 */
export const isLadderMatchExpired = (
  match: Pick<
    LadderMatch,
    | "matchStatus"
    | "walkover"
    | "noShowReported"
    | "checkIn"
    | "games"
    | "matchDate"
    | "matchTime"
    | "lastUpdated"
    | "extension"
  >,
  nowMs: number,
  windowHours: number = LADDER_MATCH_EXPIRE_HOURS,
): boolean => {
  if (match.matchStatus !== LADDER_MATCH_STATUS.ACCEPTED) return false;
  if (match.walkover || match.noShowReported) return false;
  if (hasOpenLadderDispute(match.games ?? [])) return false;
  const extendedUntil = toMs(match.extension?.expiresAt);
  if (extendedUntil !== null && nowMs < extendedUntil) return false;

  const reference =
    lastLadderActivityMs(match) ??
    getLadderMatchStartMs(match.matchDate, match.matchTime?.start);
  if (reference === null) return false;
  return nowMs >= reference + windowHours * HOUR_MS;
};
