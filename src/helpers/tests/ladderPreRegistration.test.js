import { isLadderPreRegistrationDue } from "../ladderPreRegistration";
import { LADDER_PRE_REGISTRATION_STATUS } from "../../types/ladderPreRegistration";
import { LADDER_STATUS } from "../../types/ladder";

const now = new Date("2026-11-01T12:00:00Z");
const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

const launched = {
  status: LADDER_PRE_REGISTRATION_STATUS.LAUNCHED,
  ladderId: "ladder-1",
  notifiedAt: null,
};
const openLadder = {
  status: LADDER_STATUS.REGISTRATION_OPEN,
  registrationOpensAt: hourAgo,
};

describe("isLadderPreRegistrationDue", () => {
  it("is due once its ladder's registration has opened", () => {
    expect(isLadderPreRegistrationDue(launched, openLadder, now)).toBe(true);
  });

  it("accepts Firestore timestamps", () => {
    expect(
      isLadderPreRegistrationDue(
        launched,
        { ...openLadder, registrationOpensAt: { toDate: () => hourAgo } },
        now,
      ),
    ).toBe(true);
  });

  it("waits for a ladder created ahead of its registration date", () => {
    expect(
      isLadderPreRegistrationDue(
        launched,
        { ...openLadder, registrationOpensAt: tomorrow },
        now,
      ),
    ).toBe(false);
  });

  it.each([
    ["still open", { status: LADDER_PRE_REGISTRATION_STATUS.OPEN }],
    ["closed", { status: LADDER_PRE_REGISTRATION_STATUS.CLOSED }],
    ["not linked to a ladder", { ladderId: null }],
    ["already notified", { notifiedAt: hourAgo }],
  ])("is not due when %s", (_label, change) => {
    expect(
      isLadderPreRegistrationDue({ ...launched, ...change }, openLadder, now),
    ).toBe(false);
  });

  it("is not due when the ladder has moved past registration", () => {
    expect(
      isLadderPreRegistrationDue(
        launched,
        { ...openLadder, status: LADDER_STATUS.CANCELLED },
        now,
      ),
    ).toBe(false);
  });
});
