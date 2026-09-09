import {
  compareLadderParticipants,
  sortLadderParticipantsByPlacement,
  sortPlayersByPlacement,
} from "../getRankInCompetition";

const participant = (over) => ({
  userId: over.userId,
  competitionXP: 0,
  numberOfWins: 0,
  totalPointDifference: 0,
  ...over,
});

describe("sortLadderParticipantsByPlacement (CP -> Wins -> PD)", () => {
  it("ranks by CP first, above wins and PD", () => {
    const a = participant({ userId: "a", competitionXP: 40, numberOfWins: 1, totalPointDifference: 5 });
    const b = participant({ userId: "b", competitionXP: 100, numberOfWins: 1, totalPointDifference: 1 });
    const sorted = sortLadderParticipantsByPlacement([a, b]);
    expect(sorted.map((p) => p.userId)).toEqual(["b", "a"]);
  });

  it("breaks a CP tie by wins, then by PD", () => {
    const a = participant({ userId: "a", competitionXP: 60, numberOfWins: 2, totalPointDifference: 3 });
    const b = participant({ userId: "b", competitionXP: 60, numberOfWins: 3, totalPointDifference: 1 });
    const c = participant({ userId: "c", competitionXP: 60, numberOfWins: 2, totalPointDifference: 9 });
    const sorted = sortLadderParticipantsByPlacement([a, b, c]);
    expect(sorted.map((p) => p.userId)).toEqual(["b", "c", "a"]);
  });

  it("drops 0-win participants (unranked), even with CP/PD", () => {
    const winner = participant({ userId: "w", competitionXP: 20, numberOfWins: 1 });
    const loser = participant({ userId: "l", competitionXP: 80, numberOfWins: 0, totalPointDifference: 30 });
    const sorted = sortLadderParticipantsByPlacement([winner, loser]);
    expect(sorted.map((p) => p.userId)).toEqual(["w"]);
  });

  it("compareLadderParticipants is a pure comparator (CP desc)", () => {
    const a = participant({ userId: "a", competitionXP: 10 });
    const b = participant({ userId: "b", competitionXP: 30 });
    expect(compareLadderParticipants(a, b)).toBeGreaterThan(0);
    expect(compareLadderParticipants(b, a)).toBeLessThan(0);
  });
});

describe("sortPlayersByPlacement (Wins -> PD, CP ignored)", () => {
  it("ranks by wins then PD, ignoring CP, and drops 0-win players", () => {
    const a = participant({ userId: "a", competitionXP: 999, numberOfWins: 1, totalPointDifference: 2 });
    const b = participant({ userId: "b", competitionXP: 0, numberOfWins: 2, totalPointDifference: -5 });
    const c = participant({ userId: "c", competitionXP: 500, numberOfWins: 0, totalPointDifference: 50 });
    const sorted = sortPlayersByPlacement([a, b, c]);
    expect(sorted.map((p) => p.userId)).toEqual(["b", "a"]);
  });
});
