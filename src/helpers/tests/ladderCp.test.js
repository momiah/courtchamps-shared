import { roundLadderCp } from "../ladderCp";
import { compareLadderEntrants } from "../getRankInCompetition";

describe("roundLadderCp", () => {
  it("rounds to two decimals", () => {
    expect(roundLadderCp(0.1 + 0.2)).toBe(0.3);
    expect(roundLadderCp(12.3456)).toBe(12.35);
    expect(roundLadderCp(100)).toBe(100);
  });
});

describe("ladder placement with float CP", () => {
  it("treats 0.1 + 0.2 and 0.3 as a CP tie so wins decide", () => {
    const fiveWins = { competitionXP: 0.3, numberOfWins: 5 };
    const tenWins = { competitionXP: 0.1 + 0.2, numberOfWins: 10 };
    expect(compareLadderEntrants(tenWins, fiveWins)).toBeLessThan(0);
  });
});
