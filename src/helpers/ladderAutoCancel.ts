import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type { LadderMatch } from "../types/ladderMatch";
import { isLadderMatchCheckedIn } from "./ladderMatchCheckIn";

/** Hours after the scheduled start before an untouched match auto-cancels. */
export const LADDER_MATCH_AUTO_CANCEL_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

/** Parse a "DD-MM-YYYY" date and "HH:MM" start time into epoch ms, or null. */
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
  const ms = new Date(
    year,
    month - 1,
    day,
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
  ).getTime();
  return Number.isFinite(ms) ? ms : null;
};

/**
 * True when an accepted match has gone entirely unattended past its cancel
 * window: nobody checked in, played, or reported, and no walkover/no-show is in
 * flight. Such a match is auto-cancelled with no penalty.
 */
export const isLadderMatchUnattended = (
  match: Pick<
    LadderMatch,
    | "matchStatus"
    | "walkover"
    | "noShowReported"
    | "checkIn"
    | "participants"
    | "games"
    | "matchDate"
    | "matchTime"
  >,
  nowMs: number,
  windowHours: number = LADDER_MATCH_AUTO_CANCEL_HOURS,
): boolean => {
  if (match.matchStatus !== LADDER_MATCH_STATUS.ACCEPTED) return false;
  if (match.walkover || match.noShowReported) return false;
  if (isLadderMatchCheckedIn(match as LadderMatch)) return false;

  const anyGameTouched = (match.games ?? []).some((game) => {
    const status = game.approvalStatus;
    return (
      !!game.result ||
      status === "approved" ||
      status === "pending" ||
      status === "Pending"
    );
  });
  if (anyGameTouched) return false;

  const startMs = getLadderMatchStartMs(match.matchDate, match.matchTime?.start);
  if (startMs === null) return false;
  return nowMs >= startMs + windowHours * HOUR_MS;
};
