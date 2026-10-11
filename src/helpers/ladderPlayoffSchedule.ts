import {
  LADDER_PLAYOFF_TIE_DAYS,
  LADDER_PLAYOFF_TIE_STATUS,
} from "../types/ladderPlayoff";
import type { LadderPlayoffTie } from "../types/ladderPlayoff";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Games per match by how far the round is from the Final, so every bracket
 * size uses the same scale: Round of 16 to the Final (and the 3rd-place game)
 * 7; earlier rounds 5.
 */
export const getLadderPlayoffBestOf = ({
  round,
  totalRounds,
  isThirdPlacePlayoff,
}: {
  round: number;
  totalRounds: number;
  isThirdPlacePlayoff: boolean;
}): number => {
  if (isThirdPlacePlayoff) return 7;
  return totalRounds - round <= 3 ? 7 : 5;
};

export const scheduleLadderPlayoffTie = (
  now: Date,
): Pick<LadderPlayoffTie, "status" | "scheduledAt" | "deadlineAt"> => ({
  status: LADDER_PLAYOFF_TIE_STATUS.SCHEDULED,
  scheduledAt: now,
  deadlineAt: new Date(now.getTime() + LADDER_PLAYOFF_TIE_DAYS * DAY_MS),
});
