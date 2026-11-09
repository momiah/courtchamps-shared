import { LADDER_STATUS } from "../types/ladder";
import type { Ladder } from "../types/ladder";
import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type { LadderMatch } from "../types/ladderMatch";
import { toMs } from "./ladderAutoCancel";
import { isCashLadder } from "./ladderPreRegistrationDisplay";

/** Days before registration closes when inactive players on a free ladder are warned. */
export const LADDER_INACTIVITY_WARNING_DAYS = [14, 7, 3, 1] as const;
/** Completed matches a player (or team) needs by registration close to keep their place. */
export const LADDER_INACTIVITY_MIN_COMPLETED_MATCHES = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A singles player (entrantId = userId) or doubles team (entrantId = teamKey). */
export interface LadderEntrant {
  entrantId: string;
  playerIds: string[];
}

type InactivityLadder = Pick<Ladder, "entryFee" | "status"> & {
  registrationClosesAt?: Ladder["registrationClosesAt"] | { toDate: () => Date } | null;
  inactivityWarningDaysSent?: number[];
  inactivityRemovedAt?: Ladder["inactivityRemovedAt"] | { toDate: () => Date } | null;
};

export type LadderInactivityStep =
  | { kind: "warn"; daysLeft: number }
  | { kind: "remove" }
  | null;

/** Free ladders only remove entrants who haven't played. */
export const appliesLadderInactivityRemoval = (
  ladder: Pick<Ladder, "entryFee">,
): boolean => !isCashLadder({ entryFee: ladder.entryFee ?? 0 });

/**
 * What the scheduled job should do for a ladder now: send the latest warning
 * not yet sent (earlier missed ones are skipped), remove inactive entrants once
 * registration has closed, or nothing.
 */
export const getLadderInactivityStep = (
  ladder: InactivityLadder,
  nowMs: number,
): LadderInactivityStep => {
  if (!appliesLadderInactivityRemoval(ladder)) return null;
  if (ladder.status !== LADDER_STATUS.REGISTRATION_OPEN) return null;
  if (ladder.inactivityRemovedAt) return null;
  const closesMs = toMs(ladder.registrationClosesAt ?? null);
  if (closesMs === null) return null;
  if (nowMs >= closesMs) return { kind: "remove" };
  const sent = ladder.inactivityWarningDaysSent ?? [];
  const due = LADDER_INACTIVITY_WARNING_DAYS.filter(
    (days) => nowMs >= closesMs - days * DAY_MS && !sent.includes(days),
  );
  return due.length ? { kind: "warn", daysLeft: Math.min(...due) } : null;
};

/** The warning days to record once the `daysLeft` warning has gone out, including any it skipped. */
export const markLadderInactivityWarningSent = (
  sent: number[] | undefined,
  daysLeft: number,
): number[] =>
  [
    ...new Set([
      ...(sent ?? []),
      ...LADDER_INACTIVITY_WARNING_DAYS.filter((days) => days >= daysLeft),
    ]),
  ].sort((a, b) => b - a);

/** Whether a completed season match counts for this entrant. A walkover only counts for its winner. */
export const isCompletedLadderMatchFor = (
  entrant: LadderEntrant,
  match: Pick<
    LadderMatch,
    "matchStatus" | "playoffTieId" | "walkover" | "walkoverWinner" | "teams" | "participants"
  >,
): boolean => {
  if (match.matchStatus !== LADDER_MATCH_STATUS.COMPLETED || match.playoffTieId) {
    return false;
  }
  if (match.walkover) return match.walkoverWinner === entrant.entrantId;
  if (match.teams?.length) {
    return match.teams.some((team) => team.teamKey === entrant.entrantId);
  }
  return (match.participants ?? []).includes(entrant.entrantId);
};

export const getInactiveLadderEntrants = <T extends LadderEntrant>(
  entrants: T[],
  matches: Parameters<typeof isCompletedLadderMatchFor>[1][],
): T[] =>
  entrants.filter(
    (entrant) =>
      matches.filter((match) => isCompletedLadderMatchFor(entrant, match)).length <
      LADDER_INACTIVITY_MIN_COMPLETED_MATCHES,
  );

const MATCHES_NEEDED =
  LADDER_INACTIVITY_MIN_COMPLETED_MATCHES === 1
    ? "a match"
    : `${LADDER_INACTIVITY_MIN_COMPLETED_MATCHES} matches`;

export const getLadderInactivityWarning = (
  ladder: Pick<Ladder, "name">,
  daysLeft: number,
): { title: string; message: string } => ({
  title: "Play a match to keep your place",
  message: `Registration for ${ladder.name} closes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Play ${MATCHES_NEEDED} before then, or you'll be removed from the ladder.`,
});

export const getLadderInactivityRemoval = (
  ladder: Pick<Ladder, "name">,
): { title: string; message: string } => ({
  title: `Removed from ${ladder.name}`,
  message: `You didn't play ${MATCHES_NEEDED} in ${ladder.name} before registration closed, so you've been removed from the ladder.`,
});
