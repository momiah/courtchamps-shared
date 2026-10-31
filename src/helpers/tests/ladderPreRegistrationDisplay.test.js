import {
  formatLadderPrizePool,
  getFullLadderPrizeTable,
  getLadderEntrantNoun,
  getLadderPreRegistrationJoinPath,
  getLadderPreRegistrationShareUrl,
  isCashLadder,
} from "../ladderPreRegistrationDisplay";

const cash = { entryFee: 20, currencyType: "GBP", maxPlayers: 2048 };
const community = { entryFee: 0, currencyType: "GBP", maxPlayers: 2048 };

describe("ladder pre-registration display", () => {
  it("formats the full-ladder prize pool in cash or CP", () => {
    expect(formatLadderPrizePool(cash)).toBe("£40,960");
    expect(isCashLadder(community)).toBe(false);
    expect(formatLadderPrizePool(community)).toMatch(/CP$/);
  });

  it("builds a prize table whose bands start with 1st", () => {
    const rows = getFullLadderPrizeTable(cash);
    expect(rows[0]).toMatchObject({ fromPlace: 1, label: "1st" });
    expect(rows[rows.length - 1].label).toBe("33rd–64th");
  });

  it("names doubles entrants teams", () => {
    expect(getLadderEntrantNoun("Doubles")).toBe("team");
    expect(getLadderEntrantNoun("Singles")).toBe("player");
  });

  it("builds the share and join links", () => {
    expect(getLadderPreRegistrationShareUrl("abc")).toBe(
      "https://courtchamps.com/preview/ladder-pre-registration/abc",
    );
    expect(getLadderPreRegistrationJoinPath("abc")).toBe(
      "/join/ladder-pre-registration/abc",
    );
  });
});
