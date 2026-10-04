import type { Location } from "./player";
import type { CompetitionType } from "./competition";

/**
 * Geocoded physical location of a single court/venue: the base {@link Location}
 * plus optional map coordinates. Distinct from `CompetitionLocation`, which
 * instead carries `courtName` + `courtId` to reference a competition's venue.
 */
export interface CourtLocation extends Location {
  latitude: number | null;
  longitude: number | null;
}

export const COURT_SUBMISSION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type CourtSubmissionStatus =
  (typeof COURT_SUBMISSION_STATUS)[keyof typeof COURT_SUBMISSION_STATUS];

/**
 * A player's request to add a court to a ladder. The court stays unverified
 * and out of the ladder's `courtIds` until an admin adds coordinates, which
 * approves it and adds it to `ladderId`.
 */
export interface CourtSubmission {
  submittedBy: string;
  submittedByUsername: string;
  ladderId: string;
  ladderName: string;
  submittedAt: Date;
  status: CourtSubmissionStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

/**
 * A single physical court in the `courts` collection — the one shared court
 * shape written by both courtchamps-website and the mobile app.
 */
export interface Court {
  courtId: string;
  courtName: string;
  location: CourtLocation;
  verified: boolean;
  submittedBy: string;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  /**
   * Which product flow created this court. Optional for backwards
   * compatibility with existing court documents. Leagues and tournaments accept
   * unverified courts, but ladders require verification, so this lets
   * ladder-submitted courts be prioritised for admin verification.
   */
  submittedVia?: CompetitionType;
  /** Present when a player submitted this court for a ladder. */
  submission?: CourtSubmission;
}

/** Shape accepted when creating a court — the caller-supplied subset. */
export type CourtInput = Pick<Court, "courtName" | "location">;
