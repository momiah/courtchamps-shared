import {
  DISQUALIFICATION_REASONS,
  DISQUALIFICATION_REASON_LABELS,
  NO_SHOW_DQ_THRESHOLD,
  type DisqualificationReason,
  type LadderDisqualification,
} from "../types/disqualification";

/** True once no-show strikes reach the disqualification threshold. */
export const reachedNoShowLimit = (noShowCount: number): boolean =>
  noShowCount >= NO_SHOW_DQ_THRESHOLD;

/**
 * The field update for adding one no-show strike to a ladder entrant: bumps
 * `noShowCount`, and once it reaches the threshold also flags the entrant
 * disqualified for `no_show`. Pure, so the same rule drives every caller (the
 * admin no-show approval today, any future path tomorrow).
 */
export const buildNoShowStrikeUpdate = (
  currentCount: number,
  now: Date = new Date(),
): LadderDisqualification => {
  const noShowCount = (currentCount ?? 0) + 1;
  if (reachedNoShowLimit(noShowCount)) {
    return {
      noShowCount,
      disqualified: true,
      disqualifiedReason: DISQUALIFICATION_REASONS.NO_SHOW,
      disqualifiedAt: now,
    };
  }
  return { noShowCount };
};

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
