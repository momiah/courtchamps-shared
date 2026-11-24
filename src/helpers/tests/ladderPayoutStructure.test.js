import {
  LADDER_CP_PAYOUT_STRUCTURE,
  LADDER_PAYOUT_STRUCTURE,
  getLadderCpPayoutForPlace,
  getLadderCpPayouts,
  getLadderPayouts,
  getLadderPayoutForPlace,
  getLadderPrizeBands,
  getLadderPrizePlaces,
} from "../ladderPayoutStructure";
import { LADDER_PLAYOFF_STRUCTURE } from "../ladderPlayoffStructure";

const rows = (payouts) =>
  payouts.map((payout) => [payout.fromPlace, payout.toPlace, payout.places, payout.total, payout.each]);

const sizes = Object.keys(LADDER_PLAYOFF_STRUCTURE).map(Number);

describe.each([
  ["cash", LADDER_PAYOUT_STRUCTURE, "inTheMoney"],
  ["CP", LADDER_CP_PAYOUT_STRUCTURE, "playoffSpots"],
])("ladder %s payout structure", (_name, structure, lastPlace) => {
  it.each(sizes)("%i: shares sum to 100%%, one band per playoff round below 4th", (size) => {
    const bands = structure[size];
    expect(bands.reduce((sum, band) => sum + band.share, 0)).toBeCloseTo(1, 10);
    expect(bands[bands.length - 1].toPlace).toBe(LADDER_PLAYOFF_STRUCTURE[size][lastPlace]);
    bands.forEach((band, index) => {
      if (index > 0) expect(band.fromPlace).toBe(bands[index - 1].toPlace + 1);
      if (band.fromPlace > 4) {
        expect(band.toPlace).toBe(2 * (band.fromPlace - 1));
      } else {
        expect(band.toPlace).toBe(band.fromPlace);
      }
    });
  });

  it.each(sizes)("%i: no place is paid more than a place above it", (size) => {
    const perPlace = structure[size].map((band) => band.share / (band.toPlace - band.fromPlace + 1));
    perPlace.slice(1).forEach((share, index) => expect(share).toBeLessThanOrEqual(perPlace[index]));
  });
});

describe("ladder payouts", () => {
  it("cash for a £20 entry", () => {
    expect(rows(getLadderPayouts(40960, 2048))).toEqual([
      [1, 1, 1, 10683, 10683],
      [2, 2, 1, 6553, 6553],
      [3, 3, 1, 4096, 4096],
      [4, 4, 1, 2048, 2048],
      [5, 8, 4, 3276, 819],
      [9, 16, 8, 3680, 460],
      [17, 32, 16, 4096, 256],
      [33, 64, 32, 6528, 204],
    ]);
    expect(rows(getLadderPayouts(20480, 1024))).toEqual([
      [1, 1, 1, 5744, 5744],
      [2, 2, 1, 3276, 3276],
      [3, 3, 1, 2048, 2048],
      [4, 4, 1, 1228, 1228],
      [5, 8, 4, 2456, 614],
      [9, 16, 8, 2656, 332],
      [17, 32, 16, 3072, 192],
    ]);
    expect(rows(getLadderPayouts(10240, 512))).toEqual([
      [1, 1, 1, 2868, 2868],
      [2, 2, 1, 1638, 1638],
      [3, 3, 1, 1024, 1024],
      [4, 4, 1, 614, 614],
      [5, 8, 4, 2048, 512],
      [9, 16, 8, 2048, 256],
    ]);
    expect(rows(getLadderPayouts(5120, 256))).toEqual([
      [1, 1, 1, 1541, 1541],
      [2, 2, 1, 921, 921],
      [3, 3, 1, 614, 614],
      [4, 4, 1, 440, 440],
      [5, 8, 4, 1604, 401],
    ]);
    expect(rows(getLadderPayouts(2560, 128))).toEqual([
      [1, 1, 1, 773, 773],
      [2, 2, 1, 460, 460],
      [3, 3, 1, 307, 307],
      [4, 4, 1, 220, 220],
      [5, 8, 4, 800, 200],
    ]);
  });

  it("CP at 25 per entrant", () => {
    expect(rows(getLadderCpPayouts(51200, 2048))).toEqual([
      [1, 1, 1, 7680, 7680],
      [2, 2, 1, 5120, 5120],
      [3, 3, 1, 3584, 3584],
      [4, 4, 1, 2560, 2560],
      [5, 8, 4, 5120, 1280],
      [9, 16, 8, 5120, 640],
      [17, 32, 16, 6656, 416],
      [33, 64, 32, 8192, 256],
      [65, 128, 64, 7168, 112],
    ]);
    expect(rows(getLadderCpPayouts(12800, 512))).toEqual([
      [1, 1, 1, 1920, 1920],
      [2, 2, 1, 1280, 1280],
      [3, 3, 1, 896, 896],
      [4, 4, 1, 640, 640],
      [5, 8, 4, 1792, 448],
      [9, 16, 8, 2304, 288],
      [17, 32, 16, 3968, 248],
    ]);
    expect(rows(getLadderCpPayouts(3200, 128))).toEqual([
      [1, 1, 1, 768, 768],
      [2, 2, 1, 512, 512],
      [3, 3, 1, 384, 384],
      [4, 4, 1, 320, 320],
      [5, 8, 4, 1216, 304],
    ]);
  });

  it.each([
    [2048, 40960],
    [256, 5120],
    [256, 5137.5],
    [128, 2580],
    [512, 102400],
    [1024, 25600],
  ])(
    "%i players, %d pot: whole amounts that add up to the whole pot, leftovers to the champion",
    (size, pool) => {
      [
        [getLadderPayouts(pool, size), LADDER_PAYOUT_STRUCTURE],
        [getLadderCpPayouts(pool, size), LADDER_CP_PAYOUT_STRUCTURE],
      ].forEach(([payouts, structure]) => {
        payouts.forEach((payout) => expect(Number.isInteger(payout.each)).toBe(true));
        expect(payouts.reduce((sum, payout) => sum + payout.total, 0)).toBe(Math.floor(pool));
        expect(payouts[0].each).toBeGreaterThanOrEqual(Math.floor(Math.floor(pool) * structure[size][0].share));
      });
    },
  );

  it("returns no payouts for a size without a structure", () => {
    expect(getLadderPayouts(1000, 100)).toEqual([]);
    expect(getLadderCpPayouts(1000, 100)).toEqual([]);
  });

  it("looks up a single place's payout", () => {
    expect(getLadderPayoutForPlace(40960, 2048, 1)).toBe(10683);
    expect(getLadderPayoutForPlace(40960, 2048, 40)).toBe(204);
    expect(getLadderPayoutForPlace(40960, 2048, 65)).toBe(0);
    expect(getLadderCpPayoutForPlace(51200, 2048, 65)).toBe(112);
    expect(getLadderCpPayoutForPlace(51200, 2048, 129)).toBe(0);
  });

  it("lists every place that wins anything, CP-only places with no cash", () => {
    expect(getLadderPrizeBands({ cash: 10240, xp: 12800 }, 512)).toEqual([
      { fromPlace: 1, toPlace: 1, cash: 2868, cp: 1920 },
      { fromPlace: 2, toPlace: 2, cash: 1638, cp: 1280 },
      { fromPlace: 3, toPlace: 3, cash: 1024, cp: 896 },
      { fromPlace: 4, toPlace: 4, cash: 614, cp: 640 },
      { fromPlace: 5, toPlace: 8, cash: 512, cp: 448 },
      { fromPlace: 9, toPlace: 16, cash: 256, cp: 288 },
      { fromPlace: 17, toPlace: 32, cash: 0, cp: 248 },
    ]);
    expect(getLadderPrizeBands({ cash: 0, xp: 12800 }, 512).every((band) => band.cash === 0)).toBe(true);
  });

  it("counts the places that win cash or CP", () => {
    expect(getLadderPrizePlaces(2048, true)).toBe(64);
    expect(getLadderPrizePlaces(2048, false)).toBe(128);
    expect(getLadderPrizePlaces(128, false)).toBe(8);
  });
});
