import {
  buildLeaguePrizeAllocations,
  calculateLeaguePrizePool,
  getLeaguePrizeWinnerIds,
  hasPendingLeagueGames,
} from "../leaguePrizes";
import { TOURNAMENT_PRIZE_DISTRIBUTION } from "../tournamentPrizes";

const player = (userId, numberOfWins, totalPointDifference) => ({
  userId,
  numberOfWins,
  totalPointDifference,
});
const game = (approvalStatus, winnerScore) => ({
  approvalStatus,
  result: { winner: { score: winnerScore }, loser: { score: 0 } },
});

describe("calculateLeaguePrizePool", () => {
  it("counts approved games only", () => {
    const league = {
      leagueParticipants: [player("a"), player("b"), player("c"), player("d")],
      games: [game("approved", 21), game("Approved", 21), game("Pending", 21)],
    };
    expect(calculateLeaguePrizePool(league)).toBe(Math.floor((4 * 2 + 42) / 2));
  });

  it("is 0 with no approved games", () => {
    expect(calculateLeaguePrizePool({ leagueParticipants: [player("a")], games: [] })).toBe(0);
  });
});

describe("hasPendingLeagueGames", () => {
  it("is true while a game waits for approval", () => {
    expect(hasPendingLeagueGames({ games: [game("approved", 21), game("Pending", 21)] })).toBe(true);
    expect(hasPendingLeagueGames({ games: [game("approved", 21)] })).toBe(false);
  });
});

describe("league prize winners and allocations", () => {
  const league = {
    leagueParticipants: [
      player("c", 1, 4),
      player("a", 3, 10),
      player("e", 0, 20),
      player("b", 1, 6),
      player("d", 1, -2),
      player("f", 1, -5),
    ],
    games: [game("approved", 21), game("approved", 21)],
  };

  it("top four by wins then point difference; 0-win players unplaced", () => {
    expect(getLeaguePrizeWinnerIds(league)).toEqual([["a"], ["b"], ["c"], ["d"]]);
  });

  it("splits the pool by the shared distribution", () => {
    const pool = calculateLeaguePrizePool(league);
    expect(buildLeaguePrizeAllocations(league)).toEqual(
      ["a", "b", "c", "d"].map((userId, i) => ({
        userId,
        prizeXP: Math.floor(pool * TOURNAMENT_PRIZE_DISTRIBUTION[i]),
        placementKey: ["first", "second", "third", "fourth"][i],
        placementIndex: i,
      })),
    );
  });

  it("no winners without wins", () => {
    expect(buildLeaguePrizeAllocations({ leagueParticipants: [player("a", 0, 0)], games: [] })).toEqual([]);
  });
});
