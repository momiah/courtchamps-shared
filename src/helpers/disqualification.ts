import {
  DISQUALIFICATION_REASON_LABELS,
  DISQUALIFICATION_SEVERITY,
  DISQUALIFICATION_THRESHOLDS,
  type DisqualificationReason,
  type StrikeCounts,
} from "../types/disqualification";

/** Add one strike of `reason` to a tally, returning a new tally. */
export const applyStrike = (
  strikes: StrikeCounts | undefined,
  reason: DisqualificationReason,
): StrikeCounts => ({
  ...strikes,
  [reason]: (strikes?.[reason] ?? 0) + 1,
});

export interface Disqualification {
  disqualified: boolean;
  /** Every reason whose count has reached its threshold. */
  reasons: DisqualificationReason[];
  /** The most serious tripped reason, for a single-line disclaimer. */
  primaryReason?: DisqualificationReason;
}

/**
 * Derive disqualification from a strike tally — the single source of truth for
 * whether an entrant is blocked. Never stored, so retuning a threshold (globally
 * here, or per-ladder via `thresholds`) re-evaluates everyone with no migration.
 */
export const getDisqualification = (
  strikes: StrikeCounts | undefined,
  thresholds: Record<DisqualificationReason, number> = DISQUALIFICATION_THRESHOLDS,
): Disqualification => {
  const reasons = DISQUALIFICATION_SEVERITY.filter(
    (reason) => (strikes?.[reason] ?? 0) >= thresholds[reason],
  );
  return {
    disqualified: reasons.length > 0,
    reasons,
    primaryReason: reasons[0],
  };
};

/** Convenience boolean for the common "is this entrant blocked?" check. */
export const isDisqualified = (
  strikes: StrikeCounts | undefined,
  thresholds?: Record<DisqualificationReason, number>,
): boolean => getDisqualification(strikes, thresholds).disqualified;

/**
 * The disclaimer shown when a disqualified entrant opens the post/accept flow,
 * e.g. "You have been disqualified from this ladder due to multiple no-shows".
 */
export const disqualificationDisclaimer = (
  reason?: DisqualificationReason,
): string => {
  const label = reason ? DISQUALIFICATION_REASON_LABELS[reason] : "policy breaches";
  return `You have been disqualified from this ladder due to multiple ${label}.`;
};
