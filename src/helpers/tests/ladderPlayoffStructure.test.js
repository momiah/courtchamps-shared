import {
  LADDER_PLAYOFF_STRUCTURE,
  LADDER_PLAYOFF_SIZES,
  PLAYOFF_SPOTS_DIVISOR,
  IN_THE_MONEY_DIVISOR,
  LADDER_MIN_PLAYOFF_SIZE,
  getLadderPlayoffStructure,
  getEffectiveLadderSize,
  getLadderPlayoffStructureForRegistrations,
} from "../ladderPlayoffStructure";

describe("ladder playoff structure", () => {
  describe("LADDER_PLAYOFF_STRUCTURE table", () => {
    it("matches the documented playoff spots / in-the-money by ladder size", () => {
      expect(LADDER_PLAYOFF_STRUCTURE[2048]).toEqual({
        playoffSpots: 128,
        inTheMoney: 64,
      });
      expect(LADDER_PLAYOFF_STRUCTURE[1024]).toEqual({
        playoffSpots: 64,
        inTheMoney: 32,
      });
      expect(LADDER_PLAYOFF_STRUCTURE[512]).toEqual({
        playoffSpots: 32,
        inTheMoney: 16,
      });
      expect(LADDER_PLAYOFF_STRUCTURE[256]).toEqual({
        playoffSpots: 16,
        inTheMoney: 8,
      });
    });

    it("follows the maxPlayers/16 and maxPlayers/32 pattern for every entry", () => {
      Object.entries(LADDER_PLAYOFF_STRUCTURE).forEach(([size, structure]) => {
        const maxPlayers = Number(size);
        expect(structure.playoffSpots).toBe(maxPlayers / PLAYOFF_SPOTS_DIVISOR);
        expect(structure.inTheMoney).toBe(maxPlayers / IN_THE_MONEY_DIVISOR);
      });
    });

    it("always advances more players than it pays out (playoffSpots > inTheMoney)", () => {
      Object.values(LADDER_PLAYOFF_STRUCTURE).forEach((structure) => {
        expect(structure.playoffSpots).toBeGreaterThan(structure.inTheMoney);
      });
    });
  });

  describe("LADDER_PLAYOFF_SIZES", () => {
    it("lists the supported sizes largest first", () => {
      expect(LADDER_PLAYOFF_SIZES).toEqual([2048, 1024, 512, 256]);
    });
  });

  describe("getLadderPlayoffStructure", () => {
    it("returns the canonical table entry for a known ladder size", () => {
      expect(getLadderPlayoffStructure(1024)).toEqual({
        playoffSpots: 64,
        inTheMoney: 32,
      });
      // Same reference as the table so both consumers stay in sync.
      expect(getLadderPlayoffStructure(256)).toBe(LADDER_PLAYOFF_STRUCTURE[256]);
    });

    it("derives the structure from the pattern for an unlisted power-of-two size", () => {
      expect(getLadderPlayoffStructure(128)).toEqual({
        playoffSpots: 8,
        inTheMoney: 4,
      });
    });

    it("floors non-exact divisions", () => {
      expect(getLadderPlayoffStructure(100)).toEqual({
        playoffSpots: 6,
        inTheMoney: 3,
      });
    });

    it("returns zeroes for non-positive or non-finite sizes", () => {
      expect(getLadderPlayoffStructure(0)).toEqual({
        playoffSpots: 0,
        inTheMoney: 0,
      });
      expect(getLadderPlayoffStructure(-256)).toEqual({
        playoffSpots: 0,
        inTheMoney: 0,
      });
      expect(getLadderPlayoffStructure(Number.NaN)).toEqual({
        playoffSpots: 0,
        inTheMoney: 0,
      });
    });
  });

  describe("getEffectiveLadderSize (tiered by actual registrations)", () => {
    it("snaps the registered count down to the nearest defined tier", () => {
      expect(getEffectiveLadderSize(2048)).toBe(2048);
      expect(getEffectiveLadderSize(1024)).toBe(1024);
      expect(getEffectiveLadderSize(512)).toBe(512);
      expect(getEffectiveLadderSize(256)).toBe(256);
      expect(getEffectiveLadderSize(700)).toBe(512);
      expect(getEffectiveLadderSize(511)).toBe(256);
      expect(getEffectiveLadderSize(3000)).toBe(2048);
    });

    it("returns 0 below the minimum playoff size", () => {
      expect(getEffectiveLadderSize(255)).toBe(0);
      expect(getEffectiveLadderSize(LADDER_MIN_PLAYOFF_SIZE - 1)).toBe(0);
      expect(getEffectiveLadderSize(0)).toBe(0);
      expect(getEffectiveLadderSize(-10)).toBe(0);
      expect(getEffectiveLadderSize(Number.NaN)).toBe(0);
    });

    it("never exceeds the ladder's maxPlayers cap", () => {
      // A 512-capacity ladder can never pay out beyond the 512 tier.
      expect(getEffectiveLadderSize(5000, 512)).toBe(512);
      expect(getEffectiveLadderSize(300, 512)).toBe(256);
    });
  });

  describe("getLadderPlayoffStructureForRegistrations", () => {
    it("pays out at the tier the ladder actually reached, not maxPlayers", () => {
      // 2048-capacity ladder, only 512 registered -> 512 tier.
      expect(getLadderPlayoffStructureForRegistrations(512, 2048)).toEqual({
        playoffSpots: 32,
        inTheMoney: 16,
      });
    });

    it("uses the highest reached tier for an in-between count", () => {
      expect(getLadderPlayoffStructureForRegistrations(700, 2048)).toEqual({
        playoffSpots: 32,
        inTheMoney: 16,
      });
    });

    it("distributes nothing when the minimum tier is not reached", () => {
      expect(getLadderPlayoffStructureForRegistrations(200, 2048)).toEqual({
        playoffSpots: 0,
        inTheMoney: 0,
      });
    });

    it("matches the full-tier structure when the ladder fills", () => {
      expect(getLadderPlayoffStructureForRegistrations(2048, 2048)).toEqual(
        LADDER_PLAYOFF_STRUCTURE[2048],
      );
    });
  });
});
