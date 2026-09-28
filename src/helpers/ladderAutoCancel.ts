import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type { LadderMatch } from "../types/ladderMatch";
import type { Game } from "../types/game";
import { isLadderMatchCheckedIn } from "./ladderMatchCheckIn";
import {
  resolveLadderMatchOutcome,
  hasOpenLadderDispute,
} from "./ladderMatchResult";

/** Hours after the scheduled start before an unattended match auto-cancels. */
export const LADDER_MATCH_AUTO_CANCEL_HOURS = 48;

/** Hours of silence after activity before an abandoned match auto-expires. */
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

/** A game counts as reported once it carries a result or any non-empty status. */
const anyGameReported = (games: Game[]): boolean =>
  games.some(
    (game) =>
      !!game.result ||
      game.approvalStatus === "approved" ||
      game.approvalStatus === "pending" ||
      game.approvalStatus === "Pending" ||
      game.approvalStatus === "disputed",
  );

/** True once a match has seen any activity — a check-in or a reported game. */
export const hasLadderMatchActivity = (
  match: Pick<LadderMatch, "checkIn" | "games">,
): boolean =>
  isLadderMatchCheckedIn(match as LadderMatch) ||
  anyGameReported(match.games ?? []);

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
  if (hasLadderMatchActivity(match)) return false;

  const startMs = getLadderMatchStartMs(match.matchDate, match.matchTime?.start);
  if (startMs === null) return false;
  return nowMs >= startMs + windowHours * HOUR_MS;
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
 * True when a match that was started (checked in or a game reported) has then
 * gone silent past the expire window without reaching a result. Distinct from
 * {@link isLadderMatchUnattended}: that one never started; this one was
 * abandoned mid-play. A match with an open dispute, or already decided on
 * approved games, is left for the dispute/approval flows instead.
 */
export const isLadderMatchExpired = (
  match: Pick<
    LadderMatch,
    | "matchStatus"
    | "walkover"
    | "noShowReported"
    | "checkIn"
    | "games"
    | "bestOf"
    | "lastUpdated"
  >,
  nowMs: number,
  windowHours: number = LADDER_MATCH_EXPIRE_HOURS,
): boolean => {
  if (match.matchStatus !== LADDER_MATCH_STATUS.ACCEPTED) return false;
  if (match.walkover || match.noShowReported) return false;
  if (!hasLadderMatchActivity(match)) return false;
  const games = match.games ?? [];
  if (hasOpenLadderDispute(games)) return false;
  if (resolveLadderMatchOutcome(games, match.bestOf ?? games.length).decided) {
    return false;
  }
  const lastMs = lastLadderActivityMs(match);
  if (lastMs === null) return false;
  return nowMs >= lastMs + windowHours * HOUR_MS;
};
