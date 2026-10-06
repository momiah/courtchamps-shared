import type { CourtLocation } from "./court";

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
  /** Set by processLadderPhases when the playoff bracket is created. */
  playoffsGeneratedAt?: Date;
  /** Number of bracket spots (a power of two). */
  playoffBracketSize?: number;
  /** Entrants registered when the bracket was created. */
  playoffEntrantCount?: number;
  /** Set when the ladder is cancelled, e.g. too few registrations. */
  cancelledAt?: Date;
  cancelledReason?: string;
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

/**
 * A player's (singles) or team's (doubles) chosen home court for one ladder,
 * stored on the ladderParticipants / ladderTeams doc. Used to pair nearby
 * entrants in the first playoff round.
 */
export interface LadderHomeCourt {
  courtId: string;
  courtName: string;
  location: CourtLocation;
}

export const LADDER_HOME_COURT_MAX_CHANGES = 1;

export const LADDER_CANCELLED_REASON = {
  TOO_FEW_REGISTRATIONS: "Too few registrations",
} as const;
