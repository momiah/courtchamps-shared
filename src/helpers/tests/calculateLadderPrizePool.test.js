import {
  calculateLadderPrizePool,
  PLATFORM_FEE,
} from "../calculateLadderPrizePool";

describe("calculateLadderPrizePool", () => {
  describe("PAID ladder (entryFee > 0)", () => {
    it("returns collected entry fees less the platform fee", () => {
      // 10 * 8 = 80 collected, minus 10% platform fee => 72
      const pot = calculateLadderPrizePool({
        entryFee: 10,
        participantCount: 8,
      });

      expect(pot).toBeCloseTo(72, 5);
    });

    it("ignores the free-ladder game inputs when paid", () => {
      const pot = calculateLadderPrizePool({
        entryFee: 5,
        participantCount: 4,
        numberOfGamesPlayed: 100,
        totalGamePointsWon: 9999,
      });

      // 5 * 4 * (1 - 0.10) = 18
      expect(pot).toBeCloseTo(20 * (1 - PLATFORM_FEE), 5);
      expect(pot).toBeCloseTo(18, 5);
    });

    it("is zero when no one has joined a paid ladder", () => {
      expect(
        calculateLadderPrizePool({ entryFee: 10, participantCount: 0 })
      ).toBe(0);
    });
  });

  describe("FREE ladder (entryFee === 0)", () => {
    it("uses the league formula (participants * games + points) / 2", () => {
      // (6 * 10 + 40) / 2 = 50
      const pot = calculateLadderPrizePool({
        entryFee: 0,
        participantCount: 6,
        numberOfGamesPlayed: 10,
        totalGamePointsWon: 40,
      });

      expect(pot).toBe(50);
    });

    it("defaults missing game inputs to 0", () => {
      expect(
        calculateLadderPrizePool({ entryFee: 0, participantCount: 6 })
      ).toBe(0);
    });
  });
});
