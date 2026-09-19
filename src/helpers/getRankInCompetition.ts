import { ScoreboardProfile, TeamStats } from "../types";

interface Placeable {
  numberOfWins?: number;
  totalPointDifference?: number;
  /**
   * Per-ladder CP. Singles participants store it in competitionXP; doubles teams
   * store it in XP. `ladderCp` reads whichever is present.
   */
  competitionXP?: number;
  XP?: number;
}

// Placement is only for entrants with at least one win; 0-win entrants are
// unranked (no placement / no prize).
const sortByPlacement = <T extends Placeable>(
  entrants: T[],
  compare: (a: T, b: T) => number,
): T[] => [...(entrants || [])].filter((e) => (e.numberOfWins || 0) > 0).sort(compare);

// Wins first, then point difference — the league/tournament order.
const compareByWinsThenPD = (a: Placeable, b: Placeable): number =>
  (b.numberOfWins || 0) - (a.numberOfWins || 0) ||
  (b.totalPointDifference || 0) - (a.totalPointDifference || 0);

// Per-ladder CP wherever it lives: participants use competitionXP, teams use XP.
const ladderCp = (e: Placeable): number => e.competitionXP ?? e.XP ?? 0;

/**
 * The single ladder placement order — per-ladder CP first, then wins, then
 * point difference — applied to singles participants and doubles teams alike.
 * Standings, playoff seeding and prize payouts all rank through this one
 * ordering, so a ladder's leaderboard and its payout can never diverge.
 */
export const compareLadderEntrants = (a: Placeable, b: Placeable): number =>
  ladderCp(b) - ladderCp(a) || compareByWinsThenPD(a, b);

export const sortLadderEntrantsByPlacement = <T extends Placeable>(
  entrants: T[],
): T[] => sortByPlacement(entrants, compareLadderEntrants);

// Typed entry points onto the same ordering. The logic lives in
// compareLadderEntrants / sortLadderEntrantsByPlacement; these just narrow the
// input type for singles participants and doubles teams.
export const compareLadderParticipants = (
  a: ScoreboardProfile,
  b: ScoreboardProfile,
): number => compareLadderEntrants(a, b);

export const sortLadderParticipantsByPlacement = (
  participants: ScoreboardProfile[],
): ScoreboardProfile[] => sortLadderEntrantsByPlacement(participants);

export const sortLadderTeamsByPlacement = (teams: TeamStats[]): TeamStats[] =>
  sortLadderEntrantsByPlacement(teams);

// League/tournament order (wins first, CP ignored) — unchanged.
export const sortPlayersByPlacement = (
  participants: ScoreboardProfile[],
): ScoreboardProfile[] => sortByPlacement(participants, compareByWinsThenPD);

export const sortTeamsByPlacement = (teams: TeamStats[]): TeamStats[] =>
  sortByPlacement(teams, compareByWinsThenPD);

export const getPlayerRankInCompetition = (
  participants: ScoreboardProfile[],
  userId: string,
): number => {
  const sorted = sortPlayersByPlacement(participants);
  const rank =
    sorted.findIndex((participant) => participant.userId === userId) + 1;
  return rank > 0 ? rank : 0;
};

export const getTeamRankInCompetition = (
  teams: TeamStats[],
  userId: string,
): number => {
  const sorted = sortTeamsByPlacement(teams);
  const rank = sorted.findIndex((team) => team.teamKey?.includes(userId)) + 1;
  return rank > 0 ? rank : 0;
};
