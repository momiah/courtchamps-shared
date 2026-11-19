import { LADDER_STATUS } from "../types/ladder";
import { LADDER_PLAYOFF_TIE_DAYS } from "../types/ladderPlayoff";
import {
  LADDER_PLAYOFF_START_DAYS,
  LADDER_REGISTRATION_CLOSE_DAYS,
  LADDER_SEASON_EXTENSION_DAYS,
  LADDER_SEASON_START_DAYS,
} from "./ladderDates";
import { LADDER_POSTING_CLOSE_DAYS } from "./ladderSeasonClose";
import { LADDER_MIN_ENTRANTS_TO_START } from "./ladderSeasonStart";
import { LADDER_STATUS_LABELS } from "./ladderStatus";

export const LADDER_SEASON_PHASE = {
  REGISTRATION_OPEN: LADDER_STATUS.REGISTRATION_OPEN,
  SEASON_STARTS: "seasonStarts",
  REGISTRATION_CLOSED: LADDER_STATUS.REGISTRATION_CLOSED,
  PLAYOFFS: LADDER_STATUS.PLAYOFFS,
  COMPLETED: LADDER_STATUS.COMPLETED,
} as const;

export type LadderSeasonPhaseKey =
  (typeof LADDER_SEASON_PHASE)[keyof typeof LADDER_SEASON_PHASE];

export interface LadderSeasonPhaseCopy {
  key: LadderSeasonPhaseKey;
  label: string;
  /** "14 - 28 days", "Day 1 - 60" (days of the season), "7 rounds". */
  length?: string;
  text: string;
}

type Noun = "player" | "team";

const days = (count: number) => `${count} day${count === 1 ? "" : "s"}`;

/** The season timeline every How to Play guide shows, in order. */
export const getLadderSeasonPhases = ({
  noun,
  playoffSpots,
  isPaid,
}: {
  noun: Noun;
  playoffSpots: number;
  isPaid: boolean;
}): LadderSeasonPhaseCopy[] => [
  {
    key: LADDER_SEASON_PHASE.REGISTRATION_OPEN,
    label: LADDER_STATUS_LABELS[LADDER_STATUS.REGISTRATION_OPEN],
    length: `${LADDER_SEASON_START_DAYS} - ${days(LADDER_SEASON_START_DAYS + LADDER_SEASON_EXTENSION_DAYS)}`,
    text: `Sign up and invite friends. Initial period of ${days(LADDER_SEASON_START_DAYS)} until ${LADDER_MIN_ENTRANTS_TO_START} ${noun}s join, extended to ${days(LADDER_SEASON_START_DAYS + LADDER_SEASON_EXTENSION_DAYS)} until ${LADDER_MIN_ENTRANTS_TO_START} ${noun}s join. If not, the ladder is cancelled${isPaid ? " and refunded" : ""}.`,
  },
  {
    key: LADDER_SEASON_PHASE.SEASON_STARTS,
    label: "Play Starts",
    length: `Day 1 - ${LADDER_REGISTRATION_CLOSE_DAYS}`,
    text: `Matches open. Post or accept matches to climb. New ${noun}s can still join.`,
  },
  {
    key: LADDER_SEASON_PHASE.REGISTRATION_CLOSED,
    label: LADDER_STATUS_LABELS[LADDER_STATUS.REGISTRATION_CLOSED],
    length: `Day ${LADDER_REGISTRATION_CLOSE_DAYS + 1} - ${LADDER_PLAYOFF_START_DAYS}`,
    text: `No new ${noun}s join. Keep climbing; new matches close ${days(LADDER_POSTING_CLOSE_DAYS)} before the playoffs.`,
  },
  {
    key: LADDER_SEASON_PHASE.PLAYOFFS,
    label: LADDER_STATUS_LABELS[LADDER_STATUS.PLAYOFFS],
    length: `${Math.log2(playoffSpots)} rounds`,
    text: `The top ${playoffSpots} ${noun}s play a knockout. Each round is two matches, home and away, played within ${days(LADDER_PLAYOFF_TIE_DAYS)}.`,
  },
  {
    key: LADDER_SEASON_PHASE.COMPLETED,
    label: LADDER_STATUS_LABELS[LADDER_STATUS.COMPLETED],
    text: isPaid
      ? "The champion crowned. Cash paid. CP awarded."
      : "The champion crowned. CP awarded.",
  },
];

/** The season start rules, for the Registration section of the ladder rules. */
export const getLadderSeasonStartRules = (noun: Noun): string[] => [
  `Matches open when the season starts, ${LADDER_SEASON_START_DAYS} days after registration opens, once ${LADDER_MIN_ENTRANTS_TO_START} ${noun}s have joined.`,
  `If fewer have joined by then, the season start moves back ${LADDER_SEASON_EXTENSION_DAYS} days. If there are still too few, the ladder is cancelled and every entry fee is refunded in full.`,
  `Registration stays open for the first ${LADDER_REGISTRATION_CLOSE_DAYS} days of the season.`,
];
