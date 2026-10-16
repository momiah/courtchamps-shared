import {
  checkLadderArrivalReading,
  getLadderArrival,
  getLadderOpponentIds,
  hasArrivedForLadderMatch,
} from "../ladderArrivals";
import { getLadderMatchStartMs } from "../ladderAutoCancel";

const court = { location: { latitude: 51.5, longitude: -0.1 } };
const now = 1_800_000_000_000;
const reading = (over = {}) => ({
  latitude: 51.5,
  longitude: -0.1,
  accuracy: 20,
  timestamp: now - 5000,
  mocked: false,
  ...over,
});

describe("checkLadderArrivalReading", () => {
  it("accepts a fresh, accurate, real reading at the court", () => {
    expect(checkLadderArrivalReading({ reading: reading(), court, nowMs: now })).toEqual({ ok: true, distanceMeters: 0 });
  });

  it.each([
    ["mocked", reading({ mocked: true })],
    ["stale", reading({ timestamp: now - 61_000 })],
    ["inaccurate", reading({ accuracy: 150 })],
    ["inaccurate", reading({ accuracy: null })],
    ["too_far", reading({ latitude: 51.52 })],
  ])("rejects a %s reading", (reason, value) => {
    expect(checkLadderArrivalReading({ reading: value, court, nowMs: now })).toMatchObject({ ok: false, reason });
  });

  it("rejects a court with no location", () => {
    expect(checkLadderArrivalReading({ reading: reading(), court: { location: {} }, nowMs: now })).toEqual({ ok: false, reason: "no_court" });
  });
});

describe("arrivals for a match", () => {
  const match = (verifiedAt) => ({
    matchDate: "20-11-2026",
    matchTime: { start: "18:00" },
    arrivals: { a: { verifiedAt, distanceMeters: 10, accuracyMeters: 15 } },
  });
  const start = getLadderMatchStartMs("20-11-2026", "18:00");

  it("counts an arrival from 30 minutes before the start", () => {
    expect(getLadderArrival(match(new Date(start - 30 * 60_000)), "a")).toBeTruthy();
    expect(hasArrivedForLadderMatch(match(new Date(start + 60_000)), ["b", "a"])).toBe(true);
  });

  it("ignores an arrival from earlier in the day or a player with none", () => {
    expect(getLadderArrival(match(new Date(start - 31 * 60_000)), "a")).toBeNull();
    expect(hasArrivedForLadderMatch(match(new Date(start)), ["b"])).toBe(false);
  });
});

describe("getLadderOpponentIds", () => {
  it("is the other player in singles and the other team in doubles", () => {
    expect(getLadderOpponentIds({ participants: ["a", "b"] }, "a")).toEqual(["b"]);
    expect(
      getLadderOpponentIds({ participants: ["a", "c", "b", "d"], teams: [{ playerIds: ["a", "c"] }, { playerIds: ["b", "d"] }] }, "c"),
    ).toEqual(["b", "d"]);
  });
});
