import {
  generateKnockoutBrackets,
  isKnockoutBracketSize,
} from "../knockoutBrackets";

const player = (id) => ({ userId: id, firstName: id, lastName: "", username: id });
const teams = (count) =>
  Array.from({ length: count }, (_, index) => ({
    player1: player(`p${index + 1}`),
    player2: null,
  }));

const sequentialId = (existingGames) => `game-${existingGames.length + 1}`;
const now = new Date("2026-10-06T18:30:00Z");

describe("isKnockoutBracketSize", () => {
  it("accepts powers of two from 2", () => {
    [2, 4, 8, 16, 32, 64, 128].forEach((size) =>
      expect(isKnockoutBracketSize(size)).toBe(true),
    );
  });

  it("rejects everything else", () => {
    [0, 1, 3, 6, 12, 100, -4, 2.5].forEach((size) =>
      expect(isKnockoutBracketSize(size)).toBe(false),
    );
  });
});

describe("generateKnockoutBrackets", () => {
  it("pairs round 1 in the order given and leaves later rounds empty", () => {
    const { fixtures } = generateKnockoutBrackets({
      teams: teams(8),
      createGameId: sequentialId,
      now,
    });

    expect(fixtures.map((round) => round.games.length)).toEqual([4, 2, 2]);
    expect(
      fixtures[0].games.map((game) => [
        game.team1.player1.userId,
        game.team2.player1.userId,
      ]),
    ).toEqual([
      ["p1", "p2"],
      ["p3", "p4"],
      ["p5", "p6"],
      ["p7", "p8"],
    ]);
    expect(fixtures[1].games.every((game) => game.team1.player1 === null)).toBe(
      true,
    );
  });

  it("adds a 3rd-place playoff after the final", () => {
    const { fixtures } = generateKnockoutBrackets({
      teams: teams(4),
      createGameId: sequentialId,
      now,
    });
    const finalRound = fixtures[fixtures.length - 1].games;
    expect(finalRound.map((game) => game.isThirdPlacePlayoff)).toEqual([
      false,
      true,
    ]);
  });

  it("can leave out the 3rd-place playoff", () => {
    const { fixtures, metadata } = generateKnockoutBrackets({
      teams: teams(4),
      createGameId: sequentialId,
      includeThirdPlacePlayoff: false,
      now,
    });
    expect(fixtures[1].games).toHaveLength(1);
    expect(metadata.totalGames).toBe(3);
  });

  it("numbers games and ids in creation order", () => {
    const { fixtures } = generateKnockoutBrackets({
      teams: teams(4),
      createGameId: sequentialId,
      now,
    });
    const games = fixtures.flatMap((round) => round.games);
    expect(games.map((game) => game.gameNumber)).toEqual([1, 2, 3, 4]);
    expect(games.map((game) => game.gameId)).toEqual([
      "game-1",
      "game-2",
      "game-3",
      "game-4",
    ]);
  });

  it("assigns round-1 courts only for tournaments that number them", () => {
    const withCourts = generateKnockoutBrackets({
      teams: teams(8),
      numberOfCourts: 3,
      createGameId: sequentialId,
      now,
    });
    expect(withCourts.fixtures[0].games.map((game) => game.court)).toEqual([
      1, 2, 3, 1,
    ]);

    const withoutCourts = generateKnockoutBrackets({
      teams: teams(8),
      createGameId: sequentialId,
      now,
    });
    expect(
      withoutCourts.fixtures.flatMap((round) => round.games).every(
        (game) => game.court === null,
      ),
    ).toBe(true);
  });

  it("builds a 128-entrant bracket", () => {
    const { fixtures, metadata } = generateKnockoutBrackets({
      teams: teams(128),
      createGameId: sequentialId,
      now,
    });
    expect(fixtures.map((round) => round.games.length)).toEqual([
      64, 32, 16, 8, 4, 2, 2,
    ]);
    expect(metadata).toMatchObject({
      totalRounds: 7,
      totalTeams: 128,
      totalGames: 128,
      firstRoundGames: 64,
    });
  });

  it("stamps shells as scheduled at the given time", () => {
    const { fixtures } = generateKnockoutBrackets({
      teams: teams(2),
      createGameId: sequentialId,
      now,
    });
    expect(fixtures[0].games[0]).toMatchObject({
      approvalStatus: "Scheduled",
      createdAt: now,
      result: null,
      approvers: [],
    });
  });

  it("rejects a size that is not a power of two", () => {
    expect(() =>
      generateKnockoutBrackets({
        teams: teams(6),
        createGameId: sequentialId,
      }),
    ).toThrow("power-of-two");
  });
});
