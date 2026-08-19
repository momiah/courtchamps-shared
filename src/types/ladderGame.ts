import type { Court } from "./court";
import type { Game } from "./game";

export const SHUTTLE_TYPE = {
  FEATHER: "Feather",
  PLASTIC: "Plastic",
} as const;

export type ShuttleType = (typeof SHUTTLE_TYPE)[keyof typeof SHUTTLE_TYPE];

export const LADDER_GAME_STATUS = {
  POSTED: "posted",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
} as const;

export type LadderGameStatus =
  (typeof LADDER_GAME_STATUS)[keyof typeof LADDER_GAME_STATUS];

export const LADDER_GAME_BEST_OF_OPTIONS = [3, 5, 7, 9] as const;

export interface LadderGame {
  ladderGameId: string;
  court: Court;
  bestOf: number;
  /**
   * Total court-hire cost, split across players. The poster pays the venue
   * first; the accepter then pays their share to the poster, and the platform
   * fee is deducted from that amount before it reaches the poster.
   */
  courtFee: number;
  currencyType: string;
  participants: string[];
  games: Game[];
  gameStatus: LadderGameStatus;
  shuttleType: ShuttleType;
  createdBy: string;
  createdAt: Date;
}

export type LadderGameInput = Pick<
  LadderGame,
  "court" | "bestOf" | "courtFee" | "currencyType" | "shuttleType"
>;
