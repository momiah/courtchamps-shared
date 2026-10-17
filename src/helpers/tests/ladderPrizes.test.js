import {
  formatCurrency,
  formatLadderPrizeWon,
  getLadderPlacePrize,
  getLadderTieFinishPlaces,
  ordinalPlace,
} from "../ladderPrizes";

const paid256 = { entryFee: 20, participantCount: 256, maxPlayers: 256 };
const free256 = { entryFee: 0, participantCount: 256, maxPlayers: 256 };

describe("ladder prizes", () => {
  it("pays a place from the whole entry pot and the CP pot by the same bands", () => {
    expect(getLadderPlacePrize(paid256, 1)).toEqual({ cash: 1793, cp: 4480 });
    expect(getLadderPlacePrize(paid256, 8)).toEqual({ cash: 320, cp: 800 });
    expect(getLadderPlacePrize(paid256, 16)).toEqual({ cash: 0, cp: 0 });
    expect(getLadderPlacePrize(free256, 1)).toEqual({ cash: 0, cp: 4480 });
  });

  it("says what was won, and nothing when nothing was", () => {
    expect(formatLadderPrizeWon({ cash: 1793, cp: 4480 }, "GBP")).toBe("£1793 and 4,480 CP");
    expect(formatLadderPrizeWon({ cash: 0, cp: 800 }, "GBP")).toBe("800 CP");
    expect(formatLadderPrizeWon({ cash: 0, cp: 0 }, "GBP")).toBeNull();
    expect(formatCurrency(12.5, "EUR")).toBe("€12.50");
  });

  it("names places", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinalPlace)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd",
    ]);
  });

  it("knows which places a finished tie decides", () => {
    expect(getLadderTieFinishPlaces({ round: 4, isThirdPlacePlayoff: false }, 4)).toEqual({ winner: 1, loser: 2 });
    expect(getLadderTieFinishPlaces({ round: 4, isThirdPlacePlayoff: true }, 4)).toEqual({ winner: 3, loser: 4 });
    expect(getLadderTieFinishPlaces({ round: 2, isThirdPlacePlayoff: false }, 4)).toEqual({ winner: null, loser: 8 });
    expect(getLadderTieFinishPlaces({ round: 1, isThirdPlacePlayoff: false }, 4)).toEqual({ winner: null, loser: 16 });
  });
});
