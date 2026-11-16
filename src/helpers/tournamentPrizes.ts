import { Tournament } from "../types";
import { getKnockoutTopFour } from "./knockoutTopFour";
import {
  sortPlayersByPlacement,
  sortTeamsByPlacement,
} from "./getRankInCompetition";

export const TOURNAMENT_PRIZE_DISTRIBUTION = [0.4, 0.3, 0.2, 0.1] as const;
export const TOURNAMENT_PLACEMENT_KEYS = [
  "first",
  "second",
  "third",
  "fourth",
] as const;

export type TournamentPlacementKey = (typeof TOURNAMENT_PLACEMENT_KEYS)[number];

export interface TournamentPrizeAllocation {
  userId: string;
  prizeXP: number;
  placementKey: TournamentPlacementKey;
  placementIndex: number;
}

// prizeWinners[0] = 1st place, prizeWinners[1] = 2nd, etc. Each entry holds
// 1 userId (singles) or 2 (doubles).
export const getTournamentPrizeWinnerIds = (
  tournament: Tournament,
): string[][] => {
  const isKnockout = tournament.tournamentMode === "Knockout";
  const isDoubles = tournament.tournamentType === "Doubles";

  if (isKnockout) {
    const topFour = getKnockoutTopFour(tournament.fixtures);
    return [
      topFour.first,
      topFour.second,
      topFour.third,
      topFour.fourth,
    ].filter((position): position is string[] => position !== null);
  }

  if (isDoubles) {
    return sortTeamsByPlacement(tournament.tournamentTeams)
      .slice(0, TOURNAMENT_PLACEMENT_KEYS.length)
      .map((team) => team.teamKey.split("-"));
  }

  return sortPlayersByPlacement(tournament.tournamentParticipants)
    .slice(0, TOURNAMENT_PLACEMENT_KEYS.length)
    .map((player) => [player.userId!]);
};

export const buildTournamentPrizeAllocations = (
  prizeWinners: string[][],
  prizePool: number,
  isDoubles: boolean,
): TournamentPrizeAllocation[] =>
  prizeWinners.flatMap((userIds, placementIndex) => {
    const positionPrize = Math.floor(
      prizePool * (TOURNAMENT_PRIZE_DISTRIBUTION[placementIndex] || 0),
    );
    const prizeXP = isDoubles ? Math.floor(positionPrize / 2) : positionPrize;
    return userIds.map((userId) => ({
      userId,
      prizeXP,
      placementKey: TOURNAMENT_PLACEMENT_KEYS[placementIndex],
      placementIndex,
    }));
  });
