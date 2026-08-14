import {
  calculateLadderPrizePool,
  PLATFORM_FEE,
  LADDER_XP_PER_PLAYER,
} from "../calculateLadderPrizePool";

describe("calculateLadderPrizePool", () => {
  describe("cash pot (paid ladders only)", () => {
    it("PAID: returns collected entry fees less the platform fee", () => {
      // 10 * 8 = 80 collected, minus 10% platform fee => 72
      const { cash } = calculateLadderPrizePool({
        entryFee: 10,
        participantCount: 8,
      });

      expect(cash).toBeCloseTo(72, 5);
      expect(cash).toBeCloseTo(80 * (1 - PLATFORM_FEE), 5);
    });

    it("PAID: matches the worked £20 / 1024-player example", () => {
      // 20 * 1024 * 0.9 = 18,432
      const { cash } = calculateLadderPrizePool({
        entryFee: 20,
        participantCount: 1024,
      });

      expect(cash).toBeCloseTo(18432, 5);
    });

    it("FREE: cash pot is 0", () => {
      const { cash } = calculateLadderPrizePool({
        entryFee: 0,
        participantCount: 6,
      });

      expect(cash).toBe(0);
    });

    it("is 0 when no one has joined a paid ladder", () => {
      const { cash } = calculateLadderPrizePool({
        entryFee: 10,
        participantCount: 0,
      });

      expect(cash).toBe(0);
    });
  });

  describe("XP pot (flat per participant, awarded on every ladder)", () => {
    it("is participantCount * LADDER_XP_PER_PLAYER", () => {
      const { xp } = calculateLadderPrizePool({
        entryFee: 0,
        participantCount: 6,
      });

      expect(xp).toBe(6 * LADDER_XP_PER_PLAYER);
    });

    it("stays bounded on a large ladder (1024 players)", () => {
      const { xp } = calculateLadderPrizePool({
        entryFee: 20,
        participantCount: 1024,
      });

      expect(xp).toBe(1024 * LADDER_XP_PER_PLAYER);
    });

    it("is the same on paid and free ladders of equal size", () => {
      const free = calculateLadderPrizePool({
        entryFee: 0,
        participantCount: 12,
      });
      const paid = calculateLadderPrizePool({
        entryFee: 10,
        participantCount: 12,
      });

      expect(paid.xp).toBe(free.xp);
    });

    it("is 0 when no one has joined", () => {
      const { xp } = calculateLadderPrizePool({
        entryFee: 0,
        participantCount: 0,
      });

      expect(xp).toBe(0);
    });
  });
});
