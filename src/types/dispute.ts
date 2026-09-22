import type { Game, SelectedPlayers } from "./game";
import type { LadderType } from "./ladder";

/** Top-level Firestore collection holding game disputes (the admin review queue). */
export const DISPUTES_COLLECTION = "disputes";

/**
 * Stages a dispute moves through. `more_evidence_requested` is optional and only
 * entered when an admin asks the disputer for more. Resolution is terminal. The
 * stage is stored (so the admin queue can query it) and mirrored as the last
 * {@link DisputeEvent} for the timeline accordion.
 */
export const DISPUTE_STAGE = {
  UNDER_REVIEW: "under_review",
  MORE_EVIDENCE_REQUESTED: "more_evidence_requested",
  RESOLVED: "resolved",
} as const;

export type DisputeStage = (typeof DISPUTE_STAGE)[keyof typeof DISPUTE_STAGE];

/** Display copy for a stage, used by the app accordion and the admin queue. */
export const DISPUTE_STAGE_LABELS: Record<DisputeStage, string> = {
  under_review: "Under Review",
  more_evidence_requested: "More Evidence Requested",
  resolved: "Resolved",
};

/** The admin decision that resolves a dispute. */
export const DISPUTE_RESOLUTION = {
  /** Disputed (corrected) scores upheld and scored through the normal game flow. */
  UPHELD: "upheld",
  /** Original submitted scores stand; the game proceeds as it was reported. */
  REJECTED: "rejected",
} as const;

export type DisputeResolution =
  (typeof DISPUTE_RESOLUTION)[keyof typeof DISPUTE_RESOLUTION];

/**
 * A round of evidence attached to a dispute: the disputer's initial submission
 * (index 0) and any later round the admin requests. `courtPositions` are
 * required whenever a `videoUrl` is present so an admin can tell the sides apart
 * in the video (see {@link disputeEvidenceNeedsCourtPositions}).
 */
export interface DisputeEvidence {
  videoUrl?: string;
  notes?: string;
  courtPositions?: SelectedPlayers;
  /** userId of the player who submitted this round. */
  submittedBy: string;
  submittedAt: Date;
}

/**
 * One entry in the dispute timeline, rendered as an independently collapsible
 * accordion point. A new entry is appended on each stage transition / admin
 * action so the disputer can follow the review.
 */
export interface DisputeEvent {
  stage: DisputeStage;
  /** Note shown with this entry (e.g. why more evidence was requested, or the
   * final resolution note). */
  note?: string;
  /** userId of who triggered this transition (the opener or an admin). */
  createdBy: string;
  createdAt: Date;
}

/**
 * A single game dispute. Raised when a player rejects a game in the ladder game
 * approval flow, stored in {@link DISPUTES_COLLECTION} at `under_review`, and
 * actioned by a website admin. On `upheld` the corrected scores are written to
 * the game and scored through the normal ladder game flow; on `rejected` the
 * original scores stand. Resolution is atomic and reversible in the same spirit
 * as the reports/no-show services.
 */
export interface Dispute {
  disputeId: string;
  ladderId: string;
  ladderName?: string;
  ladderType: LadderType;
  ladderMatchId: string;
  gameId: string;

  /** The originally submitted game whose scores were rejected. */
  originalGame: Game;
  /** The disputer's corrected game. */
  disputedGame: Game;

  /** The player who rejected the game and opened the dispute. */
  openedBy: string;
  /**
   * Everyone notified about the dispute — both players in singles, all four in
   * doubles — so opening the notification can route each of them to the screen.
   */
  participantIds: string[];

  /** Evidence rounds, oldest first (index 0 is the disputer's initial submission). */
  evidence: DisputeEvidence[];

  stage: DisputeStage;
  /** Timeline of stage transitions, one accordion point each. */
  events: DisputeEvent[];

  /** Set once the dispute is resolved. */
  resolution?: DisputeResolution | null;
  /**
   * The final agreed game — the disputer's corrected scores, or an
   * admin-supplied game — written to the match on `upheld`.
   */
  finalGame?: Game | null;
  /** Final admin notes shown in the resolved accordion point. */
  adminNotes?: string | null;

  /** Denormalised match info for the admin queue (avoids a per-dispute read). */
  matchDate?: string;
  matchTime?: string;
  courtName?: string;

  createdAt: Date;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
}

/** Outcome of opening a dispute from the app. */
export interface CreateDisputeOutcome {
  success: boolean;
  /** "exists" when an unresolved dispute is already on file for the game. */
  reason?: "exists" | "invalid" | "error";
}

/** True when at least one court position slot has been assigned. */
export const hasCourtPositions = (positions?: SelectedPlayers): boolean =>
  Boolean(
    positions &&
      [...positions.team1, ...positions.team2].some((player) => player != null),
  );

/**
 * Court positions are mandatory only when a video is attached, so submission is
 * blocked until they are provided in that case.
 */
export const disputeEvidenceNeedsCourtPositions = (
  evidence: Pick<DisputeEvidence, "videoUrl" | "courtPositions">,
): boolean =>
  Boolean(evidence.videoUrl) && !hasCourtPositions(evidence.courtPositions);

/** True once a dispute has reached its terminal stage. */
export const isDisputeResolved = (stage: DisputeStage): boolean =>
  stage === DISPUTE_STAGE.RESOLVED;

/** True when the dispute is awaiting a further evidence submission from the disputer. */
export const isAwaitingMoreEvidence = (stage: DisputeStage): boolean =>
  stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED;

/** Whether a non-rejected dispute already exists (used to block a duplicate). */
export const DISPUTE_ACTIVE_STAGES: DisputeStage[] = [
  DISPUTE_STAGE.UNDER_REVIEW,
  DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
];
