import { notificationTypes } from "../schema";
import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type {
  Game,
  LadderMatch,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "../types";

import { isLadderMatchPlayFrozen } from "./ladderFreeze";
import {
  hasOpenLadderDispute,
  resolveLadderMatchOutcome,
} from "./ladderMatchResult";
import { canApproveReportedGame } from "./reportedGameApproval";
import { scoreDoublesLadderGame } from "./scoreDoublesLadderGame";
import { scoreSinglesLadderGame } from "./scoreSinglesLadderGame";

const APPROVED_GAME = notificationTypes.RESPONSE.APPROVED_GAME;

export const LADDER_APPROVAL_LIMIT = 1;

export const AUTO_APPROVER = { userId: "system", username: "AutoApproval" };

export type LadderApprovalActor =
  | { kind: "user"; userId: string; username: string }
  | { kind: "auto" };

export type LadderApprovalRejection =
  | "game_not_found"
  | "unavailable"
  | "not_opponent"
  | "ladder_frozen";

export interface PlanLadderGameApprovalInput {
  match: LadderMatch;
  gameId: string;
  actor: LadderApprovalActor;
  ladderStatus: string | null | undefined;
  participants: ScoreboardProfile[];
  users: UserProfile[];
  ladderTeams: TeamStats[];
  now: Date;
}

export type PlanLadderGameApprovalResult =
  | { ok: false; reason: LadderApprovalRejection }
  | {
      ok: true;
      fullyApproved: boolean;
      matchCompleted: boolean;
      nextMatch: LadderMatch;
      matchUpdate: Partial<LadderMatch>;
      participants: ScoreboardProfile[];
      users: UserProfile[];
      teams: TeamStats[];
    };

/**
 * The single ladder approval + scoring path. The app (one user's approval) and
 * the auto-approval job both run through this; callers only read the docs it
 * needs and persist what it returns. Pure: no I/O, no clock, no ids minted.
 */
export const planLadderGameApproval = async ({
  match,
  gameId,
  actor,
  ladderStatus,
  participants,
  users,
  ladderTeams,
  now,
}: PlanLadderGameApprovalInput): Promise<PlanLadderGameApprovalResult> => {
  if (isLadderMatchPlayFrozen(ladderStatus)) {
    return { ok: false, reason: "ladder_frozen" };
  }

  const games = match.games ?? [];
  const index = games.findIndex((g) => g.gameId === gameId);
  if (index === -1) return { ok: false, reason: "game_not_found" };

  const game = games[index];
  if (
    game.approvalStatus === APPROVED_GAME ||
    game.approvalStatus === "disputed" ||
    !game.result
  ) {
    return { ok: false, reason: "unavailable" };
  }

  let updatedGame: Game;
  let fullyApproved: boolean;
  if (actor.kind === "user") {
    if ((game.approvers ?? []).some((a) => a.userId === actor.userId)) {
      return { ok: false, reason: "unavailable" };
    }
    if (!canApproveReportedGame(game, actor.userId)) {
      return { ok: false, reason: "not_opponent" };
    }
    updatedGame = {
      ...game,
      numberOfApprovals: (game.numberOfApprovals ?? 0) + 1,
      approvers: [
        ...(game.approvers ?? []),
        { userId: actor.userId, username: actor.username },
      ],
    };
    fullyApproved = updatedGame.numberOfApprovals >= LADDER_APPROVAL_LIMIT;
  } else {
    updatedGame = {
      ...game,
      approvers: [...(game.approvers ?? []), AUTO_APPROVER],
      autoApproved: true,
      autoApprovedAt: now,
    };
    fullyApproved = true;
  }

  if (fullyApproved) updatedGame.approvalStatus = APPROVED_GAME;

  const nextGames = [...games];
  nextGames[index] = updatedGame;

  const matchUpdate: Partial<LadderMatch> = {
    games: nextGames,
    lastUpdated: now,
  };

  if (!fullyApproved) {
    return {
      ok: true,
      fullyApproved,
      matchCompleted: false,
      nextMatch: { ...match, ...matchUpdate },
      matchUpdate,
      participants: [],
      users: [],
      teams: [],
    };
  }

  const alreadyCompleted = match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;
  const outcome = resolveLadderMatchOutcome(
    nextGames,
    match.bestOf ?? nextGames.length,
  );
  const matchDecided =
    !alreadyCompleted &&
    outcome.decided &&
    !!outcome.winnerTeam &&
    !hasOpenLadderDispute(nextGames);

  let matchCompleted = false;
  let scoredParticipants: ScoreboardProfile[];
  let scoredTeams: TeamStats[] = [];

  if ((match.teams?.length ?? 0) >= 2) {
    const scored = await scoreDoublesLadderGame({
      game: updatedGame,
      participants,
      users,
      ladderTeams,
      matchDecided,
      matchWinnerSide: outcome.winnerTeam,
    });
    scoredParticipants = scored.scoringParticipants;
    scoredTeams = scored.teams;
    matchCompleted = scored.matchCompleted;
  } else {
    const scored = scoreSinglesLadderGame({
      game: updatedGame,
      participants,
      users,
      matchDecided,
      matchWinnerSide: outcome.winnerTeam,
    });
    scoredParticipants = scored.participants;
    matchCompleted = scored.matchCompleted;
  }

  if (matchCompleted) {
    matchUpdate.matchStatus = LADDER_MATCH_STATUS.COMPLETED;
    matchUpdate.completedAt = now;
  }

  return {
    ok: true,
    fullyApproved,
    matchCompleted,
    nextMatch: { ...match, ...matchUpdate },
    matchUpdate,
    participants: scoredParticipants,
    users,
    teams: scoredTeams,
  };
};
