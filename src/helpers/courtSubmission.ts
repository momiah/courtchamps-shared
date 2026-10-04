import { COURT_SUBMISSION_STATUS } from "../types/court";
import type { Court, CourtSubmission } from "../types/court";

export const buildLadderCourtSubmission = ({
  submittedBy,
  submittedByUsername,
  ladderId,
  ladderName,
  submittedAt = new Date(),
}: {
  submittedBy: string;
  submittedByUsername: string;
  ladderId: string;
  ladderName: string;
  submittedAt?: Date;
}): CourtSubmission => ({
  submittedBy,
  submittedByUsername,
  ladderId,
  ladderName,
  submittedAt,
  status: COURT_SUBMISSION_STATUS.PENDING,
  reviewedBy: null,
  reviewedAt: null,
});

export const isPendingCourtSubmission = (
  court: Pick<Court, "submission">,
): boolean => court.submission?.status === COURT_SUBMISSION_STATUS.PENDING;

export const isPendingLadderCourtSubmission = (
  court: Pick<Court, "submission">,
  ladderId: string,
): boolean =>
  isPendingCourtSubmission(court) && court.submission?.ladderId === ladderId;

export const isSelectableLadderCourt = (
  court: Pick<Court, "courtId" | "verified">,
  ladderCourtIds: string[] | null | undefined,
): boolean => !!court.verified && (ladderCourtIds ?? []).includes(court.courtId);
