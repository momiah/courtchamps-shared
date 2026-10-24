import type { Ladder } from "./ladder";

export const LADDER_PRE_REGISTRATIONS_COLLECTION = "ladderPreRegistrations";
export const LADDER_PRE_REGISTRANTS_SUBCOLLECTION = "registrants";

export const LADDER_PRE_REGISTRATION_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  LAUNCHED: "launched",
} as const;

export type LadderPreRegistrationStatus =
  (typeof LADDER_PRE_REGISTRATION_STATUS)[keyof typeof LADDER_PRE_REGISTRATION_STATUS];

/** The ladder details a pre-registration advertises, copied into the ladder when it is created. */
export type LadderPreRegistrationDetails = Pick<
  Ladder,
  | "name"
  | "description"
  | "image"
  | "region"
  | "countryCode"
  | "ladderType"
  | "genderType"
  | "entryFee"
  | "currencyType"
  | "maxPlayers"
>;

/** ladderPreRegistrations/{preRegistrationId} */
export interface LadderPreRegistration extends LadderPreRegistrationDetails {
  preRegistrationId: string;
  status: LadderPreRegistrationStatus;
  expectedOpensAt: Date | null;
  ladderId: string | null;
  notifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

/** ladderPreRegistrations/{preRegistrationId}/registrants/{userId} */
export interface LadderPreRegistrant {
  userId: string;
  email: string;
  createdAt: Date;
  notifiedAt: Date | null;
}
