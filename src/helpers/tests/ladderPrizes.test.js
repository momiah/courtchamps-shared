import {
  formatCurrency,
  formatLadderPrizeWon,
  getLadderPlacePrize,
  getLadderTieFinishPlaces,
  getLadderPlayoffPayouts,
  getLadderPlayoffTotalRounds,
  getLadderTiePlacings,
  getPlacementStatKey,
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
    expect(formatCurrency(9999, "GBP")).toBe("£9999");
    expect(formatCurrency(5120, "GBP")).toBe("£5120");
    expect(formatCurrency(10000, "GBP")).toBe("£10,000");
    expect(formatCurrency(40960, "GBP")).toBe("£40,960");
    expect(formatCurrency(1234567.5, "USD")).toBe("$1,234,567.50");
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

const side = (...playerIds) => ({ playerIds });
const tie = (round, slot, fields = {}) => ({
  tieId: fields.isThirdPlacePlayoff ? "third" : `r${round}s${slot}`,
  ladderId: "ladder",
  round,
  slot,
  isThirdPlacePlayoff: false,
  status: "completed",
  outcome: "played",
  winner: "team1",
  ...fields,
});

const fullBracket = () => [
  tie(1, 0, { side1: side("qf1w"), side2: side("qf1l") }),
  tie(1, 1, { side1: side("qf2w"), side2: side("qf2l") }),
  tie(1, 2, { side1: side("qf3w"), side2: side("qf3l") }),
  tie(1, 3, { side1: side("qf4w"), side2: side("qf4l") }),
  tie(2, 0, { side1: side("qf1w"), side2: side("qf2w") }),
  tie(2, 1, { side1: side("qf3w"), side2: side("qf4w") }),
  tie(3, 0, { side1: side("qf1w"), side2: side("qf3w") }),
  tie(3, 0, { isThirdPlacePlayoff: true, side1: side("qf2w"), side2: side("qf4w"), winner: "team2" }),
];

const free128 = { entryFee: 0, participantCount: 128, maxPlayers: 128 };
const paidOf = (payouts) =>
  Object.fromEntries(payouts.flatMap((payout) => payout.playerIds.map((id) => [id, payout.place])));

describe("ladder playoff payouts", () => {
  it("counts rounds without the 3rd-place tie", () => {
    expect(getLadderPlayoffTotalRounds(fullBracket())).toBe(3);
  });

  it("pays the Final, the 3rd-place tie and the Quarter-Final losers, not the Semi-Final losers twice", () => {
    const payouts = getLadderPlayoffPayouts(free128, fullBracket());
    expect(paidOf(payouts)).toEqual({
      qf1w: 1, qf3w: 2, qf4w: 3, qf2w: 4,
      qf1l: 8, qf2l: 8, qf3l: 8, qf4l: 8,
    });
    payouts.forEach((payout) => {
      expect(payout.prize).toEqual(getLadderPlacePrize(free128, payout.place));
    });
    expect(payouts.find((payout) => payout.place === 1).prize).toEqual({ cash: 0, cp: 2240 });
  });

  it("pays both players of a doubles side the side's prize", () => {
    const ties = fullBracket();
    ties[6] = { ...ties[6], side1: side("user", "partner"), side2: side("opponent", "opponentPartner") };
    const payouts = getLadderPlayoffPayouts(free128, ties);
    expect(payouts.find((payout) => payout.place === 1).playerIds).toEqual(["user", "partner"]);
    expect(payouts.find((payout) => payout.place === 2).playerIds).toEqual(["opponent", "opponentPartner"]);
  });

  it("pays nobody for a void Final and only the side through for a one-sided walkover", () => {
    const voidFinal = fullBracket();
    voidFinal[6] = { ...voidFinal[6], winner: null, outcome: "void" };
    expect(getLadderPlayoffPayouts(free128, voidFinal).map((payout) => payout.place)).not.toContain(1);
    expect(getLadderPlayoffPayouts(free128, voidFinal).map((payout) => payout.place)).not.toContain(2);

    const bye = fullBracket();
    bye[6] = { ...bye[6], side2: null, outcome: "walkover" };
    const places = getLadderPlayoffPayouts(free128, bye).map((payout) => payout.place);
    expect(places).toContain(1);
    expect(places).not.toContain(2);
  });

  it("pays a disqualified finalist nothing and pays the inactive one", () => {
    const disqualified = fullBracket();
    disqualified[6] = { ...disqualified[6], outcome: "walkover", walkoverReason: "disqualifiedOpponent" };
    const placings = getLadderTiePlacings(disqualified[6], disqualified);
    expect(placings.find((placing) => placing.place === 2).disqualified).toBe(true);
    expect(paidOf(getLadderPlayoffPayouts(free128, disqualified)).qf3w).toBeUndefined();

    const inactive = fullBracket();
    inactive[6] = { ...inactive[6], outcome: "walkover", walkoverReason: "inactiveOpponent" };
    expect(paidOf(getLadderPlayoffPayouts(free128, inactive)).qf3w).toBe(2);
  });

  it("places nothing for a tie still being played", () => {
    const ties = fullBracket();
    ties[6] = { ...ties[6], status: "scheduled", winner: null };
    expect(getLadderTiePlacings(ties[6], ties)).toEqual([]);
  });

  it("maps the top four places to their stat keys", () => {
    expect([1, 2, 3, 4, 5, 8].map(getPlacementStatKey)).toEqual(["first", "second", "third", "fourth", null, null]);
  });
});
