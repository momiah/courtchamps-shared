import type { Game, SelectedPlayers } from "./game";
import type { LadderType } from "./ladder";

/** Top-level Firestore collection holding game disputes (the admin review queue). */
export const DISPUTES_COLLECTION = "disputes";

/**
 * Stages a dispute moves through. `more_evidence_requested` is optional and only
 * entered when an admin asks the players for more; any submission moves it back
 * to `under_review`. Resolution is terminal. The stage is stored so the admin
 * queue can query it.
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

/** How a dispute was resolved. */
export const DISPUTE_RESOLUTION = {
  /** Disputed (corrected) scores upheld and scored through the normal game flow. */
  UPHELD: "upheld",
  /** Original submitted scores stand; the game proceeds as it was reported. */
  REJECTED: "rejected",
  /**
   * Nobody submitted evidence within {@link DISPUTE_EVIDENCE_WINDOW_HOURS} of an
   * admin request, so the original scores stand (scored like `rejected`).
   */
  VOID: "void",
  /** The opener withdrew the dispute, so the original scores stand. */
  CANCELLED: "cancelled",
} as const;

export type DisputeResolution =
  (typeof DISPUTE_RESOLUTION)[keyof typeof DISPUTE_RESOLUTION];

export const DISPUTE_RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  upheld: "Disputed score upheld",
  rejected: "Original score stands",
  void: "Voided",
  cancelled: "Cancelled by the disputer",
};

/** Hours players have to respond to an admin's evidence request before the dispute is voided. */
export const DISPUTE_EVIDENCE_WINDOW_HOURS = 48;

/** `createdBy` / `resolvedBy` for actions taken by the auto-void function. */
export const DISPUTE_SYSTEM_ACTOR = "system";

/** What happened at a timeline point. Each action is its own collapsible phase. */
export const DISPUTE_EVENT_TYPE = {
  OPENED: "opened",
  EVIDENCE_SUBMITTED: "evidence_submitted",
  EVIDENCE_REQUESTED: "evidence_requested",
  RESOLVED: "resolved",
  VOIDED: "voided",
  CANCELLED: "cancelled",
} as const;

export type DisputeEventType =
  (typeof DISPUTE_EVENT_TYPE)[keyof typeof DISPUTE_EVENT_TYPE];

export const DISPUTE_EVENT_LABELS: Record<DisputeEventType, string> = {
  opened: "Dispute opened",
  evidence_submitted: "Evidence submitted",
  evidence_requested: "Evidence requested",
  resolved: "Resolved",
  voided: "Dispute voided",
  cancelled: "Dispute cancelled",
};

/** Event types written by an admin (or the system), never by a player. */
export const DISPUTE_ADMIN_EVENT_TYPES: DisputeEventType[] = [
  DISPUTE_EVENT_TYPE.EVIDENCE_REQUESTED,
  DISPUTE_EVENT_TYPE.RESOLVED,
  DISPUTE_EVENT_TYPE.VOIDED,
];

/**
 * Evidence attached to a player action. Either a note or a video is required;
 * court positions are required with a video and not allowed without one (see
 * {@link getDisputeEvidenceBlocker}).
 */
export interface DisputeEvidence {
  note?: string;
  /**
   * The `gameVideos` doc this evidence refers to (`${gameId}_${userId}`, see
   * {@link gameVideoDocId}). The upload may still be in flight when submitted.
   */
  videoId?: string;
  /** Where each player stood at the start of this video. */
  courtPositions?: SelectedPlayers;
}

/**
 * One timeline phase: a single action by a single person (a participant, an
 * admin, or {@link DISPUTE_SYSTEM_ACTOR}). Player actions carry their evidence
 * inline so each video stays paired with its own court positions.
 */
export interface DisputeEvent extends DisputeEvidence {
  type: DisputeEventType;
  /** The dispute's stage after this action. */
  stage: DisputeStage;
  /** userId of the participant or admin, or {@link DISPUTE_SYSTEM_ACTOR}. */
  createdBy: string;
  createdAt: Date;
  /** Set on `evidence_requested`: when the dispute is voided if nobody responds. */
  evidenceDueAt?: Date;
}

/**
 * A single game dispute. Raised when a player rejects a game in the ladder game
 * approval flow, stored in {@link DISPUTES_COLLECTION} at `under_review`, and
 * actioned by a website admin. Any participant can add evidence while it is
 * unresolved. On `upheld` the corrected scores are written to the game and
 * scored through the normal ladder game flow; on `rejected` or `void` the
 * original scores stand. The opener can cancel it, which also keeps the
 * original scores.
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
   * Everyone in the game — both players in singles, all four in doubles. All of
   * them are notified and all of them can add evidence.
   */
  participantIds: string[];

  stage: DisputeStage;
  /** Timeline, oldest first. The first event is always `opened`. */
  events: DisputeEvent[];
  /**
   * While `more_evidence_requested`: when the dispute is voided if no
   * participant submits evidence. Cleared by any submission.
   */
  evidenceDueAt?: Date | null;

  /** Set once the dispute is resolved. */
  resolution?: DisputeResolution | null;
  /**
   * The final agreed game — the disputer's corrected scores, or the original
   * game on `rejected` / `void` / `cancelled` — written to the match.
   */
  finalGame?: Game | null;
  /** Final admin notes shown in the resolved phase. */
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

/** The `gameVideos` doc id for a player's upload of a game (one per player per game). */
export const gameVideoDocId = (gameId: string, userId: string): string =>
  `${gameId}_${userId}`;

/** True when at least one court position slot has been assigned. */
export const hasCourtPositions = (positions?: SelectedPlayers | null): boolean =>
  Boolean(
    positions &&
      [...positions.team1, ...positions.team2].some((player) => player != null),
  );

/** Why a submission is blocked, or null when it can be submitted. */
export type DisputeEvidenceBlocker = "empty" | "court_positions";

export const DISPUTE_EVIDENCE_BLOCKER_MESSAGES: Record<
  DisputeEvidenceBlocker,
  string
> = {
  empty: "Add a note or a video to submit.",
  court_positions: "Court positions are required with a video.",
};

/**
 * Submission rule for opening a dispute and for every later submission: a note
 * or a video is required, and a video needs court positions.
 */
export const getDisputeEvidenceBlocker = ({
  note,
  hasVideo,
  courtPositions,
}: {
  note?: string | null;
  hasVideo: boolean;
  courtPositions?: SelectedPlayers | null;
}): DisputeEvidenceBlocker | null => {
  if (!hasVideo && !note?.trim()) return "empty";
  if (hasVideo && !hasCourtPositions(courtPositions)) return "court_positions";
  return null;
};

/** True when evidence carries a note or a video. */
export const hasDisputeEvidence = (event: DisputeEvidence): boolean =>
  Boolean(event.videoId || event.note?.trim());

/**
 * True for a player's evidence phase (opening the dispute or a later
 * submission) that carries a note or a video. Admin notes don't count.
 */
export const isPlayerEvidenceEvent = (event: DisputeEvent): boolean =>
  (event.type === DISPUTE_EVENT_TYPE.OPENED ||
    event.type === DISPUTE_EVENT_TYPE.EVIDENCE_SUBMITTED) &&
  hasDisputeEvidence(event);

/** True once a dispute has reached its terminal stage. */
export const isDisputeResolved = (stage: DisputeStage): boolean =>
  stage === DISPUTE_STAGE.RESOLVED;

/** True when the admin has asked the players for more evidence. */
export const isAwaitingMoreEvidence = (stage: DisputeStage): boolean =>
  stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED;

/** Unresolved stages (used to block a duplicate and to build the admin queue). */
export const DISPUTE_ACTIVE_STAGES: DisputeStage[] = [
  DISPUTE_STAGE.UNDER_REVIEW,
  DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
];

/** Epoch ms for a Date, a Firestore Timestamp, or an ISO/epoch value (0 when invalid). */
export const disputeTimeMs = (value: unknown): number => {
  if (
    value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value == null) return 0;
  const t = new Date(value as string | number | Date).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** The void deadline for an evidence request made at `fromMs`. */
export const getDisputeEvidenceDueAt = (
  fromMs: number,
  windowHours: number = DISPUTE_EVIDENCE_WINDOW_HOURS,
): Date => new Date(fromMs + windowHours * 60 * 60 * 1000);

/**
 * True when an evidence request has gone unanswered past its deadline, so the
 * dispute should be voided. Any submission moves the stage back to
 * `under_review`, so the stage alone tells us nobody responded.
 */
export const isDisputeEvidenceOverdue = (
  dispute: Pick<Dispute, "stage" | "evidenceDueAt">,
  nowMs: number,
): boolean => {
  if (dispute.stage !== DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED) return false;
  const dueMs = disputeTimeMs(dispute.evidenceDueAt);
  return dueMs > 0 && nowMs >= dueMs;
};
