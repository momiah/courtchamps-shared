import type { Ladder } from "../types/ladder";
import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type { LadderMatch } from "../types/ladderMatch";
import { toMs } from "./ladderAutoCancel";
import { hasOpenLadderDispute } from "./ladderMatchResult";
import { isPlayoffLadderMatch } from "./ladderFreeze";

export const LADDER_POSTING_CLOSE_DAYS = 7;
export const LADDER_RESULTS_CLOSE_DAYS = 5;
export const LADDER_STANDINGS_FINAL_DAYS = 1;

export const LADDER_RESULTS_CLOSED_MESSAGE =
  "Ladder results have closed ahead of the playoffs";

const DAY_MS = 24 * 60 * 60 * 1000;

type SeasonLadder = Pick<Ladder, "playoffStartsAt"> | null | undefined;

const daysBeforePlayoffs = (ladder: SeasonLadder, days: number): Date | null => {
  const start = toMs(ladder?.playoffStartsAt);
  return start === null ? null : new Date(start - days * DAY_MS);
};

export const getLadderPostingDeadline = (ladder: SeasonLadder): Date | null =>
  daysBeforePlayoffs(ladder, LADDER_POSTING_CLOSE_DAYS);

export const getLadderResultsDeadline = (ladder: SeasonLadder): Date | null =>
  daysBeforePlayoffs(ladder, LADDER_RESULTS_CLOSE_DAYS);

export const getLadderStandingsDeadline = (ladder: SeasonLadder): Date | null =>
  daysBeforePlayoffs(ladder, LADDER_STANDINGS_FINAL_DAYS);

const isPast = (deadline: Date | null, now: Date): boolean =>
  !!deadline && now.getTime() >= deadline.getTime();

export const isLadderPostingClosed = (ladder: SeasonLadder, now: Date): boolean =>
  isPast(getLadderPostingDeadline(ladder), now);

export const isLadderStandingsFinal = (ladder: SeasonLadder, now: Date): boolean =>
  isPast(getLadderStandingsDeadline(ladder), now);

export const isLadderResultsClosed = (
  ladder: SeasonLadder,
  match: Pick<LadderMatch, "playoffTieId"> | null | undefined,
  now: Date,
): boolean =>
  !isPlayoffLadderMatch(match) && isPast(getLadderResultsDeadline(ladder), now);

const isPendingGame = (game: { approvalStatus?: string }): boolean =>
  game.approvalStatus?.toLowerCase() === "pending";

/**
 * An accepted regular match that results close has left with nothing still to
 * settle: no game awaiting approval, no open dispute and no no-show claim. It
 * expires, keeping any games already approved.
 */
export const isLadderMatchClosedByResults = (
  ladder: SeasonLadder,
  match: Pick<
    LadderMatch,
    "matchStatus" | "playoffTieId" | "games" | "noShowReported" | "walkover"
  >,
  now: Date,
): boolean =>
  match.matchStatus === LADDER_MATCH_STATUS.ACCEPTED &&
  isLadderResultsClosed(ladder, match, now) &&
  !match.walkover &&
  !match.noShowReported &&
  !hasOpenLadderDispute(match.games ?? []) &&
  !(match.games ?? []).some(isPendingGame);
