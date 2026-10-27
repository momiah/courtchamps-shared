import {
  ACCOUNT_STRIKE_LIMIT,
  ACCOUNT_STRIKE_MONTHS,
  getAccountStrikes,
  getAccountStrikeWindowStart,
} from "../accountStrikes";

const now = new Date("2026-10-25T12:00:00Z");
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const report = (fields) => ({
  reportId: `r-${Math.random()}`,
  ladderId: "ladder",
  reason: "no_show",
  status: "approved",
  target: { userIds: ["user"] },
  resolvedAt: daysAgo(10),
  ...fields,
});

describe("account strikes", () => {
  it("blocks at five upheld strikes across ladders in the last twelve months", () => {
    expect([ACCOUNT_STRIKE_LIMIT, ACCOUNT_STRIKE_MONTHS]).toEqual([5, 12]);
    const reports = [
      report({ ladderId: "spring", resolvedAt: daysAgo(300) }),
      report({ ladderId: "spring", reason: "cheating", resolvedAt: daysAgo(200) }),
      report({ ladderId: "summer", resolvedAt: daysAgo(100) }),
      report({ ladderId: "summer", reason: "abuse", resolvedAt: daysAgo(50) }),
    ];
    expect(getAccountStrikes({ reports, userId: "user", now })).toMatchObject({ count: 4, blocked: false, unblocksAt: null });
    const blocked = getAccountStrikes({
      reports: [...reports, report({ ladderId: "autumn", resolvedAt: daysAgo(1) })],
      userId: "user",
      now,
    });
    expect(blocked).toMatchObject({ count: 5, blocked: true });
    expect(blocked.strikes.map((strike) => strike.ladderId)).toEqual(["spring", "spring", "summer", "summer", "autumn"]);
    expect(blocked.unblocksAt).toEqual(blocked.strikes[0].expiresAt);
  });

  it("stops counting a strike twelve months after it was upheld", () => {
    const old = report({ resolvedAt: new Date("2025-10-24T12:00:00Z") });
    const recent = report({ resolvedAt: new Date("2025-10-26T12:00:00Z") });
    const { strikes } = getAccountStrikes({ reports: [old, recent], userId: "user", now });
    expect(strikes).toHaveLength(1);
    expect(strikes[0].expiresAt).toEqual(new Date("2026-10-26T12:00:00Z"));
    expect(getAccountStrikeWindowStart(now)).toEqual(new Date("2025-10-25T12:00:00Z"));
  });

  it("counts only upheld strike reports against this player", () => {
    const reports = [
      report({ status: "pending" }),
      report({ status: "rejected" }),
      report({ reason: "other" }),
      report({ target: { userIds: ["opponent"] } }),
      report({ target: { userIds: ["opponent", "user"] } }),
      report({ resolvedAt: null }),
      report({ resolvedAt: { toDate: () => daysAgo(3) } }),
    ];
    expect(getAccountStrikes({ reports, userId: "user", now }).count).toBe(2);
  });

  it("forgets strikes upheld before an admin lifted the block", () => {
    const reports = Array.from({ length: 6 }, (_, index) => report({ resolvedAt: daysAgo(40 - index) }));
    expect(getAccountStrikes({ reports, userId: "user", now }).blocked).toBe(true);
    const lifted = getAccountStrikes({ reports, userId: "user", now, liftedAt: daysAgo(20) });
    expect(lifted).toMatchObject({ count: 0, blocked: false });
    const after = getAccountStrikes({
      reports: [...reports, report({ resolvedAt: daysAgo(5) })],
      userId: "user",
      now,
      liftedAt: daysAgo(20),
    });
    expect(after.count).toBe(1);
  });

  it("unblocks when enough of the oldest strikes have expired", () => {
    const reports = [360, 300, 200, 100, 60, 30].map((days) => report({ resolvedAt: daysAgo(days) }));
    const { count, unblocksAt, strikes } = getAccountStrikes({ reports, userId: "user", now });
    expect(count).toBe(6);
    expect(unblocksAt).toEqual(strikes[1].expiresAt);
  });
});
