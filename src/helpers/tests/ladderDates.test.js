import {
  LADDER_PLAYOFF_START_DAYS,
  LADDER_REGISTRATION_CLOSE_DAYS,
  LADDER_SEASON_START_DAYS,
  deriveLadderDates,
} from "../ladderDates";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from, to) => Math.round((to - from) / DAY_MS);

describe("deriveLadderDates", () => {
  const registrationOpensAt = new Date(2026, 1, 15, 9, 0);
  const dates = deriveLadderDates(registrationOpensAt);

  it("starts the season 30 days after registration opens", () => {
    expect(LADDER_SEASON_START_DAYS).toBe(30);
    expect(daysBetween(registrationOpensAt, dates.seasonStartsAt)).toBe(30);
  });

  it("closes registration 30 days after the season starts", () => {
    expect(LADDER_REGISTRATION_CLOSE_DAYS).toBe(60);
    expect(daysBetween(dates.seasonStartsAt, dates.registrationClosesAt)).toBe(
      30,
    );
  });

  it("starts the playoffs 90 days after registration opens", () => {
    expect(LADDER_PLAYOFF_START_DAYS).toBe(90);
    expect(daysBetween(registrationOpensAt, dates.playoffStartsAt)).toBe(90);
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
