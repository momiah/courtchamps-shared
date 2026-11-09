import type { Court } from "../types/court";
import type { Ladder } from "../types/ladder";
import type { UserProfile } from "../types/player";
import type { LadderPreRegistration } from "../types/ladderPreRegistration";
import {
  distanceInMeters,
  getCourtCoords,
  getLocationReadingProblem,
} from "./ladderArrivals";
import type {
  LadderArrivalReading,
  LocationReadingProblem,
} from "./ladderArrivals";

export const LADDER_ELIGIBILITY_COLLECTION = "ladderEligibility";
export const LADDER_ELIGIBILITY_RADIUS_MILES = 40;
export const LADDER_ELIGIBILITY_MAX_AGE_MS = 5 * 60 * 1000;
export const LADDER_ELIGIBILITY_MAX_ACCURACY_METERS = 5000;

const METERS_PER_MILE = 1609.344;

/**
 * ladderEligibility/{ladderId}_{userId}
 *
 * Written only by the verifyLadderEligibility callable once a fresh device
 * reading puts the user within the ladder's radius of one of its courts. It
 * holds the distance, never the user's coordinates.
 */
export interface LadderEligibility {
  userId: string;
  ladderId: string;
  distanceMiles: number;
  nearestCourtId: string;
  radiusMiles: number;
  verifiedAt: Date;
}

export const getLadderEligibilityId = (ladderId: string, userId: string) =>
  `${ladderId}_${userId}`;

/** Free ladders are limited to players near their courts; paid ladders are not. */
export const requiresLadderLocationCheck = (
  ladder: Pick<Ladder, "entryFee">,
): boolean => !((ladder.entryFee ?? 0) > 0);

export const getLadderEligibilityRadiusMiles = (
  ladder: Pick<Ladder, "eligibilityRadiusMiles">,
): number => {
  const radius = ladder.eligibilityRadiusMiles;
  return typeof radius === "number" && Number.isFinite(radius) && radius > 0
    ? radius
    : LADDER_ELIGIBILITY_RADIUS_MILES;
};

export type LadderEligibilityRejection =
  | "no_courts"
  | LocationReadingProblem
  | "too_far";

export type LadderEligibilityResult =
  | { ok: true; distanceMiles: number; nearestCourtId: string }
  | {
      ok: false;
      reason: LadderEligibilityRejection;
      distanceMiles?: number;
      radiusMiles?: number;
    };

const roundMiles = (meters: number) =>
  Math.round((meters / METERS_PER_MILE) * 10) / 10;

/** Checks a device reading against the nearest of the ladder's courts. */
export const checkLadderEligibilityReading = ({
  reading,
  courts,
  radiusMiles,
  nowMs,
}: {
  reading: LadderArrivalReading;
  courts: Array<Pick<Court, "courtId" | "location">>;
  radiusMiles: number;
  nowMs: number;
}): LadderEligibilityResult => {
  const located = courts.flatMap((court) => {
    const coords = getCourtCoords(court);
    return coords ? [{ courtId: court.courtId, coords }] : [];
  });
  if (located.length === 0) return { ok: false, reason: "no_courts" };
  const problem = getLocationReadingProblem(reading, {
    nowMs,
    maxAgeMs: LADDER_ELIGIBILITY_MAX_AGE_MS,
    maxAccuracyMeters: LADDER_ELIGIBILITY_MAX_ACCURACY_METERS,
  });
  if (problem) return { ok: false, reason: problem };
  const nearest = located
    .map(({ courtId, coords }) => ({
      courtId,
      meters: distanceInMeters(reading, coords),
    }))
    .reduce((best, next) => (next.meters < best.meters ? next : best));
  const distanceMiles = roundMiles(nearest.meters);
  if (nearest.meters > radiusMiles * METERS_PER_MILE) {
    return { ok: false, reason: "too_far", distanceMiles, radiusMiles };
  }
  return { ok: true, distanceMiles, nearestCourtId: nearest.courtId };
};

const formatMiles = (miles: number) =>
  `${miles >= 10 ? Math.round(miles).toLocaleString("en-GB") : miles} mile${miles === 1 ? "" : "s"}`;

/** What the user sees when a ladder's location check turns them away. */
export const getLadderEligibilityMessage = (
  rejection: Extract<LadderEligibilityResult, { ok: false }>,
): string => {
  switch (rejection.reason) {
    case "no_courts":
      return "This ladder's courts have no location on file yet, so we can't check you're nearby. Please try again later.";
    case "mocked":
      return "Your location is coming from a mock-location app. Turn it off and try again.";
    case "stale":
      return "We couldn't get a fresh location. Please try again.";
    case "inaccurate":
      return "We couldn't pin down your location. Turn on precise location and try again.";
    case "too_far": {
      const radius = formatMiles(
        rejection.radiusMiles ?? LADDER_ELIGIBILITY_RADIUS_MILES,
      );
      const away =
        rejection.distanceMiles === undefined
          ? ""
          : ` You're ${formatMiles(rejection.distanceMiles)} from the nearest one.`;
      return `This free ladder is for players within ${radius} of its courts.${away}`;
    }
  }
};

/** The short rule shown on free ladders and their pre-registrations. */
export const getLadderEligibilityRule = (
  ladder: Pick<Ladder, "entryFee" | "eligibilityRadiusMiles">,
): string | null =>
  requiresLadderLocationCheck(ladder)
    ? `To join, you'll need to be within ${formatMiles(getLadderEligibilityRadiusMiles(ladder))} of the ladder's courts.`
    : null;

/** Pre-registration is open to anyone whose profile country is the ladder's. */
export const canPreRegisterForLadder = (
  user: Pick<UserProfile, "location"> | null | undefined,
  preRegistration: Pick<LadderPreRegistration, "countryCode">,
): boolean =>
  !!user?.location?.countryCode &&
  user.location.countryCode === preRegistration.countryCode;
