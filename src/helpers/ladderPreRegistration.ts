import { LADDER_STATUS } from "../types/ladder";
import type { Ladder } from "../types/ladder";
import { LADDER_PRE_REGISTRATION_STATUS } from "../types/ladderPreRegistration";
import type { LadderPreRegistration } from "../types/ladderPreRegistration";
import { toMs } from "./ladderAutoCancel";

type DateLike = Date | { toDate: () => Date } | null | undefined;

/**
 * A launched pre-registration notifies its registrants once, when its ladder
 * actually opens for registration (registrationOpensAt), not when the ladder
 * document is created.
 */
export const isLadderPreRegistrationDue = (
  preRegistration: Pick<LadderPreRegistration, "status" | "ladderId"> & {
    notifiedAt?: DateLike;
  },
  ladder: Pick<Ladder, "status"> & { registrationOpensAt?: DateLike },
  now: Date,
): boolean => {
  if (preRegistration.status !== LADDER_PRE_REGISTRATION_STATUS.LAUNCHED) {
    return false;
  }
  if (!preRegistration.ladderId || preRegistration.notifiedAt) return false;
  if (ladder.status !== LADDER_STATUS.REGISTRATION_OPEN) return false;
  const opensAt = toMs(ladder.registrationOpensAt);
  return opensAt !== null && opensAt <= now.getTime();
};
