/**
 * No-show strikes accrued in a single ladder that trigger automatic
 * disqualification from that ladder (never the player's global profile).
 */
export const NO_SHOW_DQ_THRESHOLD = 5;

/**
 * Why a ladder entrant was disqualified. `no_show` is applied automatically once
 * strikes reach {@link NO_SHOW_DQ_THRESHOLD}; the others are applied manually by
 * an admin. Extensible as new grounds are added.
 */
export const DISQUALIFICATION_REASONS = {
  NO_SHOW: "no_show",
  CHEATING: "cheating",
  ABUSE: "abuse",
} as const;

export type DisqualificationReason =
  (typeof DISQUALIFICATION_REASONS)[keyof typeof DISQUALIFICATION_REASONS];

/**
 * Plural, disclaimer-ready phrasing for each reason, so a message reads
 * "disqualified … due to multiple {label}".
 */
export const DISQUALIFICATION_REASON_LABELS: Record<
  DisqualificationReason,
  string
> = {
  no_show: "no-shows",
  cheating: "cheating offences",
  abuse: "abuse reports",
};

/**
 * Reliability fields carried by a per-ladder entrant — a singles participant
 * ({@link ScoreboardProfile}) or a doubles team ({@link TeamStats}). Scoped to a
 * single ladder; the player's global profile is never affected.
 */
export interface LadderDisqualification {
  /** No-show strikes accrued in this ladder. */
  noShowCount?: number;
  disqualified?: boolean;
  disqualifiedReason?: DisqualificationReason;
  disqualifiedAt?: Date | string;
}
