import { LADDER_STATUS } from "../types/ladder";
import { normalizeLadderStatus } from "./ladderStatus";

export const LADDER_FROZEN_MESSAGE =
  "This game can no longer be actioned as playoffs has started";

export const isLadderMatchPlayFrozen = (
  status: string | null | undefined,
): boolean => {
  const normalized = normalizeLadderStatus(status);
  return (
    normalized === LADDER_STATUS.PLAYOFFS ||
    normalized === LADDER_STATUS.COMPLETED ||
    normalized === LADDER_STATUS.CANCELLED
  );
};
