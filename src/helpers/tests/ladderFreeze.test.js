import { isLadderMatchPlayFrozen, LADDER_FROZEN_MESSAGE } from "../ladderFreeze";

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
