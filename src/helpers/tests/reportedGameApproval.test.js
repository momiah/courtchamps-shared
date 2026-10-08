import { DISPUTE_STAGE } from "../../types";
import {
  canApproveDisputedScore,
  canApproveReportedGame,
  getEffectiveApprovalLimit,
  getReporterSideIds,
} from "../reportedGameApproval";

const player = (userId) => ({ userId });

const singles = (reporter) =>
  ({
    reporter,
    team1: { player1: player("a"), player2: null },
    team2: { player1: player("b"), player2: null },
  });

const doubles = (reporter) =>
  ({
    reporter,
    team1: { player1: player("a"), player2: player("a2") },
    team2: { player1: player("b"), player2: player("b2") },
  });

describe("canApproveReportedGame", () => {
  it("lets the opponent approve in singles but not the reporter", () => {
    expect(canApproveReportedGame(singles("a"), "b")).toBe(true);
    expect(canApproveReportedGame(singles("a"), "a")).toBe(false);
  });

  it("lets only the opposing team approve in doubles", () => {
    const game = doubles("a");
    expect(canApproveReportedGame(game, "b")).toBe(true);
    expect(canApproveReportedGame(game, "b2")).toBe(true);
    expect(canApproveReportedGame(game, "a")).toBe(false);
  });

  it("does not let the reporter's own partner approve", () => {
    expect(canApproveReportedGame(doubles("a"), "a2")).toBe(false);
    expect(canApproveReportedGame(doubles("a2"), "a")).toBe(false);
    expect(canApproveReportedGame(doubles("b"), "b2")).toBe(false);
  });

  it("works whichever team reported", () => {
    expect(canApproveReportedGame(doubles("b2"), "a")).toBe(true);
    expect(canApproveReportedGame(doubles("b2"), "a2")).toBe(true);
  });

  it("does not let anyone outside the game approve", () => {
    expect(canApproveReportedGame(doubles("a"), "stranger")).toBe(false);
    expect(canApproveReportedGame(doubles("a"), undefined)).toBe(false);
    expect(canApproveReportedGame(null, "b")).toBe(false);
  });
});

describe("getEffectiveApprovalLimit", () => {
  it("caps singles at one approval whatever the competition limit", () => {
    expect(getEffectiveApprovalLimit(singles("a"), 2)).toBe(1);
    expect(getEffectiveApprovalLimit(singles("a"), undefined)).toBe(1);
  });

  it("uses the competition limit for doubles, defaulting to one", () => {
    expect(getEffectiveApprovalLimit(doubles("a"), 2)).toBe(2);
    expect(getEffectiveApprovalLimit(doubles("a"), 1)).toBe(1);
    expect(getEffectiveApprovalLimit(doubles("a"), undefined)).toBe(1);
    expect(getEffectiveApprovalLimit(doubles("a"), 0)).toBe(1);
  });
});

const dispute = (originalGame, overrides = {}) => ({
  originalGame,
  openedBy: "b",
  stage: DISPUTE_STAGE.UNDER_REVIEW,
  ...overrides,
});

describe("getReporterSideIds", () => {
  it("returns only the reporter in singles", () => {
    expect(getReporterSideIds(singles("a"))).toEqual(["a"]);
    expect(getReporterSideIds(singles("b"))).toEqual(["b"]);
  });

  it("returns both teammates in doubles, whichever of them reported", () => {
    expect(getReporterSideIds(doubles("a"))).toEqual(["a", "a2"]);
    expect(getReporterSideIds(doubles("a2"))).toEqual(["a", "a2"]);
    expect(getReporterSideIds(doubles("b2"))).toEqual(["b", "b2"]);
  });

  it("returns nothing when the reporter is missing or not in the game", () => {
    expect(getReporterSideIds(singles(""))).toEqual([]);
    expect(getReporterSideIds(singles("stranger"))).toEqual([]);
    expect(getReporterSideIds(null)).toEqual([]);
    expect(getReporterSideIds(undefined)).toEqual([]);
  });
});

describe("canApproveDisputedScore", () => {
  it("allows the reporter in singles", () => {
    expect(canApproveDisputedScore(dispute(singles("a")), "a")).toBe(true);
  });

  it("allows both teammates of the reporter in doubles", () => {
    const d = dispute(doubles("a"));
    expect(canApproveDisputedScore(d, "a")).toBe(true);
    expect(canApproveDisputedScore(d, "a2")).toBe(true);
  });

  it("denies the disputing side and outsiders", () => {
    const d = dispute(doubles("a"));
    expect(canApproveDisputedScore(d, "b")).toBe(false);
    expect(canApproveDisputedScore(d, "b2")).toBe(false);
    expect(canApproveDisputedScore(d, "stranger")).toBe(false);
    expect(canApproveDisputedScore(d, undefined)).toBe(false);
  });

  it("denies the opener even if they are somehow on the reporter side", () => {
    expect(
      canApproveDisputedScore(dispute(singles("a"), { openedBy: "a" }), "a"),
    ).toBe(false);
  });

  it("is available while evidence is requested but not once resolved", () => {
    expect(
      canApproveDisputedScore(
        dispute(singles("a"), { stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED }),
        "a",
      ),
    ).toBe(true);
    expect(
      canApproveDisputedScore(
        dispute(singles("a"), { stage: DISPUTE_STAGE.RESOLVED }),
        "a",
      ),
    ).toBe(false);
  });
});
