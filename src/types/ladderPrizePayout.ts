export const LADDER_PRIZE_PAYOUTS_COLLECTION = "prizePayouts";

export const LADDER_PRIZE_POT_NAME = "Unclaimed Prize Pot";

export const LADDER_PRIZE_PAYOUT_STATUS = {
  /** Paid when the playoffs finished, or in full after review. */
  PAID: "paid",
  /** The player was disqualified in the money; an admin decides. */
  HELD: "held",
  /** Part paid after review; the rest is retained by Court Champs. */
  PART_PAID: "partPaid",
  /** Not paid after review; retained by Court Champs. */
  WITHHELD: "withheld",
  /** The account was deleted before payout; retained by Court Champs. */
  KEPT: "kept",
} as const;

export type LadderPrizePayoutStatus =
  (typeof LADDER_PRIZE_PAYOUT_STATUS)[keyof typeof LADDER_PRIZE_PAYOUT_STATUS];

export const LADDER_PRIZE_REVIEW_DECISION = {
  PAY: "pay",
  PAY_PART: "payPart",
  WITHHOLD: "withhold",
} as const;

export type LadderPrizeReviewDecision =
  (typeof LADDER_PRIZE_REVIEW_DECISION)[keyof typeof LADDER_PRIZE_REVIEW_DECISION];

export interface LadderPrizeAmount {
  cash: number;
  cp: number;
}

export interface LadderPrizeReview {
  decision: LadderPrizeReviewDecision;
  /** What to pay for PAY_PART; ignored otherwise. */
  amount?: LadderPrizeAmount;
  reason: string;
  decidedBy: string;
  decidedAt: Date;
  /** Set by the backend once the decision has been carried out. */
  appliedAt?: Date | null;
}

/** One player's prize from a ladder's playoffs, written by Cloud Functions. */
export interface LadderPrizePayout {
  payoutId: string;
  ladderId: string;
  userId: string;
  /** Both players of a doubles side; just the player in singles. */
  sidePlayerIds: string[];
  tieId: string;
  place: number;
  /** A void tie placed this side jointly with its opponent. */
  voided: boolean;
  currencyType: string;
  /** This player's part of the place prize, of the Unclaimed Prize Pot and in total. */
  placePrize: LadderPrizeAmount;
  potShare: LadderPrizeAmount;
  prize: LadderPrizeAmount;
  /** What has actually been paid to this player. */
  paid: LadderPrizeAmount;
  status: LadderPrizePayoutStatus;
  /** Why the prize is held or kept, e.g. "Disqualified: 3 conduct strikes". */
  reason?: string | null;
  review?: LadderPrizeReview | null;
  createdAt: Date;
  updatedAt: Date;
}
