import {
  formatLadderPrizePool,
  getFullLadderPrizeTable,
  getLadderEntrantNoun,
  getLadderPreRegistrationJoinPath,
  getLadderPreRegistrationShareUrl,
  isCashLadder,
} from "../ladderPreRegistrationDisplay";

const cash = { entryFee: 20, currencyType: "GBP", maxPlayers: 2048, payoutStructure: "linear" };
const community = { entryFee: 0, currencyType: "GBP", maxPlayers: 2048, payoutStructure: "linear" };

describe("ladder pre-registration display", () => {
  it("formats the full-ladder prize pool in cash or CP", () => {
    expect(formatLadderPrizePool(cash)).toBe("£40,960");
    expect(isCashLadder(community)).toBe(false);
    expect(formatLadderPrizePool(community)).toMatch(/CP$/);
  });

  it("builds a prize table whose bands start with 1st", () => {
    const rows = getFullLadderPrizeTable(cash);
    expect(rows[0]).toMatchObject({ fromPlace: 1, label: "1st" });
    expect(rows[4].label).toBe("Joint 5th");
    expect(rows[rows.length - 1]).toMatchObject({ label: "Joint 65th", cash: 0, cp: 112 });
  });

  it("builds the prize table from the ladder's payout structure", () => {
    const progressive = getFullLadderPrizeTable({ ...cash, payoutStructure: "progressive" });
    expect(progressive[0]).toMatchObject({ label: "1st", cash: 14344 });
    expect(progressive[progressive.length - 1]).toMatchObject({ label: "Joint 33rd", cash: 128 });
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
