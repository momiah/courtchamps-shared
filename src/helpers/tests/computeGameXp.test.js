import {
  computeGameXp,
  GAME_XP_BASE,
  RANK_GAP_XP,
  DECISIVE_WIN_MARGIN,
  DECISIVE_WIN_XP_MULTIPLIER,
  getWinStreakXpMultiplier,
  getLossStreakXpMultiplier,
} from "../computeGameXp";

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

  it("doubles the penalty for a loss by a 10+ margin (demon)", () => {
    const { streakXp, demonBonus, finalXp } = computeGameXp({
      ...base,
      streakType: "L",
      streakCount: -1,
      winnerScore: 21,
      loserScore: 5,
    });
    expect(streakXp).toBe(-15);
    expect(demonBonus).toBe(-15);
    expect(finalXp).toBe(-30);
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

describe("game XP constants", () => {
  it("gives each win-streak length its multiplier", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 9].map(getWinStreakXpMultiplier)).toEqual([
      1, 2, 3, 3, 4, 4, 5, 5,
    ]);
  });

  it("gives each losing-streak length its multiplier", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 9].map(getLossStreakXpMultiplier)).toEqual([
      1, 1.5, 2, 2, 2.5, 2.5, 3, 3,
    ]);
  });

  it("costs the losing-streak multiplier on a loss", () => {
    expect(
      computeGameXp({ ...base, streakType: "L", streakCount: -5 }).streakXp,
    ).toBe(GAME_XP_BASE.LOSS * 2.5);
  });

  it("caps the rank-gap bonus at the maximum multiplier", () => {
    const { rankXp } = computeGameXp({
      ...base,
      combinedWinnerXp: 100,
      combinedLoserXp: 1000,
    });
    expect(rankXp).toBe(GAME_XP_BASE.WIN * RANK_GAP_XP.MAX_MULTIPLIER);
  });

  it("gives no rank-gap bonus below the minimum ratio", () => {
    const { rankXp } = computeGameXp({
      ...base,
      combinedWinnerXp: 100,
      combinedLoserXp: 100 * RANK_GAP_XP.MIN_RATIO - 1,
    });
    expect(rankXp).toBe(0);
  });

  it("treats a margin of exactly DECISIVE_WIN_MARGIN as decisive", () => {
    const { streakXp, demonBonus } = computeGameXp({
      ...base,
      winnerScore: 21,
      loserScore: 21 - DECISIVE_WIN_MARGIN,
    });
    expect(demonBonus).toBe(streakXp * (DECISIVE_WIN_XP_MULTIPLIER - 1));
  });
});
