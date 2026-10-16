import type { GenderType, LadderType } from "./ladder";

export const LADDER_PRE_REGISTRATION_COLLECTION = "ladder-pre-registration";

export const LADDER_PRE_REGISTRATION_KEY = {
  CASH_MENS_SINGLES: "cash-mens-singles",
  CASH_MENS_DOUBLES: "cash-mens-doubles",
  COMMUNITY_SINGLES: "community-singles",
  COMMUNITY_DOUBLES: "community-doubles",
} as const;

export type LadderPreRegistrationKey =
  (typeof LADDER_PRE_REGISTRATION_KEY)[keyof typeof LADDER_PRE_REGISTRATION_KEY];

export const LADDER_TIER = {
  CASH: "cash",
  COMMUNITY: "community",
} as const;

export type LadderTier = (typeof LADDER_TIER)[keyof typeof LADDER_TIER];

export interface LadderPreRegistrationOption {
  key: LadderPreRegistrationKey;
  name: string;
  tier: LadderTier;
  ladderType: LadderType;
  genderType: GenderType | null;
  entryFee: number;
  currencyType: string;
  maxPlayers: number;
}

export interface LadderPreRegistration {
  userId: string;
  ladderKey: LadderPreRegistrationKey;
  createdAt: Date;
  notifiedAt: Date | null;
  ladderId: string | null;
}
