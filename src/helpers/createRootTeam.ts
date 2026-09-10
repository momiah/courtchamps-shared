import { TeamMember, TeamStats } from "../types";
import { normalizeTeamKey } from "./generateInitialTeamStats";

const memberDisplayName = (member: TeamMember): string =>
  [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
  member.username;

// Seed a root `teams/{teamKey}` doc — a reusable doubles team roster with
// zeroed lifetime stats. teamKey is the normalized sorted member userIds, so
// the same pairing always maps to the same team.
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

  // Only set teamName when provided — Firestore rejects `undefined` values.
  const trimmed = teamName?.trim();
  if (trimmed) team.teamName = trimmed;

  return team;
};
