import { COURT_SUBMISSION_STATUS } from "../../types/court";
import {
  buildLadderCourtSubmission,
  isPendingCourtSubmission,
  isPendingLadderCourtSubmission,
  isSelectableLadderCourt,
} from "../courtSubmission";

const submittedAt = new Date("2026-10-04T12:00:00Z");

const submission = (overrides = {}) => ({
  ...buildLadderCourtSubmission({
    submittedBy: "u1",
    submittedByUsername: "player1",
    ladderId: "L1",
    ladderName: "London Ladder",
    submittedAt,
  }),
  ...overrides,
});

describe("buildLadderCourtSubmission", () => {
  it("builds a pending, unreviewed submission for the ladder", () => {
    expect(submission()).toEqual({
      submittedBy: "u1",
      submittedByUsername: "player1",
      ladderId: "L1",
      ladderName: "London Ladder",
      submittedAt,
      status: COURT_SUBMISSION_STATUS.PENDING,
      reviewedBy: null,
      reviewedAt: null,
    });
  });

  it("defaults submittedAt to now", () => {
    const built = buildLadderCourtSubmission({
      submittedBy: "u1",
      submittedByUsername: "player1",
      ladderId: "L1",
      ladderName: "London Ladder",
    });
    expect(built.submittedAt).toBeInstanceOf(Date);
  });
});

describe("isPendingCourtSubmission", () => {
  it("is true only for a pending submission", () => {
    expect(isPendingCourtSubmission({ submission: submission() })).toBe(true);
    expect(
      isPendingCourtSubmission({
        submission: submission({ status: COURT_SUBMISSION_STATUS.APPROVED }),
      }),
    ).toBe(false);
    expect(isPendingCourtSubmission({})).toBe(false);
  });
});

describe("isPendingLadderCourtSubmission", () => {
  it("matches a pending submission for the same ladder only", () => {
    const court = { submission: submission() };
    expect(isPendingLadderCourtSubmission(court, "L1")).toBe(true);
    expect(isPendingLadderCourtSubmission(court, "L2")).toBe(false);
  });

  it("ignores reviewed submissions", () => {
    const court = {
      submission: submission({ status: COURT_SUBMISSION_STATUS.REJECTED }),
    };
    expect(isPendingLadderCourtSubmission(court, "L1")).toBe(false);
  });
});

describe("isSelectableLadderCourt", () => {
  it("accepts a verified court in the ladder", () => {
    expect(isSelectableLadderCourt({ courtId: "c1", verified: true }, ["c1"])).toBe(
      true,
    );
  });

  it("rejects unverified courts and courts outside the ladder", () => {
    expect(
      isSelectableLadderCourt({ courtId: "c1", verified: false }, ["c1"]),
    ).toBe(false);
    expect(isSelectableLadderCourt({ courtId: "c2", verified: true }, ["c1"])).toBe(
      false,
    );
    expect(
      isSelectableLadderCourt({ courtId: "c1", verified: true }, undefined),
    ).toBe(false);
  });
});
