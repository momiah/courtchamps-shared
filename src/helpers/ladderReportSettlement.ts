import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type { LadderMatch } from "../types/ladderMatch";
import { WALKOVER_CP } from "../types/noShow";
import { REPORT_REASONS, REPORT_STATUS } from "../types/report";
import type { Report, ReportWalkover } from "../types/report";
import type { DisqualificationReason, StrikeCounts } from "../types/disqualification";
import { applyStrike, removeStrike } from "./disqualification";
import { getLadderArrival, hasArrivedForLadderMatch } from "./ladderArrivals";

const MATCH_LOG_CAP = 20;

export const LADDER_SYSTEM_ACTOR = "system";

/** Where a walkover side lives: a ladder participant, a ladder team or a global team. */
export type LadderWalkoverSideKind = "ladderParticipant" | "ladderTeam" | "team";

export interface LadderWalkoverSide {
  kind: LadderWalkoverSideKind;
  id: string;
  role: "winner" | "loser";
  cpField?: "competitionXP" | "XP";
}

type DocData = Record<string, unknown> | undefined;

const num = (data: DocData, field: string): number =>
  (data?.[field] as number) ?? 0;

const pushResult = (log: unknown, result: "W" | "L"): string[] =>
  [...(Array.isArray(log) ? (log as string[]) : []), result].slice(
    -MATCH_LOG_CAP,
  );

const popResult = (log: unknown): string[] =>
  Array.isArray(log) ? (log as string[]).slice(0, -1) : [];

/** The docs a no-show walkover changes, in the order {@link planLadderWalkover} expects their data. */
export const getLadderWalkoverSides = (
  report: Pick<Report, "target">,
  walkover: ReportWalkover,
): LadderWalkoverSide[] =>
  walkover.winnerType === "team"
    ? [
        {
          kind: "ladderTeam",
          id: walkover.winnerTeamKey ?? "",
          role: "winner",
          cpField: "XP",
        },
        { kind: "team", id: walkover.winnerTeamId ?? "", role: "winner" },
        {
          kind: "ladderTeam",
          id: report.target.teamKey ?? "",
          role: "loser",
          cpField: "XP",
        },
        { kind: "team", id: report.target.teamId ?? "", role: "loser" },
      ]
    : [
        {
          kind: "ladderParticipant",
          id: walkover.winnerUserIds[0],
          role: "winner",
          cpField: "competitionXP",
        },
        {
          kind: "ladderParticipant",
          id: report.target.userIds[0],
          role: "loser",
          cpField: "competitionXP",
        },
      ];

export interface LadderWalkoverPlan {
  /** Update per side, null when that doc doesn't exist. */
  sideUpdates: (Record<string, unknown> | null)[];
  matchUpdate: Record<string, unknown> | null;
  cp: number;
}

/**
 * Settle (approve) or undo (revert) a no-show walkover without touching
 * Firestore: the winner takes a win and up to WALKOVER_CP ladder CP from the
 * no-show, who takes a loss. `sideData` is the current data of each side from
 * {@link getLadderWalkoverSides}, in the same order.
 */
export const planLadderWalkover = ({
  walkover,
  sides,
  sideData,
  match,
  mode,
  now,
}: {
  walkover: ReportWalkover;
  sides: LadderWalkoverSide[];
  sideData: DocData[];
  match: DocData;
  mode: "approve" | "revert";
  now: Date;
}): LadderWalkoverPlan => {
  if (mode === "approve") {
    if (!match) throw new Error("Match not found");
    if (match.matchStatus === LADDER_MATCH_STATUS.COMPLETED) {
      throw new Error("This match has already been completed");
    }
  }
  const loserIndex = sides.findIndex(
    (side) => side.role === "loser" && side.cpField,
  );
  const loser = sides[loserIndex];
  const cp =
    mode === "approve"
      ? Math.min(
          WALKOVER_CP,
          loser?.cpField ? num(sideData[loserIndex], loser.cpField) : 0,
        )
      : num(match, "walkoverCp");
  const sign = mode === "approve" ? 1 : -1;

  const sideUpdates = sides.map((side, index) => {
    const data = sideData[index];
    if (!data) return null;
    const isWinner = side.role === "winner";
    const countField = isWinner ? "numberOfWins" : "numberOfLosses";
    const update: Record<string, unknown> = {
      [countField]: Math.max(0, num(data, countField) + sign),
      matchResultLog:
        sign > 0
          ? pushResult(data.matchResultLog, isWinner ? "W" : "L")
          : popResult(data.matchResultLog),
    };
    if (side.cpField) {
      update[side.cpField] =
        num(data, side.cpField) + (isWinner ? cp : -cp) * sign;
    }
    return update;
  });

  const winnerKey =
    walkover.winnerType === "team"
      ? (walkover.winnerTeamKey ?? "")
      : walkover.winnerUserIds[0];

  const matchUpdate = !match
    ? null
    : mode === "approve"
      ? {
          matchStatus: LADDER_MATCH_STATUS.COMPLETED,
          walkover: true,
          walkoverReason: "No show",
          walkoverWinner: winnerKey,
          walkoverCp: cp,
          completedAt: now,
        }
      : {
          matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
          walkover: false,
          walkoverReason: null,
          walkoverWinner: null,
          walkoverCp: null,
          completedAt: null,
          noShowReported: true,
        };

  return { sideUpdates, matchUpdate, cp };
};

export interface LadderStrikePlan {
  countUpdates: Record<string, unknown>[];
  userUpdates: Record<string, unknown>[];
}

/**
 * Apply or remove a report's strike for each target player: the per-ladder
 * tally and the player's global conduct record. `counts` and `users` are the
 * current docs for `report.target.userIds`, in the same order.
 */
export const planReportStrikes = ({
  report,
  counts,
  users,
  mode,
  now,
}: {
  report: Pick<Report, "reason" | "ladderId" | "target">;
  counts: DocData[];
  users: DocData[];
  mode: "apply" | "remove";
  now: Date;
}): LadderStrikePlan => {
  const reason = report.reason as DisqualificationReason;
  const mutate = (strikes: StrikeCounts | undefined) =>
    mode === "apply" ? applyStrike(strikes, reason) : removeStrike(strikes, reason);
  const userIds = report.target.userIds ?? [];
  return {
    countUpdates: userIds.map((userId, index) => ({
      userId,
      ladderId: report.ladderId,
      teamKey: report.target.teamKey ?? null,
      strikes: mutate((counts[index]?.strikes as StrikeCounts) ?? {}),
      updatedAt: now,
    })),
    userUpdates: userIds.map((_, index) => {
      const conduct =
        (users[index]?.conduct as { strikes?: StrikeCounts } | undefined) ?? {};
      return {
        conduct: {
          ...conduct,
          strikes: mutate(conduct.strikes ?? {}),
          lastReportedAt: now,
        },
      };
    }),
  };
};

/** No-show claims in one ladder at or above this count are never auto-awarded. */
export const LADDER_NO_SHOW_CLAIM_FLAG_COUNT = 3;

export type LadderNoShowCloseOut =
  | { award: true; report: Report }
  | { award: false; reason: string };

/**
 * What happens to a match's undecided no-show claims when the ladder's
 * standings become final: the walkover is awarded only when exactly one side
 * claimed, the claimant's arrival at the court was recorded for this match,
 * nobody on the other side arrived, and the claimant isn't flagged (an earlier
 * no-show claim an admin rejected, or several claims in this ladder). Otherwise no
 * walkover is awarded.
 */
export const decideLadderNoShowCloseOut = ({
  match,
  claims,
  claimantHistory,
}: {
  match: Pick<LadderMatch, "arrivals" | "matchDate" | "matchTime">;
  claims: Report[];
  claimantHistory: Pick<
    Report,
    "reportedBy" | "reason" | "status" | "ladderId" | "resolvedBy"
  >[];
}): LadderNoShowCloseOut => {
  const pending = claims.filter(
    (claim) =>
      claim.reason === REPORT_REASONS.NO_SHOW &&
      claim.status === REPORT_STATUS.PENDING &&
      !!claim.walkover,
  );
  if (pending.length === 0) return { award: false, reason: "no_claim" };
  const sides = new Set(
    pending.map((claim) => [...(claim.walkover?.winnerUserIds ?? [])].sort().join(",")),
  );
  if (sides.size > 1) return { award: false, reason: "both_sides_claimed" };

  const [claim] = pending;
  if (!getLadderArrival(match, claim.reportedBy)) {
    return { award: false, reason: "claimant_not_arrived" };
  }
  if (hasArrivedForLadderMatch(match, claim.target.userIds ?? [])) {
    return { award: false, reason: "opponent_arrived" };
  }
  const noShowHistory = claimantHistory.filter(
    (past) =>
      past.reportedBy === claim.reportedBy &&
      past.reason === REPORT_REASONS.NO_SHOW,
  );
  if (
    noShowHistory.some(
      (past) =>
        past.status === REPORT_STATUS.REJECTED &&
        past.resolvedBy !== LADDER_SYSTEM_ACTOR,
    )
  ) {
    return { award: false, reason: "claimant_flagged" };
  }
  if (
    noShowHistory.filter((past) => past.ladderId === claim.ladderId).length >=
    LADDER_NO_SHOW_CLAIM_FLAG_COUNT
  ) {
    return { award: false, reason: "claimant_flagged" };
  }
  return { award: true, report: claim };
};
