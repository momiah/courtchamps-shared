import {
  LADDER_MATCH_EXTENSION_DAYS,
  buildLadderMatchExtension,
  getLadderMatchChangeOption,
  getLadderMatchExtensionDaysLeft,
  validateLadderMatchReschedule,
} from "../ladderMatchChanges";

const DAY = 24 * 60 * 60 * 1000;
const reported = { gameId: "g1", result: { winner: { team: "Team 1" } } };
const shell = { gameId: "g2", result: null };
const match = (over = {}) => ({ matchStatus: "accepted", games: [shell], ...over });

describe("getLadderMatchChangeOption", () => {
  it("offers a reschedule before any game is reported", () => {
    expect(getLadderMatchChangeOption(match())).toBe("reschedule");
  });

  it("offers an extension once a game is reported", () => {
    expect(getLadderMatchChangeOption(match({ games: [reported, shell] }))).toBe("extension");
  });

  it("shows the extension as used once taken", () => {
    const extension = { requestedBy: "u1", requestedAt: new Date(), expiresAt: new Date() };
    expect(getLadderMatchChangeOption(match({ games: [reported], extension }))).toBe("extended");
  });

  it("offers nothing outside an accepted match or during a no-show or walkover", () => {
    expect(getLadderMatchChangeOption(match({ matchStatus: "posted" }))).toBeNull();
    expect(getLadderMatchChangeOption(match({ matchStatus: "completed" }))).toBeNull();
    expect(getLadderMatchChangeOption(match({ noShowReported: true }))).toBeNull();
    expect(getLadderMatchChangeOption(match({ walkover: true }))).toBeNull();
  });
});

describe("buildLadderMatchExtension", () => {
  const now = new Date("2026-10-11T10:00:00Z");

  it("runs for 7 days from the request", () => {
    const extension = buildLadderMatchExtension({ userId: "u1", now });
    expect(LADDER_MATCH_EXTENSION_DAYS).toBe(7);
    expect(extension).toEqual({
      requestedBy: "u1",
      requestedAt: now,
      expiresAt: new Date(now.getTime() + 7 * DAY),
    });
  });

  it("stops at a playoff deadline that comes first", () => {
    const capAt = new Date(now.getTime() + 3 * DAY);
    expect(buildLadderMatchExtension({ userId: "u1", now, capAt }).expiresAt).toEqual(capAt);
  });

  it("ignores a cap later than 7 days", () => {
    const capAt = new Date(now.getTime() + 9 * DAY);
    expect(buildLadderMatchExtension({ userId: "u1", now, capAt }).expiresAt).toEqual(
      new Date(now.getTime() + 7 * DAY),
    );
  });
});

describe("validateLadderMatchReschedule", () => {
  const nowMs = new Date(2026, 9, 11, 12, 0).getTime();
  const time = { start: "18:00" };

  it("accepts a future time before the deadline", () => {
    expect(
      validateLadderMatchReschedule({
        matchDate: "12-10-2026",
        matchTime: time,
        nowMs,
        deadlineMs: new Date(2026, 9, 20).getTime(),
      }),
    ).toBeNull();
  });

  it("rejects a past time", () => {
    expect(
      validateLadderMatchReschedule({ matchDate: "11-10-2026", matchTime: { start: "09:00" }, nowMs }),
    ).toBe("past");
  });

  it("rejects a time after the deadline", () => {
    expect(
      validateLadderMatchReschedule({
        matchDate: "21-10-2026",
        matchTime: time,
        nowMs,
        deadlineMs: new Date(2026, 9, 20).getTime(),
      }),
    ).toBe("after_deadline");
  });

  it("rejects a malformed date", () => {
    expect(validateLadderMatchReschedule({ matchDate: "", matchTime: time, nowMs })).toBe("invalid");
  });
});

describe("getLadderMatchExtensionDaysLeft", () => {
  const nowMs = new Date("2026-10-11T10:00:00Z").getTime();

  it("rounds part days up and stops at 0", () => {
    expect(getLadderMatchExtensionDaysLeft(nowMs + 7 * DAY, nowMs)).toBe(7);
    expect(getLadderMatchExtensionDaysLeft(nowMs + 1, nowMs)).toBe(1);
    expect(getLadderMatchExtensionDaysLeft(nowMs - DAY, nowMs)).toBe(0);
  });
});
