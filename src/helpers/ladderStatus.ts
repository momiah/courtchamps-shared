import { LADDER_STATUS, LadderStatus } from "../types/ladder";

export const LADDER_STATUS_SEQUENCE: LadderStatus[] = [
  LADDER_STATUS.REGISTRATION_OPEN,
  LADDER_STATUS.REGISTRATION_CLOSED,
  LADDER_STATUS.PLAYOFFS,
  LADDER_STATUS.COMPLETED,
];

export const LADDER_STATUS_LABELS: Record<LadderStatus, string> = {
  [LADDER_STATUS.REGISTRATION_OPEN]: "Registration Open",
  [LADDER_STATUS.REGISTRATION_CLOSED]: "Registration Closed",
  [LADDER_STATUS.PLAYOFFS]: "Playoffs",
  [LADDER_STATUS.COMPLETED]: "Completed",
  [LADDER_STATUS.CANCELLED]: "Cancelled",
};

const KNOWN_LADDER_STATUSES = new Set<string>(Object.values(LADDER_STATUS));

export const normalizeLadderStatus = (
  value: string | null | undefined,
): LadderStatus =>
  value != null && KNOWN_LADDER_STATUSES.has(value)
    ? (value as LadderStatus)
    : LADDER_STATUS.REGISTRATION_OPEN;

export type LadderPhaseState = "completed" | "active" | "upcoming";

export const getLadderPhaseState = (
  ladderStatus: LadderStatus,
  phaseStatus: LadderStatus,
): LadderPhaseState => {
  const current = LADDER_STATUS_SEQUENCE.indexOf(ladderStatus);
  const phase = LADDER_STATUS_SEQUENCE.indexOf(phaseStatus);
  if (current < 0 || phase < 0) return "upcoming";
  if (phase < current) return "completed";
  if (phase === current) return "active";
  return "upcoming";
};
