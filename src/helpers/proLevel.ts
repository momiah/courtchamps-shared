/** Lifetime cash won (GBP) a player must exceed to reach each PROLevel. */
export const PRO_LEVEL_THRESHOLDS = [1000, 5000, 10000, 25000, 50000] as const;

export const PRO_LEVEL_MAX = PRO_LEVEL_THRESHOLDS.length;

export const getProLevel = (cashWon?: number | null): number => {
  const won = typeof cashWon === "number" && Number.isFinite(cashWon) ? cashWon : 0;
  return PRO_LEVEL_THRESHOLDS.filter((threshold) => won > threshold).length;
};
