import {
  LADDER_TERMS,
  TERMS_OF_USE,
  TERMS_VERSION_LINE,
  getLadderPayoutTable,
  getLadderPlayoffPlacesTable,
  getLadderRules,
  getLegalSectionText,
  getPlatformFeeFootnote,
  isLegalTable,
} from "..";
import { LADDER_PAYOUT_TABLES } from "../../helpers/ladderPayoutStructure";
import { LADDER_PLAYOFF_STRUCTURE } from "../../helpers/ladderPlayoffStructure";

const MAX_CHARS = 240;

const documents = {
  "terms of use": TERMS_OF_USE,
  "ladder terms": LADDER_TERMS,
  "player rules": getLadderRules("player"),
  "team rules": getLadderRules("team"),
};

const sections = Object.entries(documents).flatMap(([name, list]) =>
  list.map((section) => [`${name}: ${section.title}`, section]),
);

describe("legal text is easy to read", () => {
  it.each(sections)("%s has no large chunk of text", (_title, section) => {
    getLegalSectionText(section.body).forEach((text) => {
      expect(text.length).toBeLessThanOrEqual(MAX_CHARS);
    });
  });

  it.each(sections)(
    "%s splits into more than one paragraph or point unless it is short",
    (_title, section) => {
      const text = getLegalSectionText(section.body);
      if (text.join(" ").length > 140) expect(text.length).toBeGreaterThan(1);
    },
  );

  it.each(Object.entries(documents))("%s has unique section ids", (_name, list) => {
    const ids = list.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("ladder rules", () => {
  const rules = getLadderRules("player");
  const text = (id) =>
    getLegalSectionText(rules.find((section) => section.id === id).body).join(" ");

  it("states the playoff timings from shared rather than numbers of its own", () => {
    const playoff = ["playoff-matches", "arranging-and-answering"].map(text).join(" ");
    expect(playoff).toMatch(/within \d+ days/);
    expect(playoff).toMatch(/within \d+ hours, the match is accepted for them/);
    expect(playoff).toMatch(/within \d+ hours of the tie starting/);
  });

  it("explains CP from the scoring constants", () => {
    const standings = text("how-the-standings-work");
    expect(standings).toContain("A win earns 20 CP and a loss costs 15 CP");
    expect(standings).toContain("×2 for 2 wins in a row, ×3 for 3, ×4 for 5 and ×5 for 7 or more");
    expect(standings).toContain("×1.5 for 2 losses in a row, ×2 for 3, ×2.5 for 5 and ×3 for 7 or more");
    expect(standings).toContain("at least twice your CP");
    expect(standings).toContain("up to three times");
    expect(standings).toContain("by 10 or more points doubles that game's CP");
  });

  it("refunds a cancelled ladder's platform fee too", () => {
    expect(text("registration")).toContain(
      "refunded in full, including the 10% platform fee",
    );
  });

  it("says team for a doubles ladder", () => {
    const standings = getLegalSectionText(
      getLadderRules("team").find((section) => section.id === "how-the-standings-work").body,
    ).join(" ");
    expect(standings).toContain("if the team you beat");
  });
});

describe("getLadderPlayoffPlacesTable", () => {
  it("lists every ladder size from LADDER_PLAYOFF_STRUCTURE", () => {
    expect(getLadderPlayoffPlacesTable().rows).toEqual([
      ["128–255", "Top 8", "Top 8"],
      ["256–511", "Top 16", "Top 8"],
      ["512–1,023", "Top 32", "Top 16"],
      ["1,024–2,047", "Top 64", "Top 32"],
      ["2,048 or more", "Top 128", "Top 64"],
    ]);
    expect(getLadderPlayoffPlacesTable().rows).toHaveLength(
      Object.keys(LADDER_PLAYOFF_STRUCTURE).length,
    );
  });
});

describe("getLadderPayoutTable", () => {
  it("merges sizes that pay the same and shows the linear shares", () => {
    const table = getLadderPayoutTable("linear");
    expect(table.columns).toEqual(["Place", "128–511", "512–1,023", "1,024–2,047", "2,048+"]);
    expect(table.rows).toEqual([
      ["1st", "30%", "28%", "28%", "26%"],
      ["2nd", "18%", "16%", "16%", "16%"],
      ["3rd", "12%", "10%", "10%", "10%"],
      ["4th", "8.6%", "6%", "6%", "5%"],
      ["5th–8th (shared)", "31.4%", "20%", "12%", "8%"],
      ["9th–16th (shared)", "–", "20%", "13%", "9%"],
      ["17th–32nd (shared)", "–", "–", "15%", "10%"],
      ["33rd–64th (shared)", "–", "–", "–", "16%"],
    ]);
  });

  it("shows the progressive shares", () => {
    expect(getLadderPayoutTable("progressive").rows[0]).toEqual([
      "1st",
      "35%",
      "35%",
      "35%",
      "35%",
    ]);
  });

  it.each(["linear", "progressive"])("%s columns each add up to the whole pot", (structure) => {
    const cash = LADDER_PAYOUT_TABLES[structure].cash;
    Object.values(cash).forEach((bands) => {
      const total = bands.reduce((sum, band) => sum + band.share, 0);
      expect(total).toBeCloseTo(1, 6);
    });
  });

  it("is in the ladder terms", () => {
    const prizes = LADDER_TERMS.find((section) => section.id === "prizes");
    expect(prizes.body.filter(isLegalTable).map((table) => table.id)).toEqual([
      "ladder-payouts-linear",
      "ladder-payouts-progressive",
    ]);
  });
});

describe("ladder terms", () => {
  it("numbers its sections in order", () => {
    expect(LADDER_TERMS[0].title).toBe("1. Who we are");
    LADDER_TERMS.forEach((section, index) => {
      expect(section.title.startsWith(`${index + 1}. `)).toBe(true);
    });
  });

  it("refunds a cancelled ladder's entry fee and platform fee", () => {
    const refunds = getLegalSectionText(
      LADDER_TERMS.find((section) => section.id === "refunds").body,
    ).join(" ");
    expect(refunds).toContain("at least 128 players or teams to start");
    expect(refunds).toContain(
      "every entry is refunded in full, including the 10% platform fee",
    );
  });
});

describe("disclaimers", () => {
  it("formats the platform fee footnote", () => {
    expect(getPlatformFeeFootnote(20, "GBP")).toBe(
      "*A £2 platform fee is added on top of the £20 entry. The full entry fee goes into the prize pool.",
    );
  });

  it("states the version and effective date", () => {
    expect(TERMS_VERSION_LINE).toBe("Version 1.0.0, effective 27 November 2026");
  });
});
