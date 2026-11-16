import { LADDER_STATUS } from "../types/ladder";
import type { Ladder } from "../types/ladder";
import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type { LadderMatch } from "../types/ladderMatch";
import { toMs } from "./ladderAutoCancel";
import { isCashLadder } from "./ladderPreRegistrationDisplay";
import { LADDER_REGISTRATION_CLOSE_DAYS } from "./ladderDates";
import { isLadderSeasonStarted } from "./ladderSeasonStart";

/**
 * Days before registration closes when entrants without a completed match are
 * removed from a free ladder, so the places they free can be filled while
 * registration is still open.
 */
export const LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE = 14;
/** Days into the season when inactive entrants are removed. */
export const LADDER_INACTIVITY_REMOVAL_SEASON_DAY =
  LADDER_REGISTRATION_CLOSE_DAYS - LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE;
/** Days before the removal date when inactive entrants are warned. */
export const LADDER_INACTIVITY_WARNING_DAYS = [7, 3, 1] as const;
/** Entrants who joined less than this many days before the removal date keep their place. */
export const LADDER_INACTIVITY_JOIN_GRACE_DAYS = 14;
/** Completed matches a player (or team) needs by the removal date to keep their place. */
export const LADDER_INACTIVITY_MIN_COMPLETED_MATCHES = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

type DateLike = Date | { toDate: () => Date } | string | number | null;

/** A singles player (entrantId = userId) or doubles team (entrantId = teamKey). */
export interface LadderEntrant {
  entrantId: string;
  playerIds: string[];
  /** When the player or team joined the ladder. */
  joinedAt?: DateLike;
}

type InactivityLadder = Pick<Ladder, "entryFee" | "status"> & {
  registrationClosesAt?: DateLike;
  seasonStartedAt?: DateLike;
  inactivityWarningDaysSent?: number[];
  inactivityRemovedAt?: DateLike;
};

/** When inactive entrants are removed: LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE days before registration closes. */
export const getLadderInactivityRemovalMs = (
  ladder: Pick<InactivityLadder, "registrationClosesAt">,
): number | null => {
  const closesMs = toMs(ladder.registrationClosesAt ?? null);
  return closesMs === null
    ? null
    : closesMs - LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE * DAY_MS;
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
 * the removal date has passed, or nothing. Only once the season has started,
 * since matches can't be played before then.
 */
export const getLadderInactivityStep = (
  ladder: InactivityLadder,
  nowMs: number,
): LadderInactivityStep => {
  if (!appliesLadderInactivityRemoval(ladder)) return null;
  if (ladder.status !== LADDER_STATUS.REGISTRATION_OPEN) return null;
  if (ladder.inactivityRemovedAt) return null;
  if (!isLadderSeasonStarted(ladder)) return null;
  const removalMs = getLadderInactivityRemovalMs(ladder);
  if (removalMs === null) return null;
  if (nowMs >= removalMs) return { kind: "remove" };
  const sent = ladder.inactivityWarningDaysSent ?? [];
  const due = LADDER_INACTIVITY_WARNING_DAYS.filter(
    (days) => nowMs >= removalMs - days * DAY_MS && !sent.includes(days),
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

/** Whether an entrant joined too close to the removal date to be removed. */
export const isWithinLadderInactivityJoinGrace = (
  entrant: Pick<LadderEntrant, "joinedAt">,
  removalMs: number,
): boolean => {
  const joinedMs = toMs(entrant.joinedAt ?? null);
  return (
    joinedMs !== null &&
    joinedMs > removalMs - LADDER_INACTIVITY_JOIN_GRACE_DAYS * DAY_MS
  );
};

/**
 * Entrants to remove: fewer than LADDER_INACTIVITY_MIN_COMPLETED_MATCHES
 * completed season matches, and joined at least LADDER_INACTIVITY_JOIN_GRACE_DAYS
 * before the removal date.
 */
export const getInactiveLadderEntrants = <T extends LadderEntrant>(
  entrants: T[],
  matches: Parameters<typeof isCompletedLadderMatchFor>[1][],
  removalMs: number,
): T[] =>
  entrants.filter(
    (entrant) =>
      !isWithinLadderInactivityJoinGrace(entrant, removalMs) &&
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
  message: `Play ${MATCHES_NEEDED} in ${ladder.name} in the next ${daysLeft} day${daysLeft === 1 ? "" : "s"}, or you'll be removed from the ladder to make room for new players.`,
});

export const getLadderInactivityRemoval = (
  ladder: Pick<Ladder, "name">,
): { title: string; message: string } => ({
  title: `Removed from ${ladder.name}`,
  message: `You didn't play ${MATCHES_NEEDED} in ${ladder.name} in time, so you've been removed from the ladder. You can join again next season.`,
});

/** What a player removed for inactivity sees instead of Join. */
export const LADDER_INACTIVITY_REMOVED_LABEL = "Removed for inactivity";

/** Whether this user was removed from the ladder for inactivity this season, so can't rejoin it. */
export const isLadderInactivityRemovedUser = (
  ladder: { inactivityRemovedUserIds?: string[] | null } | null | undefined,
  userId: string | null | undefined,
): boolean => !!userId && !!ladder?.inactivityRemovedUserIds?.includes(userId);

const listDays = (days: readonly number[]): string =>
  days.length > 1
    ? `${days.slice(0, -1).join(", ")} and ${days[days.length - 1]}`
    : `${days[0]}`;

/** The Rules screen's section on keeping a place on a free ladder. */
export const getLadderInactivityRules = (noun: string): string[] => {
  const nouns = `${noun.charAt(0).toUpperCase()}${noun.slice(1)}s`;
  return [
    `On free ladders, every ${noun} needs to play at least ${LADDER_INACTIVITY_MIN_COMPLETED_MATCHES === 1 ? "one match" : `${LADDER_INACTIVITY_MIN_COMPLETED_MATCHES} matches`} in the first ${LADDER_INACTIVITY_REMOVAL_SEASON_DAY} days of the season.`,
    `${nouns} who haven't are removed then, ${LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE} days before registration closes, so new players can take their place.`,
    `You'll get a reminder ${listDays(LADDER_INACTIVITY_WARNING_DAYS)} days before.`,
    `${nouns} who join less than ${LADDER_INACTIVITY_JOIN_GRACE_DAYS} days before then keep their place.`,
    `${nouns} removed for inactivity can't rejoin that ladder until next season.`,
  ];
};
