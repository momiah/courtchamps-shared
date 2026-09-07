import {
  compareLadderParticipants,
  sortLadderParticipantsByPlacement,
  sortPlayersByPlacement,
} from "../getRankInCompetition";

const participant = (over) => ({
  userId: over.userId,
  XP: 0,
  numberOfWins: 0,
  totalPointDifference: 0,
  ...over,
});

describe("sortLadderParticipantsByPlacement (CP -> Wins -> PD)", () => {
  it("ranks by CP first, above wins and PD", () => {
    const a = participant({ userId: "a", XP: 40, numberOfWins: 1, totalPointDifference: 5 });
    const b = participant({ userId: "b", XP: 100, numberOfWins: 1, totalPointDifference: 1 });
    const sorted = sortLadderParticipantsByPlacement([a, b]);
    expect(sorted.map((p) => p.userId)).toEqual(["b", "a"]);
  });

  it("breaks a CP tie by wins, then by PD", () => {
    const a = participant({ userId: "a", XP: 60, numberOfWins: 2, totalPointDifference: 3 });
    const b = participant({ userId: "b", XP: 60, numberOfWins: 3, totalPointDifference: 1 });
    const c = participant({ userId: "c", XP: 60, numberOfWins: 2, totalPointDifference: 9 });
    const sorted = sortLadderParticipantsByPlacement([a, b, c]);
    expect(sorted.map((p) => p.userId)).toEqual(["b", "c", "a"]);
  });

  it("drops 0-win participants (unranked), even with CP/PD", () => {
    const winner = participant({ userId: "w", XP: 20, numberOfWins: 1 });
    const loser = participant({ userId: "l", XP: 80, numberOfWins: 0, totalPointDifference: 30 });
    const sorted = sortLadderParticipantsByPlacement([winner, loser]);
    expect(sorted.map((p) => p.userId)).toEqual(["w"]);
  });

  it("compareLadderParticipants is a pure comparator (CP desc)", () => {
    const a = participant({ userId: "a", XP: 10 });
    const b = participant({ userId: "b", XP: 30 });
    expect(compareLadderParticipants(a, b)).toBeGreaterThan(0);
    expect(compareLadderParticipants(b, a)).toBeLessThan(0);
  });
});

describe("sortPlayersByPlacement (Wins -> PD, CP ignored)", () => {
  it("ranks by wins then PD, ignoring CP, and drops 0-win players", () => {
    const a = participant({ userId: "a", XP: 999, numberOfWins: 1, totalPointDifference: 2 });
    const b = participant({ userId: "b", XP: 0, numberOfWins: 2, totalPointDifference: -5 });
    const c = participant({ userId: "c", XP: 500, numberOfWins: 0, totalPointDifference: 50 });
    const sorted = sortPlayersByPlacement([a, b, c]);
    expect(sorted.map((p) => p.userId)).toEqual(["b", "a"]);
  });
});
