import {
  LADDER_STATUS_SEQUENCE,
  LADDER_STATUS_LABELS,
  getLadderPhaseState,
} from "../ladderStatus";
import { LADDER_STATUS } from "../../types/ladder";

describe("ladder status timeline", () => {
  it("orders the sequence registration -> playoffs -> completed", () => {
    expect(LADDER_STATUS_SEQUENCE).toEqual([
      "registrationOpen",
      "registrationClosed",
      "playoffs",
      "completed",
    ]);
  });

  it("has a display label for every status", () => {
    expect(LADDER_STATUS_LABELS[LADDER_STATUS.REGISTRATION_OPEN]).toBe(
      "Registration Open",
    );
    expect(LADDER_STATUS_LABELS[LADDER_STATUS.CANCELLED]).toBe("Cancelled");
    Object.values(LADDER_STATUS).forEach((status) => {
      expect(typeof LADDER_STATUS_LABELS[status]).toBe("string");
    });
  });

  describe("getLadderPhaseState", () => {
    it("marks earlier statuses completed, the current one active, later upcoming", () => {
      const current = LADDER_STATUS.REGISTRATION_CLOSED;
      expect(getLadderPhaseState(current, LADDER_STATUS.REGISTRATION_OPEN)).toBe(
        "completed",
      );
      expect(
        getLadderPhaseState(current, LADDER_STATUS.REGISTRATION_CLOSED),
      ).toBe("active");
      expect(getLadderPhaseState(current, LADDER_STATUS.PLAYOFFS)).toBe(
        "upcoming",
      );
      expect(getLadderPhaseState(current, LADDER_STATUS.COMPLETED)).toBe(
        "upcoming",
      );
    });

    it("marks all prior phases completed once the ladder is completed", () => {
      const current = LADDER_STATUS.COMPLETED;
      expect(getLadderPhaseState(current, LADDER_STATUS.REGISTRATION_OPEN)).toBe(
        "completed",
      );
      expect(getLadderPhaseState(current, LADDER_STATUS.PLAYOFFS)).toBe(
        "completed",
      );
      expect(getLadderPhaseState(current, LADDER_STATUS.COMPLETED)).toBe(
        "active",
      );
    });

    it("treats an off-sequence status (cancelled) as upcoming", () => {
      expect(
        getLadderPhaseState(LADDER_STATUS.CANCELLED, LADDER_STATUS.PLAYOFFS),
      ).toBe("upcoming");
    });
  });
});
