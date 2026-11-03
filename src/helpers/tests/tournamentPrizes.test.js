import {
  buildTournamentPrizeAllocations,
  getTournamentPrizeWinnerIds,
  TOURNAMENT_PRIZE_DISTRIBUTION,
} from "../tournamentPrizes";

const player = (userId, numberOfWins, totalPointDifference) => ({
  userId,
  numberOfWins,
  totalPointDifference,
});

const team = (teamKey, numberOfWins, totalPointDifference) => ({
  teamKey,
  numberOfWins,
  totalPointDifference,
});

describe("getTournamentPrizeWinnerIds", () => {
  it("round-robin singles: top four by wins then PD, 0-win players unplaced", () => {
    const winners = getTournamentPrizeWinnerIds({
      tournamentMode: "Round Robin",
      tournamentType: "Singles",
      tournamentParticipants: [
        player("c", 1, 4),
        player("a", 3, 10),
        player("e", 0, 20),
        player("b", 1, 6),
        player("d", 1, -2),
      ],
    });
    expect(winners).toEqual([["a"], ["b"], ["c"], ["d"]]);
  });

  it("round-robin doubles: splits the team key into both players", () => {
    const winners = getTournamentPrizeWinnerIds({
      tournamentMode: "Round Robin",
      tournamentType: "Doubles",
      tournamentTeams: [team("p3-p4", 1, 2), team("p1-p2", 2, 5)],
    });
    expect(winners).toEqual([
      ["p1", "p2"],
      ["p3", "p4"],
    ]);
  });
});

describe("buildTournamentPrizeAllocations", () => {
  it("singles: each place gets its share of the pool, floored", () => {
    const allocations = buildTournamentPrizeAllocations(
      [["a"], ["b"], ["c"], ["d"]],
      150,
      false,
    );
    expect(allocations).toEqual(
      ["a", "b", "c", "d"].map((userId, placementIndex) => ({
        userId,
        placementIndex,
        placementKey: ["first", "second", "third", "fourth"][placementIndex],
        prizeXP: Math.floor(150 * TOURNAMENT_PRIZE_DISTRIBUTION[placementIndex]),
      })),
    );
  });

  it("doubles: both players get half the place's share", () => {
    const allocations = buildTournamentPrizeAllocations(
      [["p1", "p2"]],
      900,
      true,
    );
    const half = Math.floor(
      Math.floor(900 * TOURNAMENT_PRIZE_DISTRIBUTION[0]) / 2,
    );
    expect(allocations.map((a) => [a.userId, a.prizeXP])).toEqual([
      ["p1", half],
      ["p2", half],
    ]);
  });

  it("gives nothing past fourth place", () => {
    const allocations = buildTournamentPrizeAllocations(
      [["a"], ["b"], ["c"], ["d"], ["e"]],
      100,
      false,
    );
    expect(allocations.find((a) => a.userId === "e").prizeXP).toBe(0);
  });
});
