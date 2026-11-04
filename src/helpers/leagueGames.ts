import { Game, ScoreboardProfile, TeamStats, UserProfile } from "../types";
import { notificationTypes } from "../schema";
import { calculatePlayerPerformance } from "./calculatePlayerPerformance";
import { calculateTeamPerformance } from "./calculateTeamPerformance";

export const LEAGUE_AUTO_APPROVE_HOURS = 24;

const statusOf = (game: Pick<Game, "approvalStatus"> | undefined) =>
  (game?.approvalStatus || "").toLowerCase();

export const isLeagueGamePending = (
  game: Pick<Game, "approvalStatus"> | undefined,
): boolean => statusOf(game) === "pending";

export const isLeagueGameApproved = (
  game: Pick<Game, "approvalStatus"> | undefined,
): boolean => statusOf(game) === notificationTypes.RESPONSE.APPROVED_GAME;

export const getGamePlayerIds = (game: Game): string[] =>
  [
    game.team1?.player1?.userId,
    game.team1?.player2?.userId,
    game.team2?.player1?.userId,
    game.team2?.player2?.userId,
  ].filter((id): id is string => !!id);

const teamIds = (team: Game["team1"] | undefined): string[] =>
  [team?.player1?.userId, team?.player2?.userId].filter(
    (id): id is string => !!id,
  );

// The players on the other team from userId; empty when userId is not playing.
export const getGameOpponentIds = (game: Game, userId: string): string[] => {
  if (teamIds(game.team1).includes(userId)) return teamIds(game.team2);
  if (teamIds(game.team2).includes(userId)) return teamIds(game.team1);
  return [];
};

// Only the reporter's opponents approve or decline a reported game.
export const canRespondToGame = (game: Game, userId: string): boolean =>
  !!game.reporter && getGameOpponentIds(game, game.reporter).includes(userId);

export interface LeagueGameResultsInput {
  games: Game[];
  participants: ScoreboardProfile[];
  teams: TeamStats[];
  users: UserProfile[];
  isDoubles: boolean;
}

export interface LeagueGameResults {
  participants: ScoreboardProfile[];
  teams: TeamStats[];
  users: UserProfile[];
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null));

const upsertTeam = (teams: TeamStats[], team: TeamStats): TeamStats[] =>
  teams.some((t) => t.teamKey === team.teamKey)
    ? teams.map((t) => (t.teamKey === team.teamKey ? team : t))
    : [...teams, team];

// Applies approved league games in order to the participants, the doubles
// teams (a team is created the first time it plays) and the players' global
// profiles. The inputs are not mutated. Throws when a game has no result or a
// player who is not a participant, so a caller never half-applies a game.
export const applyLeagueGameResults = async ({
  games,
  participants,
  teams,
  users,
  isDoubles,
}: LeagueGameResultsInput): Promise<LeagueGameResults> => {
  let latestParticipants: ScoreboardProfile[] = clone(participants) || [];
  let latestTeams: TeamStats[] = clone(teams) || [];
  const usersById = new Map<string, UserProfile>(
    (clone(users) || []).map((u: UserProfile) => [u.userId, u]),
  );
  const changedUserIds = new Set<string>();

  for (const game of games) {
    if (!game.result?.winner || !game.result?.loser) {
      throw new Error(`Game ${game.gameId} has no result`);
    }
    const playerIds = getGamePlayerIds(game);
    const gameParticipants = latestParticipants.filter((p) =>
      playerIds.includes(p.userId!),
    );
    if (gameParticipants.length !== playerIds.length) {
      throw new Error(
        `Game ${game.gameId} has a player who is not in the league`,
      );
    }
    const gameUsers = playerIds
      .map((id) => usersById.get(id))
      .filter((u): u is UserProfile => !!u);

    const { playersToUpdate, usersToUpdate } = calculatePlayerPerformance(
      game,
      gameParticipants,
      gameUsers,
    );

    const updatedById = new Map(playersToUpdate.map((p) => [p.userId!, p]));
    latestParticipants = latestParticipants.map(
      (p) => updatedById.get(p.userId!) ?? p,
    );
    usersToUpdate.forEach((user) => {
      usersById.set(user.userId, user);
      changedUserIds.add(user.userId);
    });

    if (isDoubles) {
      const [winnerTeam, loserTeam] = await calculateTeamPerformance({
        game,
        allTeams: latestTeams,
      });
      latestTeams = upsertTeam(upsertTeam(latestTeams, winnerTeam), loserTeam);
    }
  }

  return {
    participants: latestParticipants,
    teams: latestTeams,
    users: [...changedUserIds].map((id) => usersById.get(id)!),
  };
};
