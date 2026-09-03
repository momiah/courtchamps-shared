import { computeGameXp } from "../computeGameXp";

const base = {
  streakType: "W",
  streakCount: 1,
  combinedWinnerXp: 100,
  combinedLoserXp: 100,
  winnerScore: 21,
  loserScore: 15,
};

describe("computeGameXp", () => {
  it("returns streakXp = 20 and finalXp = 20 for a plain win (no streak, even XP, small margin)", () => {
    const { streakXp, rankXp, demonBonus, finalXp } = computeGameXp(base);
    expect(streakXp).toBe(20);
    expect(rankXp).toBe(0);
    expect(demonBonus).toBe(0);
    expect(finalXp).toBe(20);
  });

  it("scales streakXp by the win-streak multiplier (count 3 → ×3 → 60)", () => {
    expect(computeGameXp({ ...base, streakCount: 3 }).streakXp).toBe(60);
  });

  it("adds a demon bonus equal to streakXp when the winning margin is >= 10", () => {
    const { streakXp, demonBonus, finalXp } = computeGameXp({
      ...base,
      winnerScore: 21,
      loserScore: 5,
    });
    expect(demonBonus).toBe(streakXp);
    expect(finalXp).toBe(streakXp * 2);
  });

  it("produces a negative streakXp for a loss (baseXP -15)", () => {
    const { streakXp, finalXp } = computeGameXp({
      ...base,
      streakType: "L",
      streakCount: -1,
    });
    expect(streakXp).toBe(-15);
    expect(finalXp).toBe(-15);
  });

  it("applies the rank (upset) multiplier when the loser out-ranks the winner", () => {
    // combinedLoser / combinedWinner = 300 / 100 = 3 → rankMultiplier 3
    const { streakXp, rankXp } = computeGameXp({
      ...base,
      combinedWinnerXp: 100,
      combinedLoserXp: 300,
    });
    expect(rankXp).toBe(streakXp * 3);
  });
});
