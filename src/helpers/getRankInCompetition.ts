import { ScoreboardProfile, TeamStats } from "../types";

interface Placeable {
  numberOfWins?: number;
  totalPointDifference?: number;
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

// Ladder placement order: per-ladder CP (participant competitionXP) first, then
// wins, then point difference. CP is the headline ranking metric on a ladder;
// wins and PD break ties. Used by both the standings display and the ladder
// payout, so the two can never diverge.
export const compareLadderParticipants = (
  a: ScoreboardProfile,
  b: ScoreboardProfile,
): number =>
  (b.competitionXP || 0) - (a.competitionXP || 0) || compareByWinsThenPD(a, b);

export const sortLadderParticipantsByPlacement = (
  participants: ScoreboardProfile[],
): ScoreboardProfile[] => sortByPlacement(participants, compareLadderParticipants);

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
