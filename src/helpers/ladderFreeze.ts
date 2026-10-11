import { LADDER_STATUS } from "../types/ladder";
import type { LadderMatch } from "../types/ladderMatch";
import { normalizeLadderStatus } from "./ladderStatus";

export const LADDER_FROZEN_MESSAGE =
  "This game can no longer be actioned as playoffs has started";

export const isPlayoffLadderMatch = (
  match: Pick<LadderMatch, "playoffTieId"> | null | undefined,
): boolean => !!match?.playoffTieId;

export const isLadderMatchPlayFrozen = (
  status: string | null | undefined,
  match?: Pick<LadderMatch, "playoffTieId"> | null,
): boolean => {
  const normalized = normalizeLadderStatus(status);
  if (normalized === LADDER_STATUS.PLAYOFFS) return !isPlayoffLadderMatch(match);
  return (
    normalized === LADDER_STATUS.COMPLETED ||
    normalized === LADDER_STATUS.CANCELLED
  );
};
