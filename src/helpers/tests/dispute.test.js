import {
  DISPUTE_STAGE,
  getDisputeEvidenceBlocker,
  getDisputeEvidenceDueAt,
  isDisputeEvidenceOverdue,
  hasDisputeEvidence,
  isPlayerEvidenceEvent,
  gameVideoDocId,
} from "../../types/dispute";

const positions = {
  team1: [{ userId: "a" }, null],
  team2: [{ userId: "b" }, null],
};
const emptyPositions = { team1: [null, null], team2: [null, null] };

describe("getDisputeEvidenceBlocker", () => {
  it("blocks when there is neither a note nor a video", () => {
    expect(getDisputeEvidenceBlocker({ note: "  ", hasVideo: false })).toBe(
      "empty",
    );
  });

  it("allows a note on its own", () => {
    expect(getDisputeEvidenceBlocker({ note: "It was out", hasVideo: false })).toBeNull();
  });

  it("requires court positions with a video", () => {
    expect(
      getDisputeEvidenceBlocker({ hasVideo: true, courtPositions: emptyPositions }),
    ).toBe("court_positions");
  });

  it("allows a video with court positions and no note", () => {
    expect(
      getDisputeEvidenceBlocker({ hasVideo: true, courtPositions: positions }),
    ).toBeNull();
  });
});

describe("isDisputeEvidenceOverdue", () => {
  const requestedAt = Date.UTC(2026, 8, 23, 21, 10);
  const due = getDisputeEvidenceDueAt(requestedAt);

  it("sets the deadline 48 hours after the request", () => {
    expect(due.getTime() - requestedAt).toBe(48 * 60 * 60 * 1000);
  });

  it("is overdue once the deadline passes with the request still open", () => {
    const dispute = {
      stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
      evidenceDueAt: due,
    };
    expect(isDisputeEvidenceOverdue(dispute, due.getTime() - 1)).toBe(false);
    expect(isDisputeEvidenceOverdue(dispute, due.getTime())).toBe(true);
  });

  it("accepts Firestore Timestamps", () => {
    const dispute = {
      stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
      evidenceDueAt: { toMillis: () => due.getTime() },
    };
    expect(isDisputeEvidenceOverdue(dispute, due.getTime() + 1)).toBe(true);
  });

  it("is never overdue once someone has responded or it is resolved", () => {
    expect(
      isDisputeEvidenceOverdue(
        { stage: DISPUTE_STAGE.UNDER_REVIEW, evidenceDueAt: due },
        due.getTime() + 1,
      ),
    ).toBe(false);
    expect(
      isDisputeEvidenceOverdue(
        { stage: DISPUTE_STAGE.RESOLVED, evidenceDueAt: due },
        due.getTime() + 1,
      ),
    ).toBe(false);
  });

  it("is not overdue without a deadline", () => {
    expect(
      isDisputeEvidenceOverdue(
        { stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED, evidenceDueAt: null },
        requestedAt,
      ),
    ).toBe(false);
  });
});

describe("hasDisputeEvidence / gameVideoDocId", () => {
  it("counts a note or a video as evidence", () => {
    expect(hasDisputeEvidence({ note: "x" })).toBe(true);
    expect(hasDisputeEvidence({ videoId: "g_u" })).toBe(true);
    expect(hasDisputeEvidence({ courtPositions: positions })).toBe(false);
  });

  it("only counts player phases as player evidence", () => {
    expect(isPlayerEvidenceEvent({ type: "opened", note: "x" })).toBe(true);
    expect(isPlayerEvidenceEvent({ type: "evidence_submitted", videoId: "v" })).toBe(true);
    expect(isPlayerEvidenceEvent({ type: "evidence_requested", note: "x" })).toBe(false);
    expect(isPlayerEvidenceEvent({ type: "evidence_submitted" })).toBe(false);
  });

  it("matches the gameVideos doc id format", () => {
    expect(gameVideoDocId("g1", "u1")).toBe("g1_u1");
  });
});
