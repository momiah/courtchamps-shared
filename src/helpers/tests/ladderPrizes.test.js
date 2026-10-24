import {
  formatCurrency,
  formatLadderPrizeWon,
  getLadderPlacePrize,
  getLadderTieFinishPlaces,
  getLadderPlayoffTotalRounds,
  getLadderTiePlacings,
  getPlacementStatKey,
  ordinalPlace,
  planLadderPlayoffPrizes,
} from "../ladderPrizes";
import { buildLadderPlayoffTies } from "../ladderPlayoffs";
import { advanceLadderPlayoffBracket } from "../ladderPlayoffMatches";

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
const paid128 = { entryFee: 20, participantCount: 128, maxPlayers: 128 };
const plan = (ladder, ties, disqualified) => planLadderPlayoffPrizes(ladder, ties, disqualified);
const byPlayer = (payouts) =>
  Object.fromEntries(payouts.flatMap((payout) => payout.playerIds.map((id) => [id, payout])));
const cpOf = (payouts) =>
  Object.fromEntries(Object.entries(byPlayer(payouts)).map(([id, payout]) => [id, payout.prize.cp]));
const sum = (payouts, key) => payouts.reduce((total, payout) => total + payout.prize[key], 0);

describe("ladder playoff prizes", () => {
  it("counts rounds without the 3rd-place tie", () => {
    expect(getLadderPlayoffTotalRounds(fullBracket())).toBe(3);
  });

  it("pays every place once, with nothing left unclaimed when every tie was played", () => {
    const { payouts, unclaimed, kept } = plan(free128, fullBracket());
    expect(cpOf(payouts)).toEqual({
      qf1w: 2240, qf3w: 1280, qf4w: 768, qf2w: 512,
      qf1l: 400, qf2l: 400, qf3l: 400, qf4l: 400,
    });
    expect(unclaimed).toEqual({ cash: 0, cp: 0 });
    expect(kept).toEqual({ cash: 0, cp: 0 });
    payouts.forEach((payout) => {
      expect(payout.placePrize).toEqual(getLadderPlacePrize(free128, payout.place));
      expect(payout.potShare).toEqual({ cash: 0, cp: 0 });
    });
    expect(sum(payouts, "cp")).toBe(6400);
  });

  it("splits a doubles side's prize equally between both players, 50p included", () => {
    const ties = fullBracket();
    ties[6] = { ...ties[6], side1: side("user", "partner"), side2: side("opponent", "opponentPartner") };
    const champion = byPlayer(plan(paid128, ties).payouts).user;
    expect(champion.prize).toEqual({ cash: 897, cp: 2240 });
    expect(champion.perPlayer.prize).toEqual({ cash: 448.5, cp: 1120 });
    expect(byPlayer(plan(paid128, ties).payouts).opponent.perPlayer.prize).toEqual({ cash: 256, cp: 640 });
  });

  it("places both sides of a void Final joint 2nd and shares the 1st prize equally with everyone else in the money", () => {
    const ties = fullBracket();
    ties[6] = { ...ties[6], winner: null, outcome: "void" };
    const { payouts, unclaimed } = plan(paid128, ties);
    const paid = byPlayer(payouts);
    expect(unclaimed).toEqual({ cash: 385, cp: 960 });
    expect(paid.qf1w).toMatchObject({ place: 2, voided: true, potShare: { cash: 0, cp: 0 }, prize: { cash: 512, cp: 1280 } });
    expect(paid.qf3w).toMatchObject({ place: 2, voided: true, prize: { cash: 512, cp: 1280 } });
    expect(paid.qf4w.prize).toEqual({ cash: 307 + 65, cp: 768 + 160 });
    expect(paid.qf2w.prize).toEqual({ cash: 204 + 64, cp: 512 + 160 });
    expect(paid.qf1l.prize).toEqual({ cash: 160 + 64, cp: 400 + 160 });
    expect(sum(payouts, "cash")).toBe(2560);
    expect(sum(payouts, "cp")).toBe(6400);
  });

  it("places both sides of a void Semi-Final joint 4th and shares the empty 2nd", () => {
    const ties = fullBracket();
    ties[4] = { ...ties[4], winner: null, outcome: "void" };
    ties[6] = { ...ties[6], side1: null, side2: side("qf3w"), winner: "team2", outcome: "walkover" };
    ties[7] = { ...ties[7], side1: null, side2: side("qf4w"), winner: "team2", outcome: "walkover" };
    const { payouts, unclaimed } = plan(free128, ties);
    const paid = byPlayer(payouts);
    expect([paid.qf1w.place, paid.qf2w.place, paid.qf1w.voided]).toEqual([4, 4, true]);
    expect(unclaimed.cp).toBe(768);
    expect(cpOf(payouts)).toEqual({
      qf3w: 2240 + 128, qf4w: 768 + 128, qf1w: 512, qf2w: 512,
      qf1l: 528, qf2l: 528, qf3l: 528, qf4l: 528,
    });
    expect(sum(payouts, "cp")).toBe(6400);
  });

  it("gives the rounding left over to the highest finisher", () => {
    const ties = fullBracket();
    ties[6] = { ...ties[6], side2: null, outcome: "walkover" };
    const { payouts } = plan(free128, ties);
    const paid = byPlayer(payouts);
    expect(paid.qf1w.potShare.cp).toBe(182 + 6);
    expect(paid.qf4w.potShare.cp).toBe(182);
    expect(sum(payouts, "cp")).toBe(6400);
  });

  it("keeps a disqualified side's place and prize for review and leaves it out of the share", () => {
    const ties = fullBracket();
    ties[6] = { ...ties[6], outcome: "walkover", walkoverReason: "disqualifiedOpponent" };
    const finalist = byPlayer(plan(free128, ties).payouts).qf3w;
    expect(finalist).toMatchObject({ place: 2, disqualified: true, prize: { cash: 0, cp: 1280 } });

    const voidFinal = fullBracket();
    voidFinal[6] = { ...voidFinal[6], winner: null, outcome: "void" };
    const paid = byPlayer(plan(free128, voidFinal, ["qf4w"]).payouts);
    expect(paid.qf4w).toMatchObject({ disqualified: true, potShare: { cash: 0, cp: 0 } });
    expect(paid.qf2w.potShare.cp).toBe(192);
  });

  it("pays an inactive loser their place as normal", () => {
    const ties = fullBracket();
    ties[6] = { ...ties[6], outcome: "walkover", walkoverReason: "inactiveOpponent" };
    expect(byPlayer(plan(free128, ties).payouts).qf3w).toMatchObject({ place: 2, disqualified: false });
  });

  it("keeps the unclaimed money when nobody else is in the money", () => {
    const final = tie(1, 0, { side1: side("user"), side2: side("opponent"), winner: null, outcome: "void" });
    const { payouts, unclaimed, kept } = plan(free128, [final]);
    expect(payouts.map((payout) => payout.place)).toEqual([2, 2]);
    expect(unclaimed.cp).toBe(6400 - 2560);
    expect(kept).toEqual(unclaimed);
  });

  it("places nothing for a tie still being played", () => {
    const ties = fullBracket();
    ties[6] = { ...ties[6], status: "scheduled", winner: null, outcome: null };
    expect(getLadderTiePlacings(ties[6], ties)).toEqual([]);
  });

  it("maps the top four places to their stat keys", () => {
    expect([1, 2, 3, 4, 5, 8].map(getPlacementStatKey)).toEqual(["first", "second", "third", "fourth", null, null]);
  });
});

describe("ladder playoff prizes never pay more than the pot", () => {
  const entrant = (key) => ({
    entrantKey: key,
    teamId: null,
    players: [{ userId: key, firstName: key, lastName: "", username: key }],
    competitionXP: 0,
    numberOfWins: 0,
    totalPointDifference: 0,
    globalXp: 0,
    joinedAt: null,
    homeCourt: null,
  });

  const seeded = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const playOut = (spots, random) => {
    const now = new Date("2026-10-01T09:00:00Z");
    let ties = buildLadderPlayoffTies({
      ladderId: "ladder",
      qualifiers: Array.from({ length: spots }, (_, i) => entrant(`p${i}`)),
      createdAt: now,
    });
    for (;;) {
      const open = ties.find((candidate) => candidate.status === "scheduled");
      if (!open) return ties;
      const roll = random();
      const voided = roll < 0.25;
      const changed = advanceLadderPlayoffBracket({
        ties,
        tieId: open.tieId,
        winner: voided ? null : roll < 0.6 ? "team1" : "team2",
        outcome: voided ? "void" : "played",
        now,
      });
      const byId = new Map(ties.map((candidate) => [candidate.tieId, candidate]));
      changed.forEach((candidate) => byId.set(candidate.tieId, candidate));
      ties = [...byId.values()];
    }
  };

  it.each([[128, 8], [256, 16], [512, 32], [1024, 64], [2048, 128]])(
    "a %i ladder with random void ties pays exactly its pot",
    (players, spots) => {
      const ladder = { entryFee: 20, participantCount: players, maxPlayers: players };
      const random = seeded(players);
      for (let run = 0; run < 40; run += 1) {
        const ties = playOut(spots, random);
        const { payouts, kept } = plan(ladder, ties);
        const claimed = payouts.reduce((total, payout) => total + payout.placePrize.cash, 0);
        expect(claimed).toBeLessThanOrEqual(players * 20);
        expect(sum(payouts, "cash") + kept.cash).toBe(players * 20);
        expect(sum(payouts, "cp") + kept.cp).toBe(players * 50);
      }
    },
  );
});
