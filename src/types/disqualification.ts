/**
 * Reasons a strike can be recorded against a player. `no_show` accrues from
 * approved no-show reports (raised in the check-in flow); the conduct reasons
 * accrue from reports an admin upholds. Disqualification is never stored — it is
 * derived by comparing strike counts to {@link DISQUALIFICATION_THRESHOLDS}, so
 * retuning a limit re-evaluates everyone with no data migration.
 */
export const DISQUALIFICATION_REASONS = {
  NO_SHOW: "no_show",
  CHEATING: "cheating",
  ABUSE: "abuse",
  HARASSMENT: "harassment",
} as const;

export type DisqualificationReason =
  (typeof DISQUALIFICATION_REASONS)[keyof typeof DISQUALIFICATION_REASONS];

/** Strikes of a reason, accrued in one ladder, that trigger disqualification. */
export const DISQUALIFICATION_THRESHOLDS: Record<DisqualificationReason, number> =
  {
    no_show: 5,
    cheating: 3,
    abuse: 3,
    harassment: 3,
  };

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
  harassment: "harassment reports",
};

/**
 * Order used to pick the single reason shown in a disclaimer when a player has
 * crossed more than one limit — most serious first.
 */
export const DISQUALIFICATION_SEVERITY: DisqualificationReason[] = [
  DISQUALIFICATION_REASONS.ABUSE,
  DISQUALIFICATION_REASONS.HARASSMENT,
  DISQUALIFICATION_REASONS.CHEATING,
  DISQUALIFICATION_REASONS.NO_SHOW,
];

/** Strike tally keyed by reason. Stored per-ladder-per-player and globally. */
export type StrikeCounts = Partial<Record<DisqualificationReason, number>>;
