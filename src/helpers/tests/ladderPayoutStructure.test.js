import {
  LADDER_PAYOUT_STRUCTURE,
  getLadderPayouts,
  getLadderPayoutForPlace,
} from "../ladderPayoutStructure";
import { LADDER_PLAYOFF_STRUCTURE } from "../ladderPlayoffStructure";

const rows = (size, pool) =>
  getLadderPayouts(pool, size).map((payout) => [
    payout.fromPlace,
    payout.toPlace,
    payout.places,
    Math.round(payout.total * 100) / 100,
    Math.round(payout.each * 100) / 100,
  ]);

describe("ladder payout structure", () => {
  it.each(Object.keys(LADDER_PAYOUT_STRUCTURE).map(Number))(
    "%i: shares sum to 100%% and pay exactly the in-the-money places",
    (size) => {
      const bands = LADDER_PAYOUT_STRUCTURE[size];
      const totalShare = bands.reduce((sum, band) => sum + band.share, 0);
      expect(totalShare).toBeCloseTo(1, 10);
      expect(bands[bands.length - 1].toPlace).toBe(
        LADDER_PLAYOFF_STRUCTURE[size].inTheMoney,
      );
      bands.slice(1).forEach((band, index) => {
        expect(band.fromPlace).toBe(bands[index].toPlace + 1);
      });
    },
  );

  it("2048 players, £40,960 pot", () => {
    expect(rows(2048, 40960)).toEqual([
      [1, 1, 1, 14352, 14352],
      [2, 2, 1, 8192, 8192],
      [3, 3, 1, 4096, 4096],
      [4, 4, 1, 2048, 2048],
      [5, 32, 28, 8176, 292],
      [33, 64, 32, 4096, 128],
    ]);
  });

  it("1024 players, £20,480 pot", () => {
    expect(rows(1024, 20480)).toEqual([
      [1, 1, 1, 7180, 7180],
      [2, 2, 1, 4096, 4096],
      [3, 3, 1, 2048, 2048],
      [4, 4, 1, 1024, 1024],
      [5, 32, 28, 6132, 219],
    ]);
  });

  it("512 players, £10,240 pot", () => {
    expect(rows(512, 10240)).toEqual([
      [1, 1, 1, 3584, 3584],
      [2, 2, 1, 2048, 2048],
      [3, 3, 1, 1024, 1024],
      [4, 4, 1, 512, 512],
      [5, 16, 12, 3072, 256],
    ]);
  });

  it("256 players, £5,120 pot", () => {
    expect(rows(256, 5120)).toEqual([
      [1, 1, 1, 1793, 1793],
      [2, 2, 1, 1024, 1024],
      [3, 3, 1, 614, 614],
      [4, 4, 1, 409, 409],
      [5, 8, 4, 1280, 320],
    ]);
  });

  it("128 players, £2,560 pot", () => {
    expect(rows(128, 2560)).toEqual([
      [1, 1, 1, 897, 897],
      [2, 2, 1, 512, 512],
      [3, 3, 1, 307, 307],
      [4, 4, 1, 204, 204],
      [5, 8, 4, 640, 160],
    ]);
  });

  it.each([
    [2048, 40960],
    [256, 5120],
    [256, 5137.5],
    [128, 2580],
    [512, 102400],
  ])(
    "%i players, %d pot: whole amounts that add up to the whole pot, leftovers to the champion",
    (size, pool) => {
      const payouts = getLadderPayouts(pool, size);
      payouts.forEach((payout) => expect(Number.isInteger(payout.each)).toBe(true));
      expect(payouts.reduce((sum, payout) => sum + payout.total, 0)).toBe(
        Math.floor(pool),
      );
      const exact = Math.floor(pool) * LADDER_PAYOUT_STRUCTURE[size][0].share;
      expect(payouts[0].each).toBeGreaterThanOrEqual(Math.floor(exact));
    },
  );

  it("returns no payouts for a size without a structure", () => {
    expect(getLadderPayouts(1000, 100)).toEqual([]);
  });

  it("looks up a single place's payout", () => {
    expect(getLadderPayoutForPlace(40960, 2048, 1)).toBe(14352);
    expect(getLadderPayoutForPlace(40960, 2048, 40)).toBe(128);
    expect(getLadderPayoutForPlace(40960, 2048, 65)).toBe(0);
  });
});
