import { prizeTypes } from "../schema";

export type PrizeType = typeof prizeTypes.CASH | typeof prizeTypes.COMMUNITY;

const CASH_PRIZE_TYPES = new Set<unknown>([
  prizeTypes.CASH,
  prizeTypes.CASH_TROPHY,
  prizeTypes.CASH_MEDAL,
]);

export const getPrizeType = (entryFee?: number | null): PrizeType =>
  (entryFee ?? 0) > 0 ? prizeTypes.CASH : prizeTypes.COMMUNITY;

export const normalizePrizeType = (value: unknown): PrizeType =>
  CASH_PRIZE_TYPES.has(value) ? prizeTypes.CASH : prizeTypes.COMMUNITY;
