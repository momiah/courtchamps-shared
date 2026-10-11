import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type {
  LadderMatch,
  LadderMatchExtension,
  MatchTime,
} from "../types/ladderMatch";
import { getLadderMatchStartMs } from "./ladderAutoCancel";

/** Days an extension keeps an accepted match from expiring. */
export const LADDER_MATCH_EXTENSION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type LadderMatchChangeOption = "reschedule" | "extension" | "extended";

export type LadderMatchRescheduleError = "invalid" | "past" | "after_deadline";

/**
 * The one change an accepted match offers: reschedule before any game is
 * reported, an extension once one is, or "extended" when it was already used.
 */
export const getLadderMatchChangeOption = (
  match: Pick<
    LadderMatch,
    "matchStatus" | "games" | "extension" | "walkover" | "noShowReported"
  >,
): LadderMatchChangeOption | null => {
  if (match.matchStatus !== LADDER_MATCH_STATUS.ACCEPTED) return null;
  if (match.walkover || match.noShowReported) return null;
  const reported = (match.games ?? []).some((game) => game.result);
  if (!reported) return "reschedule";
  return match.extension ? "extended" : "extension";
};

/** The extension a player takes now, capped at a playoff tie's deadline. */
export const buildLadderMatchExtension = ({
  userId,
  now,
  capAt,
}: {
  userId: string;
  now: Date;
  capAt?: Date | null;
}): LadderMatchExtension => {
  const full = now.getTime() + LADDER_MATCH_EXTENSION_DAYS * DAY_MS;
  const cap = capAt ? capAt.getTime() : Infinity;
  return {
    requestedBy: userId,
    requestedAt: now,
    expiresAt: new Date(Math.min(full, cap)),
  };
};

/** Why a proposed new date and time can't be used, or null when it can. */
export const validateLadderMatchReschedule = ({
  matchDate,
  matchTime,
  nowMs,
  deadlineMs,
}: {
  matchDate: string;
  matchTime: MatchTime;
  nowMs: number;
  deadlineMs?: number | null;
}): LadderMatchRescheduleError | null => {
  const start = getLadderMatchStartMs(matchDate, matchTime?.start);
  if (start === null) return "invalid";
  if (start <= nowMs) return "past";
  if (deadlineMs != null && start > deadlineMs) return "after_deadline";
  return null;
};

/** Whole days left on an extension, rounded up; 0 once it has run out. */
export const getLadderMatchExtensionDaysLeft = (
  expiresAtMs: number,
  nowMs: number,
): number => Math.max(0, Math.ceil((expiresAtMs - nowMs) / DAY_MS));
