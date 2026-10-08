import { DISPUTE_ACTIVE_STAGES } from "../types";
import type { Dispute, Game } from "../types";

export const getReporterSideIds = (game: Game | null | undefined): string[] => {
  const reporter = game?.reporter;
  if (!game || !reporter) return [];
  const sides = [game.team1, game.team2];
  const side = sides.find(
    (team) =>
      team?.player1?.userId === reporter || team?.player2?.userId === reporter,
  );
  return [side?.player1?.userId, side?.player2?.userId].filter(
    (id): id is string => Boolean(id),
  );
};

export const canApproveDisputedScore = (
  dispute: Pick<Dispute, "originalGame" | "openedBy" | "stage">,
  userId: string | undefined,
): boolean =>
  !!userId &&
  dispute.openedBy !== userId &&
  DISPUTE_ACTIVE_STAGES.includes(dispute.stage) &&
  getReporterSideIds(dispute.originalGame).includes(userId);

const gamePlayerIds = (game: Game): string[] =>
  [
    game.team1?.player1?.userId,
    game.team1?.player2?.userId,
    game.team2?.player1?.userId,
    game.team2?.player2?.userId,
  ].filter((id): id is string => Boolean(id));

export const canApproveReportedGame = (
  game: Game | null | undefined,
  userId: string | undefined,
): boolean =>
  !!game &&
  !!userId &&
  gamePlayerIds(game).includes(userId) &&
  !getReporterSideIds(game).includes(userId);

export const getEffectiveApprovalLimit = (
  game: Game,
  configuredLimit: number | undefined,
): number => {
  const isSingles =
    !game.team1?.player2?.userId && !game.team2?.player2?.userId;
  return isSingles ? 1 : configuredLimit || 1;
};
