import {
  LADDER_MATCH_STATUS,
  type LadderMatch,
  type MatchTeam,
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

/**
 * Doubles: true only when `team` can still accept the match — it is `POSTED`,
 * the second team slot is still open, and none of the team's players are
 * already in the match (which also rules out the poster's own team, since its
 * players are the current participants).
 */
export const canTeamAcceptLadderMatch = (
  match: LadderMatch,
  playerIds: string[]
): boolean => {
  if (match.matchStatus !== LADDER_MATCH_STATUS.POSTED) {
    return false;
  }
  if ((match.teams?.length ?? 0) >= 2) {
    return false;
  }
  if (playerIds.some((id) => match.participants.includes(id))) {
    return false;
  }
  return true;
};

/**
 * The subset of {@link LadderMatch} fields written when a team accepts a
 * doubles match.
 */
export interface TeamAcceptedLadderMatchUpdate {
  participants: string[];
  teams: MatchTeam[];
  matchStatus: typeof LADDER_MATCH_STATUS.ACCEPTED;
  acceptedBy: string;
  acceptedAt: Date;
}

/**
 * Doubles: build the field update for a team accepting a match — appends the
 * team's players to `participants`, the team to `teams`, flips the status to
 * `ACCEPTED`, and records the acting player and time. Pure — the caller
 * persists the result.
 */
export const buildTeamAcceptedLadderMatch = (
  match: LadderMatch,
  team: MatchTeam,
  acceptedBy: string,
  acceptedAt: Date = new Date()
): TeamAcceptedLadderMatchUpdate => ({
  participants: [...match.participants, ...team.playerIds],
  teams: [...(match.teams ?? []), team],
  matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
  acceptedBy,
  acceptedAt,
});
