import type { LadderType } from "./ladder";
import {
  DISQUALIFICATION_REASONS,
  type DisqualificationReason,
  type StrikeCounts,
} from "./disqualification";

/** Top-level collection of individual reports (the admin review queue). */
export const REPORTS_COLLECTION = "reports";

/** Per-ladder subcollection of strike tallies, keyed by userId. */
export const LADDER_REPORT_COUNTS_COLLECTION = "reportCounts";

/**
 * Reasons a report can be filed under. The {@link DisqualificationReason} values
 * each add a strike on approval; `other` is logged for admin context only and
 * adds no strike.
 */
export const REPORT_REASONS = {
  ...DISQUALIFICATION_REASONS,
  OTHER: "other",
} as const;

export type ReportReason =
  (typeof REPORT_REASONS)[keyof typeof REPORT_REASONS];

/** Display copy for a reason, used by the report modal and the admin queue. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  no_show: "No-show",
  cheating: "Cheating",
  abuse: "Abuse (physical or verbal)",
  harassment: "Harassment",
  other: "Other",
};

/** Reasons a user can pick in the match-menu report modal (no-show is its own route). */
export const CONDUCT_REPORT_REASONS: ReportReason[] = [
  REPORT_REASONS.CHEATING,
  REPORT_REASONS.ABUSE,
  REPORT_REASONS.HARASSMENT,
  REPORT_REASONS.OTHER,
];

/** A description is required only when the reason is `other`. */
export const reportNeedsDescription = (reason: ReportReason): boolean =>
  reason === REPORT_REASONS.OTHER;

export const REPORT_STATUS = {
  /** Awaiting an admin decision. */
  PENDING: "pending",
  /** Upheld: strikes applied (and walkover run, for a no-show). */
  APPROVED: "approved",
  /** Thrown out: no strikes applied. */
  REJECTED: "rejected",
} as const;

export type ReportStatus =
  (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const REPORT_TARGET_TYPE = {
  PLAYER: "player",
  TEAM: "team",
} as const;

export type ReportTargetType =
  (typeof REPORT_TARGET_TYPE)[keyof typeof REPORT_TARGET_TYPE];

/**
 * Who a report is against. `userIds` are the players who receive the strike on
 * approval — one for a singles/player-target report, both for a doubles team or
 * no-show report. `teamKey`/`teamId` are set for doubles so the pair can be
 * blocked and identified.
 */
export interface ReportTarget {
  type: ReportTargetType;
  userIds: string[];
  teamKey?: string;
  teamId?: string;
  /** Denormalised display name for the admin queue. */
  label?: string;
}

/**
 * The walkover winner, present only on a `no_show` report. On approval the match
 * completes as a walkover for this side (see WALKOVER_CP), on top of the strike.
 */
export interface ReportWalkover {
  winnerType: ReportTargetType;
  winnerUserIds: string[];
  winnerTeamKey?: string;
  winnerTeamId?: string;
}

/**
 * A single report submission. Raised from the check-in flow (`no_show`) or the
 * match settings menu (conduct), stored in {@link REPORTS_COLLECTION} as
 * `pending`, and actioned by an admin. On approval the strike counts fan out to
 * the per-ladder tally and the target's global conduct record atomically.
 */
export interface Report {
  reportId: string;
  ladderId: string;
  ladderName?: string;
  ladderType: LadderType;
  ladderMatchId: string;

  reason: ReportReason;
  description?: string;

  /** The reporter. */
  reportedBy: string;

  target: ReportTarget;
  /** Present only when reason is `no_show`. */
  walkover?: ReportWalkover;

  /** Denormalised match info for the admin queue (avoids a per-report read). */
  matchDate?: string;
  matchTime?: string;
  courtName?: string;

  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
}

/**
 * A player's strike tally within one ladder, at
 * `ladders/{ladderId}/reportCounts/{userId}`. Disqualification is derived from
 * `strikes`, never stored. `teamKey` is denormalised context (the pair the
 * player was on), not a second counter.
 */
export interface LadderReportCounts {
  userId: string;
  ladderId: string;
  teamKey?: string;
  strikes: StrikeCounts;
  updatedAt: Date | string;
}

/**
 * A player's lifetime strike tally across all ladders, held on their global
 * profile. Record-only — it never disqualifies — kept for future use such as
 * player feedback scores.
 */
export interface ConductRecord {
  strikes: StrikeCounts;
  lastReportedAt?: Date | string;
}

/** Outcome of raising a report from the app. */
export interface CreateReportOutcome {
  success: boolean;
  reason?: "exists" | "invalid" | "error";
}

/** Reasons that add a strike (everything except `other`). */
export const isStrikeReason = (
  reason: ReportReason,
): reason is DisqualificationReason => reason !== REPORT_REASONS.OTHER;
