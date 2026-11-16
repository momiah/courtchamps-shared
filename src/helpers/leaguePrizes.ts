import { Game, ScoreboardProfile } from "../types";
import { sortPlayersByPlacement } from "./getRankInCompetition";
import {
  buildTournamentPrizeAllocations,
  TOURNAMENT_PLACEMENT_KEYS,
  TournamentPrizeAllocation,
} from "./tournamentPrizes";
import { isLeagueGameApproved, isLeagueGamePending } from "./leagueGames";

interface LeaguePrizeInput {
  leagueParticipants?: ScoreboardProfile[];
  games?: Game[];
}

// Only approved games count: a pending game has not changed the standings.
export const calculateLeaguePrizePool = (league: LeaguePrizeInput): number => {
  const approvedGames = (league?.games || []).filter(isLeagueGameApproved);
  const numberOfParticipants = league?.leagueParticipants?.length || 1;
  const totalGamePointsWon = approvedGames.reduce(
    (total, game) => total + (game?.result?.winner?.score || 0),
    0,
  );
  return Math.floor(
    (numberOfParticipants * approvedGames.length + totalGamePointsWon) / 2,
  );
};

export const hasPendingLeagueGames = (league: LeaguePrizeInput): boolean =>
  (league?.games || []).some(isLeagueGamePending);

// Leagues pay individual players, singles and doubles alike.
export const getLeaguePrizeWinnerIds = (league: LeaguePrizeInput): string[][] =>
  sortPlayersByPlacement(league?.leagueParticipants || [])
    .slice(0, TOURNAMENT_PLACEMENT_KEYS.length)
    .map((player) => [player.userId!]);

export const buildLeaguePrizeAllocations = (
  league: LeaguePrizeInput,
): TournamentPrizeAllocation[] =>
  buildTournamentPrizeAllocations(
    getLeaguePrizeWinnerIds(league),
    calculateLeaguePrizePool(league),
    false,
  );
