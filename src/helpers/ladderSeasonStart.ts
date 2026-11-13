import { LADDER_STATUS } from "../types/ladder";
import type { Ladder } from "../types/ladder";
import { toMs } from "./ladderAutoCancel";
import { LADDER_SEASON_EXTENSION_DAYS } from "./ladderDates";
import { LADDER_MIN_PLAYOFF_SIZE } from "./ladderPlayoffStructure";
import { getLadderEntrantNoun } from "./ladderPreRegistrationDisplay";
import { normalizeLadderStatus } from "./ladderStatus";

/** Entrants (players, or teams in doubles) a ladder needs for its season to start. */
export const LADDER_MIN_ENTRANTS_TO_START = LADDER_MIN_PLAYOFF_SIZE;

export const LADDER_SEASON_NOT_STARTED_MESSAGE =
  "Matches open when the season starts";

type DateLike = Date | { toDate: () => Date } | string | number | null;

export type SeasonStartLadder = Pick<Ladder, "status"> & {
  seasonStartsAt?: DateLike;
  seasonStartedAt?: DateLike;
  seasonExtendedAt?: DateLike;
};

/**
 * Whether matches can be played: processLadderPhases has started the season,
 * or the ladder has moved past registration.
 */
export const isLadderSeasonStarted = (
  ladder: SeasonStartLadder | null | undefined,
): boolean =>
  !!ladder &&
  (normalizeLadderStatus(ladder.status) !== LADDER_STATUS.REGISTRATION_OPEN ||
    !!ladder.seasonStartedAt);

export type LadderSeasonStartStep = "start" | "extend" | "cancel";

/**
 * What processLadderPhases does once the season start is due: start the
 * season with enough entrants, otherwise move the start back once, then cancel.
 */
export const getLadderSeasonStartStep = (
  ladder: SeasonStartLadder,
  entrantCount: number,
  nowMs: number,
): LadderSeasonStartStep | null => {
  if (isLadderSeasonStarted(ladder)) return null;
  const startsMs = toMs(ladder.seasonStartsAt ?? null);
  if (startsMs === null || nowMs < startsMs) return null;
  if (entrantCount >= LADDER_MIN_ENTRANTS_TO_START) return "start";
  return ladder.seasonExtendedAt ? "cancel" : "extend";
};

/** How many more entrants the ladder needs before its season can start. */
export const getLadderEntrantsNeededToStart = (entrantCount: number): number =>
  Math.max(LADDER_MIN_ENTRANTS_TO_START - Math.max(entrantCount, 0), 0);

export interface LadderNotificationCopy {
  title: string;
  message: string;
}

type CopyLadder = Pick<Ladder, "name" | "ladderType">;

export const getLadderSeasonStartedNotification = (
  ladder: CopyLadder,
): LadderNotificationCopy => ({
  title: "The season has started",
  message: `${ladder.name} has started. Post or accept a match to start climbing the ladder.`,
});

export const getLadderSeasonExtendedNotification = (
  ladder: CopyLadder,
  entrantCount: number,
): LadderNotificationCopy => {
  const noun = getLadderEntrantNoun(ladder.ladderType);
  const needed = getLadderEntrantsNeededToStart(entrantCount);
  return {
    title: "Season start moved back",
    message: `${ladder.name} needs ${needed} more ${noun}${needed === 1 ? "" : "s"} to start, so the season now starts ${LADDER_SEASON_EXTENSION_DAYS} days later. Invite your friends to join. If fewer than ${LADDER_MIN_ENTRANTS_TO_START} ${noun}s have joined by then, the ladder will be cancelled and any entry fees refunded in full.`,
  };
};

export const getLadderSeasonCancelledNotification = (
  ladder: CopyLadder,
): LadderNotificationCopy => ({
  title: "Ladder cancelled",
  message: `${ladder.name} has been cancelled because fewer than ${LADDER_MIN_ENTRANTS_TO_START} ${getLadderEntrantNoun(ladder.ladderType)}s joined before the season start. If you paid an entry fee, it will be refunded to you in full.`,
});
