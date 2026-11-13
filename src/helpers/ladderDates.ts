import type { Ladder } from "../types/ladder";

/** Days from registration opening to the season start. Matches open at the season start. */
export const LADDER_SEASON_START_DAYS = 14;
/** Days the season start moves back, once, when too few have joined. */
export const LADDER_SEASON_EXTENSION_DAYS = 14;
/** Days from the season start to registration closing. */
export const LADDER_REGISTRATION_CLOSE_DAYS = 30;
/** Days from the season start to the playoffs. */
export const LADDER_PLAYOFF_START_DAYS = 90;

export type DerivedLadderDates = Pick<
  Ladder,
  "seasonStartsAt" | "registrationClosesAt" | "playoffStartsAt"
>;

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
};

/** Registration closing and the playoffs follow from the season start. */
export const deriveLadderSeasonDates = (
  seasonStartsAt: Date,
): DerivedLadderDates => ({
  seasonStartsAt: new Date(seasonStartsAt.getTime()),
  registrationClosesAt: addDays(seasonStartsAt, LADDER_REGISTRATION_CLOSE_DAYS),
  playoffStartsAt: addDays(seasonStartsAt, LADDER_PLAYOFF_START_DAYS),
});

/** Every ladder date follows from the day registration opens. */
export const deriveLadderDates = (
  registrationOpensAt: Date,
): DerivedLadderDates =>
  deriveLadderSeasonDates(addDays(registrationOpensAt, LADDER_SEASON_START_DAYS));

/** The ladder's dates once its season start has moved back. */
export const deriveExtendedLadderDates = (
  seasonStartsAt: Date,
): DerivedLadderDates =>
  deriveLadderSeasonDates(addDays(seasonStartsAt, LADDER_SEASON_EXTENSION_DAYS));
