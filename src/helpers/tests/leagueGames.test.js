import {
  applyLeagueGameResults,
  getGamePlayerIds,
  isLeagueGameApproved,
  isLeagueGamePending,
} from "../leagueGames";
import { profileDetailSchema, scoreboardProfileSchema } from "../../schema";

const clone = (v) => JSON.parse(JSON.stringify(v));
const player = (userId) => ({ userId, displayName: userId, username: userId });
const participant = (userId) => ({ ...clone(scoreboardProfileSchema), ...player(userId) });
const user = (userId, XP = 100) => ({
  userId,
  username: userId,
  profileDetail: { ...clone(profileDetailSchema), XP },
});

const game = (gameId, team1, team2, [s1, s2]) => {
  const team1Wins = s1 > s2;
  return {
    gameId,
    date: "01-11-2026",
    approvalStatus: "approved",
    team1: { player1: player(team1[0]), player2: team1[1] ? player(team1[1]) : null, score: s1 },
    team2: { player1: player(team2[0]), player2: team2[1] ? player(team2[1]) : null, score: s2 },
    result: {
      winner: { team: team1Wins ? "Team 1" : "Team 2", score: Math.max(s1, s2), players: [] },
      loser: { team: team1Wins ? "Team 2" : "Team 1", score: Math.min(s1, s2), players: [] },
    },
  };
};

describe("league game status", () => {
  it("reads pending and approved case-insensitively", () => {
    expect(isLeagueGamePending({ approvalStatus: "Pending" })).toBe(true);
    expect(isLeagueGamePending({ approvalStatus: "approved" })).toBe(false);
    expect(isLeagueGameApproved({ approvalStatus: "Approved" })).toBe(true);
    expect(isLeagueGameApproved(undefined)).toBe(false);
  });

  it("lists every player id in a game", () => {
    expect(getGamePlayerIds(game("g", ["a", "b"], ["c", "d"], [21, 10]))).toEqual(["a", "b", "c", "d"]);
    expect(getGamePlayerIds(game("g", ["a"], ["c"], [21, 10]))).toEqual(["a", "c"]);
  });
});

describe("applyLeagueGameResults", () => {
  it("singles: updates both participants and profiles, writes no teams", async () => {
    const participants = [participant("a"), participant("b"), participant("c")];
    const users = [user("a"), user("b")];
    const before = clone({ participants, users });

    const result = await applyLeagueGameResults({
      games: [game("g1", ["a"], ["b"], [21, 15])],
      participants,
      teams: [],
      users,
      isDoubles: false,
    });

    const a = result.participants.find((p) => p.userId === "a");
    const b = result.participants.find((p) => p.userId === "b");
    expect(a.numberOfWins).toBe(1);
    expect(a.totalPointDifference).toBe(6);
    expect(b.numberOfLosses).toBe(1);
    expect(b.totalPointDifference).toBe(-6);
    expect(result.participants.find((p) => p.userId === "c")).toEqual(before.participants[2]);
    expect(result.teams).toEqual([]);
    expect(result.users.map((u) => u.userId).sort()).toEqual(["a", "b"]);
    expect(result.users.find((u) => u.userId === "a").profileDetail.numberOfWins).toBe(1);
    expect({ participants, users }).toEqual(before);
  });

  it("doubles: creates a team the first time it plays and updates it after", async () => {
    const ids = ["a", "b", "c", "d"];
    const result = await applyLeagueGameResults({
      games: [
        game("g1", ["a", "b"], ["c", "d"], [21, 10]),
        game("g2", ["b", "a"], ["c", "d"], [21, 19]),
      ],
      participants: ids.map(participant),
      teams: [],
      users: ids.map((id) => user(id)),
      isDoubles: true,
    });

    expect(result.teams).toHaveLength(2);
    const winners = result.teams.find((t) => t.teamKey === "a-b");
    const losers = result.teams.find((t) => t.teamKey === "c-d");
    expect(winners.numberOfWins).toBe(2);
    expect(winners.totalPointDifference).toBe(13);
    expect(losers.numberOfLosses).toBe(2);
    expect(result.participants.find((p) => p.userId === "a").numberOfWins).toBe(2);
  });

  it("doubles: keeps teams that did not play", async () => {
    const existing = { teamKey: "e-f", numberOfWins: 3 };
    const ids = ["a", "b", "c", "d"];
    const result = await applyLeagueGameResults({
      games: [game("g1", ["a", "b"], ["c", "d"], [21, 10])],
      participants: ids.map(participant),
      teams: [existing],
      users: [],
      isDoubles: true,
    });
    expect(result.teams.map((t) => t.teamKey)).toEqual(["e-f", "a-b", "c-d"]);
  });

  it("throws for a player who is not a participant", async () => {
    await expect(
      applyLeagueGameResults({
        games: [game("g1", ["a"], ["z"], [21, 10])],
        participants: [participant("a")],
        teams: [],
        users: [],
        isDoubles: false,
      }),
    ).rejects.toThrow("not in the league");
  });

  it("throws for a game with no result", async () => {
    const noResult = { ...game("g1", ["a"], ["b"], [21, 10]), result: null };
    await expect(
      applyLeagueGameResults({
        games: [noResult],
        participants: [participant("a"), participant("b")],
        teams: [],
        users: [],
        isDoubles: false,
      }),
    ).rejects.toThrow("no result");
  });
});
