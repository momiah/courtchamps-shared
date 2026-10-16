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
      [1, 1, 1, 14336, 14336],
      [2, 2, 1, 8192, 8192],
      [3, 3, 1, 4096, 4096],
      [4, 4, 1, 2048, 2048],
      [5, 32, 28, 8192, 292.57],
      [33, 64, 32, 4096, 128],
    ]);
  });

  it("1024 players, £20,480 pot", () => {
    expect(rows(1024, 20480)).toEqual([
      [1, 1, 1, 7168, 7168],
      [2, 2, 1, 4096, 4096],
      [3, 3, 1, 2048, 2048],
      [4, 4, 1, 1024, 1024],
      [5, 32, 28, 6144, 219.43],
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
      [1, 1, 1, 1792, 1792],
      [2, 2, 1, 1024, 1024],
      [3, 3, 1, 614.4, 614.4],
      [4, 4, 1, 409.6, 409.6],
      [5, 8, 4, 1280, 320],
    ]);
  });

  it("128 players, £2,560 pot", () => {
    expect(rows(128, 2560)).toEqual([
      [1, 1, 1, 896, 896],
      [2, 2, 1, 512, 512],
      [3, 3, 1, 307.2, 307.2],
      [4, 4, 1, 204.8, 204.8],
      [5, 8, 4, 640, 160],
    ]);
  });

  it("returns no payouts for a size without a structure", () => {
    expect(getLadderPayouts(1000, 100)).toEqual([]);
  });

  it("looks up a single place's payout", () => {
    expect(getLadderPayoutForPlace(40960, 2048, 1)).toBe(14336);
    expect(getLadderPayoutForPlace(40960, 2048, 40)).toBe(128);
    expect(getLadderPayoutForPlace(40960, 2048, 65)).toBe(0);
  });
});
