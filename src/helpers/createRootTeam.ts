import { TeamMember, TeamStats } from "../types";
import { normalizeTeamKey } from "./generateInitialTeamStats";

const memberDisplayName = (member: TeamMember): string =>
  [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
  member.username;

export const createRootTeam = ({
  players,
  createdBy,
  teamName,
}: {
  players: TeamMember[];
  createdBy: string;
  teamName?: string;
}): TeamStats => {
  const playerIds = players.map((player) => player.userId);
  const team: TeamStats = {
    team: players.map(memberDisplayName),
    teamKey: normalizeTeamKey(playerIds),
    players,
    playerIds,
    createdBy,
    createdAt: new Date(),
    numberOfWins: 0,
    numberOfLosses: 0,
    numberOfGamesPlayed: 0,
    resultLog: [],
    matchResultLog: [],
    pointDifferenceLog: [],
    averagePointDifference: 0,
    totalPointDifference: 0,
    currentStreak: 0,
    highestWinStreak: 0,
    highestLossStreak: 0,
    winStreak3: 0,
    winStreak5: 0,
    winStreak7: 0,
    demonWin: 0,
    lossesTo: {},
    rival: null,
    XP: 0,
  };

  const trimmed = teamName?.trim();
  if (trimmed) team.teamName = trimmed;

  return team;
};
