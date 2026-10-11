import {
  isLadderMatchPlayFrozen,
  isPlayoffLadderMatch,
  LADDER_FROZEN_MESSAGE,
} from "../ladderFreeze";

describe("isLadderMatchPlayFrozen", () => {
  it("allows play while registration is open or closed", () => {
    expect(isLadderMatchPlayFrozen("registrationOpen")).toBe(false);
    expect(isLadderMatchPlayFrozen("registrationClosed")).toBe(false);
  });

  it("freezes play once playoffs start, complete or are cancelled", () => {
    expect(isLadderMatchPlayFrozen("playoffs")).toBe(true);
    expect(isLadderMatchPlayFrozen("completed")).toBe(true);
    expect(isLadderMatchPlayFrozen("cancelled")).toBe(true);
  });

  it("keeps playoff matches playable during playoffs", () => {
    const playoffMatch = { playoffTieId: "r1-s0" };
    expect(isLadderMatchPlayFrozen("playoffs", playoffMatch)).toBe(false);
    expect(isLadderMatchPlayFrozen("playoffs", { playoffTieId: null })).toBe(true);
    expect(isLadderMatchPlayFrozen("playoffs", {})).toBe(true);
  });

  it("freezes playoff matches once the ladder is completed or cancelled", () => {
    const playoffMatch = { playoffTieId: "r1-s0" };
    expect(isLadderMatchPlayFrozen("completed", playoffMatch)).toBe(true);
    expect(isLadderMatchPlayFrozen("cancelled", playoffMatch)).toBe(true);
  });

  it("identifies playoff matches", () => {
    expect(isPlayoffLadderMatch({ playoffTieId: "r2-s1" })).toBe(true);
    expect(isPlayoffLadderMatch({})).toBe(false);
    expect(isPlayoffLadderMatch(null)).toBe(false);
  });

  it("treats a ladder with no status as open", () => {
    expect(isLadderMatchPlayFrozen(undefined)).toBe(false);
    expect(isLadderMatchPlayFrozen(null)).toBe(false);
  });

  it("exposes the user-facing disclaimer", () => {
    expect(LADDER_FROZEN_MESSAGE).toBe(
      "This game can no longer be actioned as playoffs has started",
    );
  });
});
