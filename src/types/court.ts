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
}

/** Shape accepted when creating a court — the caller-supplied subset. */
export type CourtInput = Pick<Court, "courtName" | "location">;
