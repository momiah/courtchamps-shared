import { LADDER_STATUS, LADDER_TYPE } from "../../types/ladder";
import { LADDER_MIN_PLAYOFF_SIZE } from "../ladderPlayoffStructure";
import {
  LADDER_MIN_ENTRANTS_TO_START,
  getLadderEntrantsNeededToStart,
  getLadderSeasonCancelledNotification,
  getLadderSeasonExtendedNotification,
  getLadderSeasonStartStep,
  getLadderSeasonStartedNotification,
  isLadderSeasonStarted,
} from "../ladderSeasonStart";

const NOW = new Date(2026, 2, 1, 12, 0).getTime();
const HOUR_MS = 60 * 60 * 1000;

const preSeason = (overrides = {}) => ({
  status: LADDER_STATUS.REGISTRATION_OPEN,
  seasonStartsAt: new Date(NOW - HOUR_MS),
  ...overrides,
});

describe("isLadderSeasonStarted", () => {
  it("is false while registration is open and the season has not started", () => {
    expect(isLadderSeasonStarted(preSeason())).toBe(false);
  });

  it("is true once the season has started", () => {
    expect(isLadderSeasonStarted(preSeason({ seasonStartedAt: new Date(NOW) }))).toBe(
      true,
    );
  });

  it("is true once registration has closed or the playoffs have begun", () => {
    [
      LADDER_STATUS.REGISTRATION_CLOSED,
      LADDER_STATUS.PLAYOFFS,
      LADDER_STATUS.COMPLETED,
    ].forEach((status) => {
      expect(isLadderSeasonStarted({ status })).toBe(true);
    });
  });

  it("is false for a missing ladder", () => {
    expect(isLadderSeasonStarted(null)).toBe(false);
  });
});

describe("getLadderSeasonStartStep", () => {
  it("needs the smallest playoff size to start", () => {
    expect(LADDER_MIN_ENTRANTS_TO_START).toBe(LADDER_MIN_PLAYOFF_SIZE);
  });

  it("waits until the season start is due", () => {
    const ladder = preSeason({ seasonStartsAt: new Date(NOW + HOUR_MS) });
    expect(getLadderSeasonStartStep(ladder, LADDER_MIN_ENTRANTS_TO_START, NOW)).toBe(
      null,
    );
  });

  it("starts the season with enough entrants", () => {
    expect(
      getLadderSeasonStartStep(preSeason(), LADDER_MIN_ENTRANTS_TO_START, NOW),
    ).toBe("start");
  });

  it("moves the start back the first time there are too few", () => {
    expect(
      getLadderSeasonStartStep(preSeason(), LADDER_MIN_ENTRANTS_TO_START - 1, NOW),
    ).toBe("extend");
  });

  it("cancels when there are still too few after the extension", () => {
    const ladder = preSeason({ seasonExtendedAt: new Date(NOW - 14 * 24 * HOUR_MS) });
    expect(
      getLadderSeasonStartStep(ladder, LADDER_MIN_ENTRANTS_TO_START - 1, NOW),
    ).toBe("cancel");
  });

  it("starts after the extension once there are enough", () => {
    const ladder = preSeason({ seasonExtendedAt: new Date(NOW - 14 * 24 * HOUR_MS) });
    expect(getLadderSeasonStartStep(ladder, LADDER_MIN_ENTRANTS_TO_START, NOW)).toBe(
      "start",
    );
  });

  it("does nothing once the season has started or the ladder is cancelled", () => {
    expect(
      getLadderSeasonStartStep(preSeason({ seasonStartedAt: new Date(NOW) }), 0, NOW),
    ).toBe(null);
    expect(
      getLadderSeasonStartStep(preSeason({ status: LADDER_STATUS.CANCELLED }), 0, NOW),
    ).toBe(null);
  });

  it("reads Firestore timestamps", () => {
    const ladder = preSeason({
      seasonStartsAt: { toDate: () => new Date(NOW - HOUR_MS) },
    });
    expect(getLadderSeasonStartStep(ladder, 0, NOW)).toBe("extend");
  });
});

describe("getLadderEntrantsNeededToStart", () => {
  it("counts down to the minimum and never goes below zero", () => {
    expect(getLadderEntrantsNeededToStart(0)).toBe(LADDER_MIN_ENTRANTS_TO_START);
    expect(getLadderEntrantsNeededToStart(100)).toBe(
      LADDER_MIN_ENTRANTS_TO_START - 100,
    );
    expect(getLadderEntrantsNeededToStart(500)).toBe(0);
  });
});

describe("season start notifications", () => {
  const singles = { name: "London Singles", ladderType: LADDER_TYPE.SINGLES };
  const doubles = { name: "London Doubles", ladderType: LADDER_TYPE.DOUBLES };

  it("announces the season start", () => {
    expect(getLadderSeasonStartedNotification(singles)).toEqual({
      title: "The season has started",
      message:
        "London Singles has started. Post or accept a match to start climbing the ladder.",
    });
  });

  it("says how many more are needed when the start moves back", () => {
    expect(getLadderSeasonExtendedNotification(doubles, 100).message).toBe(
      "London Doubles needs 28 more teams to start, so the season now starts 14 days later. Invite your friends to join. If fewer than 128 teams have joined by then, the ladder will be cancelled and any entry fees refunded in full.",
    );
    expect(getLadderSeasonExtendedNotification(singles, 127).message).toContain(
      "needs 1 more player to start",
    );
  });

  it("explains a cancellation before the season start", () => {
    expect(getLadderSeasonCancelledNotification(singles)).toEqual({
      title: "Ladder cancelled",
      message:
        "London Singles has been cancelled because fewer than 128 players joined before the season start. If you paid an entry fee, it will be refunded to you in full.",
    });
  });
});
