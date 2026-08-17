import {
  LADDER_PLAYOFF_STRUCTURE,
  LADDER_PLAYOFF_SIZES,
  PLAYOFF_SPOTS_DIVISOR,
  IN_THE_MONEY_DIVISOR,
  getLadderPlayoffStructure,
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
});
