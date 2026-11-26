import { generateKnockoutBrackets } from "../knockoutBrackets";
import { advanceBrackets } from "../advanceBrackets";

const player = (id) => ({
  userId: id,
  firstName: id,
  lastName: "",
  username: id,
});
const sequentialId = (existingGames) => `game-${existingGames.length + 1}`;

const play = (fixtures, gameId, score1, score2) =>
  fixtures.map((round) => ({
    ...round,
    games: round.games.map((game) => {
      if (game.gameId !== gameId) return game;
      const team1Wins = score1 > score2;
      return {
        ...game,
        team1: { ...game.team1, score: score1 },
        team2: { ...game.team2, score: score2 },
        gamescore: `${score1}-${score2}`,
        approvalStatus: "approved",
        result: {
          winner: {
            team: team1Wins ? "Team 1" : "Team 2",
            players: [],
            score: Math.max(score1, score2),
          },
          loser: {
            team: team1Wins ? "Team 2" : "Team 1",
            players: [],
            score: Math.min(score1, score2),
          },
        },
      };
    }),
  }));

const playRound = (fixtures, roundIndex) => {
  let next = fixtures;
  fixtures[roundIndex].games.forEach((game) => {
    next = advanceBrackets({
      fixtures: play(next, game.gameId, 21, 15),
      numberOfCourts: 2,
    });
  });
  return next;
};

const scoresOf = (fixtures) =>
  fixtures.map((round) =>
    round.games.map((g) => [g.team1.score, g.team2.score]),
  );

describe("advanceBrackets", () => {
  const bracket = () =>
    generateKnockoutBrackets({
      teams: Array.from({ length: 8 }, (_, i) => ({
        player1: player(`p${i + 1}`),
        player2: null,
      })),
      createGameId: sequentialId,
      numberOfCourts: 2,
      now: new Date("2026-11-14T09:00:00Z"),
    }).fixtures;

  it("keeps the scores of games already played in later rounds", () => {
    let fixtures = bracket();
    fixtures = playRound(fixtures, 0);
    fixtures = playRound(fixtures, 1);
    fixtures = playRound(fixtures, 2);

    expect(scoresOf(fixtures)).toEqual([
      [
        [21, 15],
        [21, 15],
        [21, 15],
        [21, 15],
      ],
      [
        [21, 15],
        [21, 15],
      ],
      [
        [21, 15],
        [21, 15],
      ],
    ]);
  });

  it("still fills the next round once the feeders are approved", () => {
    const fixtures = playRound(bracket(), 0);
    expect(
      fixtures[1].games.map((g) => [
        g.team1.player1.userId,
        g.team2.player1.userId,
      ]),
    ).toEqual([
      ["p1", "p3"],
      ["p5", "p7"],
    ]);
  });
});
