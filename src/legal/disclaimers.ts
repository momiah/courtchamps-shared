import { PLATFORM_FEE, getLadderEntryPrice } from "../helpers/calculateLadderPrizePool";
import { formatCurrency } from "../helpers/ladderPrizes";

export const PLATFORM_FEE_PERCENT = `${Math.round(PLATFORM_FEE * 100)}%`;

export const PAID_LADDER_AGE_DISCLAIMER = "18+ only.";

export const PAID_LADDER_AGE_BADGE = "18+";

/** How a cancelled ladder's entries are refunded: "refunded in full, including the 10% platform fee". */
export const LADDER_CANCELLED_REFUND = `refunded in full, including the ${PLATFORM_FEE_PERCENT} platform fee`;

export const PLATFORM_FEE_ON_TOP = `A ${PLATFORM_FEE_PERCENT} platform fee is added on top of the entry. The full entry fee goes into the prize pool.`;

/** The footnote for the asterisk on a cash ladder's entry fee. */
export const getPlatformFeeFootnote = (entryFee: number, currencyType: string): string => {
  const price = getLadderEntryPrice(entryFee);
  const format = (amount: number) => formatCurrency(amount, currencyType);
  return `*A ${format(price.platformFee)} platform fee is added on top of the ${format(price.entryFee)} entry. The full entry fee goes into the prize pool.`;
};
