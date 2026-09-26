import { notificationTypes } from "../schema";
import {
  DISPUTE_EVENT_TYPE,
  DISPUTE_RESOLUTION,
  DISPUTE_STAGE,
} from "../types/dispute";
import type {
  Dispute,
  DisputeEvent,
  DisputeEventType,
  DisputeResolution,
} from "../types/dispute";
import type { Game } from "../types/game";
import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type { LadderMatch } from "../types/ladderMatch";
import { LADDER_TYPE } from "../types/ladder";
import type { TeamStats } from "../types/competition";
import type { ScoreboardProfile, UserProfile } from "../types/player";
import { resolveLadderMatchOutcome } from "./ladderMatchResult";
import { scoreDoublesLadderGame } from "./scoreDoublesLadderGame";
import { scoreSinglesLadderGame } from "./scoreSinglesLadderGame";

const RESOLUTION_EVENT: Record<DisputeResolution, DisputeEventType> = {
  upheld: DISPUTE_EVENT_TYPE.RESOLVED,
  rejected: DISPUTE_EVENT_TYPE.RESOLVED,
  void: DISPUTE_EVENT_TYPE.VOIDED,
  cancelled: DISPUTE_EVENT_TYPE.CANCELLED,
};

export class DisputeResolutionError extends Error {}

const pruneUndefined = <T extends object>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as T;

/** The approved game a resolution writes to the match. */
export const getDisputeFinalGame = (
  dispute: Pick<Dispute, "originalGame" | "disputedGame">,
  resolution: DisputeResolution,
): Game =>
  pruneUndefined<Game>({
    ...(resolution === DISPUTE_RESOLUTION.UPHELD
      ? dispute.disputedGame
      : dispute.originalGame),
    approvalStatus: notificationTypes.RESPONSE.APPROVED_GAME,
  });

/** userIds whose ladder participant and user docs a resolution rescores. */
export const getDisputePlayerIds = (game: Game): string[] =>
  [
    game.team1?.player1?.userId,
    game.team1?.player2?.userId,
    game.team2?.player1?.userId,
    game.team2?.player2?.userId,
  ].filter((id): id is string => Boolean(id));

/** Whether the match is scored as doubles (team docs must be read too). */
export const isDoublesDispute = (
  dispute: Pick<Dispute, "ladderType">,
  match: Pick<LadderMatch, "teams">,
): boolean =>
  (match.teams?.length ?? 0) >= 2 || dispute.ladderType === LADDER_TYPE.DOUBLES;

export interface PlanDisputeResolutionInput {
  dispute: Dispute;
  match: LadderMatch;
  /** Existing ladder participant docs for {@link getDisputePlayerIds}. */
  participants: ScoreboardProfile[];
  /** Existing user docs for {@link getDisputePlayerIds}. */
  users: UserProfile[];
  /** Existing ladder team docs (doubles only). */
  ladderTeams: TeamStats[];
  resolution: DisputeResolution;
  /** Admin userId, the opener (cancel), or DISPUTE_SYSTEM_ACTOR (auto-void). */
  actorId: string;
  note?: string;
  now: Date;
}

export interface DisputeResolutionPlan {
  finalGame: Game;
  /** Fields to update on the ladder match doc. */
  matchUpdate: Record<string, unknown>;
  /** Ladder participant docs to set. */
  participants: ScoreboardProfile[];
  /** User docs whose `profileDetail` to update. */
  users: UserProfile[];
  /** Ladder team docs to set (doubles only). */
  teams: TeamStats[];
  /** Fields to update on the dispute doc. */
  disputeUpdate: Record<string, unknown>;
}

/**
 * Resolve a dispute without touching Firestore, so the website (client SDK),
 * the app (client SDK) and Cloud Functions (admin SDK) share one path: read
 * the match, participants, users and teams in a transaction, call this, then
 * write what it returns. The chosen game is approved and scored through the
 * normal ladder game flow, the match completes when decided, and the dispute
 * gets its closing timeline phase.
 */
export const planDisputeResolution = async ({
  dispute,
  match,
  participants,
  users,
  ladderTeams,
  resolution,
  actorId,
  note,
  now,
}: PlanDisputeResolutionInput): Promise<DisputeResolutionPlan> => {
  if (match.matchStatus === LADDER_MATCH_STATUS.COMPLETED) {
    throw new DisputeResolutionError("This match has already been completed");
  }
  const games = match.games ?? [];
  const index = games.findIndex((g) => g.gameId === dispute.gameId);
  if (index === -1) throw new DisputeResolutionError("Game not found in match");

  const finalGame = getDisputeFinalGame(dispute, resolution);
  const nextGames = [...games];
  nextGames[index] = finalGame;

  const outcome = resolveLadderMatchOutcome(
    nextGames,
    match.bestOf ?? nextGames.length,
  );
  const matchDecided = outcome.decided && !!outcome.winnerTeam;

  let scoredParticipants = participants;
  let teams: TeamStats[] = [];
  if (isDoublesDispute(dispute, match)) {
    const scored = await scoreDoublesLadderGame({
      game: finalGame,
      participants,
      users,
      ladderTeams,
      matchDecided,
      matchWinnerSide: outcome.winnerTeam,
    });
    scoredParticipants = scored.scoringParticipants;
    teams = scored.teams;
  } else {
    scoreSinglesLadderGame({
      game: finalGame,
      participants,
      users,
      matchDecided,
      matchWinnerSide: outcome.winnerTeam,
    });
  }

  const matchUpdate: Record<string, unknown> = {
    games: nextGames,
    lastUpdated: now,
  };
  if (matchDecided) {
    matchUpdate.matchStatus = LADDER_MATCH_STATUS.COMPLETED;
    matchUpdate.completedAt = now;
  }

  const event = pruneUndefined<DisputeEvent>({
    type: RESOLUTION_EVENT[resolution],
    stage: DISPUTE_STAGE.RESOLVED,
    note: note?.trim() || undefined,
    createdBy: actorId,
    createdAt: now,
  });

  return {
    finalGame,
    matchUpdate,
    participants: scoredParticipants.filter((p) => Boolean(p.userId)),
    users: users.filter((u) => Boolean(u.userId)),
    teams,
    disputeUpdate: {
      stage: DISPUTE_STAGE.RESOLVED,
      resolution,
      finalGame,
      adminNotes:
        resolution === DISPUTE_RESOLUTION.CANCELLED
          ? (dispute.adminNotes ?? null)
          : note?.trim() || null,
      evidenceDueAt: null,
      resolvedAt: now,
      resolvedBy: actorId,
      events: [...(dispute.events ?? []), event],
    },
  };
};
