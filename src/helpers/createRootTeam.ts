import { TeamMember, TeamStats, TeamStatus } from "../types";
import { normalizeTeamKey } from "./generateInitialTeamStats";

const memberDisplayName = (member: TeamMember): string =>
  [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
  member.username;

export const createRootTeam = ({
  players,
  createdBy,
  teamId,
  teamName,
  teamProfilePic,
  status,
}: {
  players: TeamMember[];
  createdBy: string;
  teamId?: string;
  teamName?: string;
  teamProfilePic?: string;
  status?: TeamStatus;
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
    prevGameXP: 0,
  };

  if (teamId) team.teamId = teamId;
  const trimmed = teamName?.trim();
  if (trimmed) team.teamName = trimmed;
  const trimmedPic = teamProfilePic?.trim();
  if (trimmedPic) team.teamProfilePic = trimmedPic;
  if (status) team.status = status;

  return team;
};
