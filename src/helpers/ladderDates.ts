import type { Ladder } from "../types/ladder";

export const LADDER_SEASON_START_DAYS = 30;
export const LADDER_REGISTRATION_CLOSE_DAYS = 60;
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

/** Every ladder date follows from the day registration opens. */
export const deriveLadderDates = (
  registrationOpensAt: Date,
): DerivedLadderDates => ({
  seasonStartsAt: addDays(registrationOpensAt, LADDER_SEASON_START_DAYS),
  registrationClosesAt: addDays(
    registrationOpensAt,
    LADDER_REGISTRATION_CLOSE_DAYS,
  ),
  playoffStartsAt: addDays(registrationOpensAt, LADDER_PLAYOFF_START_DAYS),
});
