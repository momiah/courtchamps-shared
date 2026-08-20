export const LADDER_STATUS = {
  REGISTRATION_OPEN: "registrationOpen",
  REGISTRATION_CLOSED: "registrationClosed",
  PLAYOFFS: "playoffs",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type LadderStatus = (typeof LADDER_STATUS)[keyof typeof LADDER_STATUS];

export const LADDER_TYPE = {
  SINGLES: "Singles",
  DOUBLES: "Doubles",
} as const;

export type LadderType = (typeof LADDER_TYPE)[keyof typeof LADDER_TYPE];

export const GENDER_TYPE = {
  MENS: "Mens",
  WOMENS: "Womens",
  MIXED: "Mixed",
} as const;

export type GenderType = (typeof GENDER_TYPE)[keyof typeof GENDER_TYPE];

export interface Ladder {
  ladderId: string;
  name: string;
  description: string;
  image: string;
  region: string;
  countryCode: string;
  ladderType: LadderType;
  genderType: GenderType;
  courtIds: string[];
  status: LadderStatus;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  seasonStartsAt: Date;
  seasonEndsAt: Date;
  playoffStartsAt: Date;
  playoffEndsAt: Date;
  entryFee: number;
  currencyType: string;
  minRank: number;
  maxPlayers: number;
  participantCount: number;
  prizesDistributed: boolean;
  // Participants and teams live in the `ladderParticipants` / `ladderTeams`
  // subcollections under the ladder document, not embedded arrays, so a ladder
  // scales to thousands of players/teams without bloating the doc.
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export type LadderInput = Pick<
  Ladder,
  | "name"
  | "description"
  | "image"
  | "region"
  | "countryCode"
  | "ladderType"
  | "genderType"
  | "courtIds"
  | "registrationOpensAt"
  | "seasonStartsAt"
  | "entryFee"
  | "currencyType"
  | "minRank"
  | "maxPlayers"
>;
