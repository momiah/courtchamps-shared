import {
  LADDER_ELIGIBILITY_MAX_ACCURACY_METERS,
  LADDER_ELIGIBILITY_MAX_AGE_MS,
  LADDER_ELIGIBILITY_RADIUS_MILES,
  canPreRegisterForLadder,
  checkLadderEligibilityReading,
  getLadderEligibilityId,
  getLadderEligibilityMessage,
  getLadderEligibilityRadiusMiles,
  getLadderEligibilityRule,
  requiresLadderLocationCheck,
} from "../ladderEligibility";

const now = 1_800_000_000_000;
const barnet = { courtId: "barnet", location: { latitude: 51.6252, longitude: -0.1517 } };
const harrow = { courtId: "harrow", location: { latitude: 51.5806, longitude: -0.3420 } };
const noCoords = { courtId: "none", location: { latitude: null, longitude: null } };
const reading = (over = {}) => ({
  latitude: 51.6,
  longitude: -0.33,
  accuracy: 1000,
  timestamp: now - 30_000,
  mocked: false,
  ...over,
});
const check = (over = {}, courts = [barnet, harrow], radiusMiles = LADDER_ELIGIBILITY_RADIUS_MILES) =>
  checkLadderEligibilityReading({ reading: reading(over), courts, radiusMiles, nowMs: now });

describe("checkLadderEligibilityReading", () => {
  it("passes within the radius and names the nearest court", () => {
    const result = check();
    expect(result.ok).toBe(true);
    expect(result.nearestCourtId).toBe("harrow");
    expect(result.distanceMiles).toBeLessThan(2);
  });

  it("measures from the nearest court, not a centre point", () => {
    const pottersBar = { latitude: 51.698, longitude: -0.18 };
    expect(check(pottersBar, [barnet, harrow], 8)).toEqual(
      expect.objectContaining({ ok: true, nearestCourtId: "barnet" }),
    );
    expect(check(pottersBar, [harrow], 8)).toEqual(
      expect.objectContaining({ ok: false, reason: "too_far", radiusMiles: 8 }),
    );
  });

  it("refuses a reading from another country with the distance", () => {
    const bangkok = { latitude: 13.7563, longitude: 100.5018 };
    const result = check(bangkok);
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "too_far" }));
    expect(result.distanceMiles).toBeGreaterThan(5000);
  });

  it("refuses mocked, stale and inaccurate readings", () => {
    expect(check({ mocked: true }).reason).toBe("mocked");
    expect(check({ timestamp: now - LADDER_ELIGIBILITY_MAX_AGE_MS - 1 }).reason).toBe("stale");
    expect(check({ timestamp: Number.NaN }).reason).toBe("stale");
    expect(check({ accuracy: LADDER_ELIGIBILITY_MAX_ACCURACY_METERS + 1 }).reason).toBe("inaccurate");
    expect(check({ accuracy: null }).reason).toBe("inaccurate");
  });

  it("ignores courts without coordinates and refuses when none have them", () => {
    expect(check({}, [noCoords, harrow]).nearestCourtId).toBe("harrow");
    expect(check({}, [noCoords]).reason).toBe("no_courts");
    expect(check({}, []).reason).toBe("no_courts");
  });
});

describe("ladder radius and scope", () => {
  it("only checks free ladders", () => {
    expect(requiresLadderLocationCheck({ entryFee: 0 })).toBe(true);
    expect(requiresLadderLocationCheck({})).toBe(true);
    expect(requiresLadderLocationCheck({ entryFee: 10 })).toBe(false);
  });

  it("uses the ladder's radius or the default", () => {
    expect(getLadderEligibilityRadiusMiles({ eligibilityRadiusMiles: 25 })).toBe(25);
    expect(getLadderEligibilityRadiusMiles({})).toBe(LADDER_ELIGIBILITY_RADIUS_MILES);
    expect(getLadderEligibilityRadiusMiles({ eligibilityRadiusMiles: 0 })).toBe(LADDER_ELIGIBILITY_RADIUS_MILES);
  });

  it("states the rule for free ladders only", () => {
    expect(getLadderEligibilityRule({ entryFee: 0 })).toBe(
      `To join, you'll need to be within ${LADDER_ELIGIBILITY_RADIUS_MILES} miles of the ladder's courts.`,
    );
    expect(getLadderEligibilityRule({ entryFee: 15 })).toBeNull();
  });

  it("builds the eligibility document id", () => {
    expect(getLadderEligibilityId("ladder1", "user1")).toBe("ladder1_user1");
  });
});

describe("getLadderEligibilityMessage", () => {
  it("tells a far-away user the radius and how far they are", () => {
    expect(
      getLadderEligibilityMessage({ ok: false, reason: "too_far", distanceMiles: 5912.4, radiusMiles: 40 }),
    ).toBe("This free ladder is for players within 40 miles of its courts. You're 5,912 miles from the nearest one.");
    expect(
      getLadderEligibilityMessage({ ok: false, reason: "too_far", distanceMiles: 1, radiusMiles: 0.5 }),
    ).toBe("This free ladder is for players within 0.5 miles of its courts. You're 1 mile from the nearest one.");
  });

  it("has a message for every other reason", () => {
    for (const reason of ["no_courts", "mocked", "stale", "inaccurate"]) {
      expect(getLadderEligibilityMessage({ ok: false, reason })).toEqual(expect.any(String));
    }
  });
});

describe("canPreRegisterForLadder", () => {
  const preRegistration = { countryCode: "GB" };
  it("allows users whose profile country is the ladder's", () => {
    expect(canPreRegisterForLadder({ location: { countryCode: "GB" } }, preRegistration)).toBe(true);
  });
  it("refuses other countries, missing countries and signed-out users", () => {
    expect(canPreRegisterForLadder({ location: { countryCode: "TH" } }, preRegistration)).toBe(false);
    expect(canPreRegisterForLadder({ location: { countryCode: "" } }, preRegistration)).toBe(false);
    expect(canPreRegisterForLadder(null, preRegistration)).toBe(false);
  });
});
