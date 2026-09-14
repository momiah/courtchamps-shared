import {
  LADDER_MATCH_STATUS,
  type LadderMatch,
  type MatchTeam,
} from "../types/ladderMatch";

/** Maximum participants in a singles ladder match. */
export const LADDER_SINGLES_MAX_PARTICIPANTS = 2;

/**
 * True only when the match can still be accepted: it is currently `POSTED` and
 * the accepting side is not already in it.
 *
 * Singles (no `team`): `userId` is not already a participant and the match has
 * fewer than {@link LADDER_SINGLES_MAX_PARTICIPANTS} participants.
 *
 * Doubles (`team` given): the second team slot is still open and none of the
 * team's players are already in the match (which also rules out the poster's
 * own team, since its players are the current participants).
 */
export const canAcceptLadderMatch = (
  match: LadderMatch,
  userId: string,
  team?: MatchTeam
): boolean => {
  if (match.matchStatus !== LADDER_MATCH_STATUS.POSTED) {
    return false;
  }
  if (team) {
    if ((match.teams?.length ?? 0) >= 2) {
      return false;
    }
    return !team.playerIds.some((id) => match.participants.includes(id));
  }
  if (match.participants.includes(userId)) {
    return false;
  }
  return match.participants.length < LADDER_SINGLES_MAX_PARTICIPANTS;
};

/**
 * The subset of {@link LadderMatch} fields written when a match is accepted.
 * `teams` is present only for a doubles accept.
 */
export interface AcceptedLadderMatchUpdate {
  participants: string[];
  teams?: MatchTeam[];
  matchStatus: typeof LADDER_MATCH_STATUS.ACCEPTED;
  acceptedBy: string;
  acceptedAt: Date;
}

/**
 * Build the field update for accepting a match: flips the status to `ACCEPTED`
 * and records who/when. Singles (no `team`) appends `userId` to `participants`;
 * doubles (`team` given) appends the team's players to `participants` and the
 * team to `teams`. Pure — the caller persists the result (e.g. via Firestore
 * `updateDoc`).
 */
export const buildAcceptedLadderMatch = (
  match: LadderMatch,
  userId: string,
  team?: MatchTeam,
  acceptedAt: Date = new Date()
): AcceptedLadderMatchUpdate => ({
  participants: team
    ? [...match.participants, ...team.playerIds]
    : [...match.participants, userId],
  ...(team ? { teams: [...(match.teams ?? []), team] } : {}),
  matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
  acceptedBy: userId,
  acceptedAt,
});
