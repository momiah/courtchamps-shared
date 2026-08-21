import {
  LADDER_MATCH_STATUS,
  type LadderMatch,
} from "../types/ladderMatch";

/** Maximum participants in a singles ladder match. */
export const LADDER_SINGLES_MAX_PARTICIPANTS = 2;

/**
 * True only when the match can still be accepted by `userId`: it is currently
 * `POSTED`, the user is not already a participant, and the match is not full
 * (singles: fewer than {@link LADDER_SINGLES_MAX_PARTICIPANTS} participants).
 */
export const canAcceptLadderMatch = (
  match: LadderMatch,
  userId: string
): boolean => {
  if (match.matchStatus !== LADDER_MATCH_STATUS.POSTED) {
    return false;
  }
  if (match.participants.includes(userId)) {
    return false;
  }
  if (match.participants.length >= LADDER_SINGLES_MAX_PARTICIPANTS) {
    return false;
  }
  return true;
};

/** The subset of {@link LadderMatch} fields written when a match is accepted. */
export interface AcceptedLadderMatchUpdate {
  participants: string[];
  matchStatus: typeof LADDER_MATCH_STATUS.ACCEPTED;
  acceptedBy: string;
  acceptedAt: Date;
}

/**
 * Build the field update for accepting a match: appends `userId` to
 * `participants`, flips the status to `ACCEPTED`, and records who/when.
 * Pure — the caller persists the result (e.g. via Firestore `updateDoc`).
 */
export const buildAcceptedLadderMatch = (
  match: LadderMatch,
  userId: string,
  acceptedAt: Date = new Date()
): AcceptedLadderMatchUpdate => ({
  participants: [...match.participants, userId],
  matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
  acceptedBy: userId,
  acceptedAt,
});
