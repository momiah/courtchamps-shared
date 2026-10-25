import type { Report } from "../types/report";
import { REPORT_STATUS, isStrikeReason } from "../types/report";
import { toMs } from "./ladderAutoCancel";

/** Upheld strikes within the window that block a player from joining ladders. */
export const ACCOUNT_STRIKE_LIMIT = 5;

/** How long a strike counts towards the account, from when it was upheld. */
export const ACCOUNT_STRIKE_MONTHS = 12;

type DateLike = Date | { toDate: () => Date } | string | number | null | undefined;

export type AccountStrikeReport = Pick<Report, "ladderId" | "reason" | "status"> & {
  reportId?: string;
  target: { userIds?: string[] };
  resolvedAt?: DateLike;
};

export interface AccountStrike {
  reportId?: string;
  ladderId: string;
  reason: Report["reason"];
  at: Date;
  expiresAt: Date;
}

export interface AccountStrikes {
  count: number;
  blocked: boolean;
  strikes: AccountStrike[];
  /** When the player can join ladders again if nothing else is upheld; null when not blocked. */
  unblocksAt: Date | null;
}

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

/**
 * A player's account strikes: every upheld report against them, on any ladder,
 * from the last {@link ACCOUNT_STRIKE_MONTHS} months and after an admin last
 * lifted their block. At {@link ACCOUNT_STRIKE_LIMIT} they can't join ladders.
 * Derived from the reports, never stored.
 */
export const getAccountStrikes = ({
  reports,
  userId,
  now,
  liftedAt,
}: {
  reports: AccountStrikeReport[];
  userId: string;
  now: Date;
  liftedAt?: DateLike;
}): AccountStrikes => {
  const windowStart = addMonths(now, -ACCOUNT_STRIKE_MONTHS).getTime();
  const countsFrom = Math.max(windowStart, toMs(liftedAt ?? null) ?? 0);
  const strikes = reports
    .filter(
      (report) =>
        report.status === REPORT_STATUS.APPROVED &&
        isStrikeReason(report.reason) &&
        (report.target.userIds ?? []).includes(userId),
    )
    .map((report) => ({ report, ms: toMs(report.resolvedAt ?? null) }))
    .filter((entry): entry is { report: AccountStrikeReport; ms: number } =>
      entry.ms !== null && entry.ms > countsFrom && entry.ms <= now.getTime(),
    )
    .sort((a, b) => a.ms - b.ms)
    .map(({ report, ms }) => ({
      reportId: report.reportId,
      ladderId: report.ladderId,
      reason: report.reason,
      at: new Date(ms),
      expiresAt: addMonths(new Date(ms), ACCOUNT_STRIKE_MONTHS),
    }));
  const blocked = strikes.length >= ACCOUNT_STRIKE_LIMIT;
  return {
    count: strikes.length,
    blocked,
    strikes,
    unblocksAt: blocked ? strikes[strikes.length - ACCOUNT_STRIKE_LIMIT].expiresAt : null,
  };
};

/** The earliest upheld time that can still count, for querying the reports. */
export const getAccountStrikeWindowStart = (now: Date): Date =>
  addMonths(now, -ACCOUNT_STRIKE_MONTHS);
