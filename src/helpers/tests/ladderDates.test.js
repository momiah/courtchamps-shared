import {
  LADDER_PLAYOFF_START_DAYS,
  LADDER_REGISTRATION_CLOSE_DAYS,
  LADDER_SEASON_EXTENSION_DAYS,
  LADDER_SEASON_START_DAYS,
  deriveExtendedLadderDates,
  deriveLadderDates,
  deriveLadderSeasonDates,
} from "../ladderDates";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from, to) => Math.round((to - from) / DAY_MS);

describe("deriveLadderDates", () => {
  const registrationOpensAt = new Date(2026, 1, 15, 9, 0);
  const dates = deriveLadderDates(registrationOpensAt);

  it("starts the season 14 days after registration opens", () => {
    expect(LADDER_SEASON_START_DAYS).toBe(14);
    expect(daysBetween(registrationOpensAt, dates.seasonStartsAt)).toBe(14);
  });

  it("closes registration 30 days after the season starts", () => {
    expect(LADDER_REGISTRATION_CLOSE_DAYS).toBe(30);
    expect(daysBetween(dates.seasonStartsAt, dates.registrationClosesAt)).toBe(
      30,
    );
  });

  it("starts the playoffs 90 days after the season starts", () => {
    expect(LADDER_PLAYOFF_START_DAYS).toBe(90);
    expect(daysBetween(dates.seasonStartsAt, dates.playoffStartsAt)).toBe(90);
    expect(daysBetween(registrationOpensAt, dates.playoffStartsAt)).toBe(104);
  });

  it("keeps the time of day across clock changes", () => {
    [
      dates.seasonStartsAt,
      dates.registrationClosesAt,
      dates.playoffStartsAt,
    ].forEach((date) => {
      expect(date.getHours()).toBe(9);
      expect(date.getMinutes()).toBe(0);
    });
  });

  it("does not change the date passed in", () => {
    expect(registrationOpensAt).toEqual(new Date(2026, 1, 15, 9, 0));
  });
});

describe("deriveLadderSeasonDates", () => {
  it("returns a copy of the season start", () => {
    const seasonStartsAt = new Date(2026, 2, 1, 9, 0);
    const dates = deriveLadderSeasonDates(seasonStartsAt);
    expect(dates.seasonStartsAt).toEqual(seasonStartsAt);
    expect(dates.seasonStartsAt).not.toBe(seasonStartsAt);
  });
});

describe("deriveExtendedLadderDates", () => {
  it("moves every date back 14 days, keeping a 90 day season", () => {
    const registrationOpensAt = new Date(2026, 1, 15, 9, 0);
    const original = deriveLadderDates(registrationOpensAt);
    const extended = deriveExtendedLadderDates(original.seasonStartsAt);

    expect(LADDER_SEASON_EXTENSION_DAYS).toBe(14);
    expect(daysBetween(original.seasonStartsAt, extended.seasonStartsAt)).toBe(14);
    expect(
      daysBetween(original.registrationClosesAt, extended.registrationClosesAt),
    ).toBe(14);
    expect(daysBetween(original.playoffStartsAt, extended.playoffStartsAt)).toBe(14);
    expect(daysBetween(registrationOpensAt, extended.playoffStartsAt)).toBe(118);
  });
});
