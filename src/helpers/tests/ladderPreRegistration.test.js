import {
  LADDER_PRE_REGISTRATION_OPTIONS,
  getLadderPreRegistrationOption,
  getLadderPreRegistrationId,
  getLadderPreRegistrationKeyForLadder,
} from "../ladderPreRegistration";
import { LADDER_PRE_REGISTRATION_KEY } from "../../types/ladderPreRegistration";
import { calculateLadderPrizePool } from "../calculateLadderPrizePool";

describe("ladder pre-registration", () => {
  it("offers cash men's singles and doubles and free community singles and doubles", () => {
    expect(
      LADDER_PRE_REGISTRATION_OPTIONS.map(({ key, entryFee, maxPlayers }) => [
        key,
        entryFee,
        maxPlayers,
      ]),
    ).toEqual([
      ["cash-mens-singles", 20, 2048],
      ["cash-mens-doubles", 20, 2048],
      ["community-singles", 0, 2048],
      ["community-doubles", 0, 2048],
    ]);
  });

  it("advertises a £40,960 cash ladder pot before the platform fee", () => {
    const option = getLadderPreRegistrationOption("cash-mens-singles");
    const { grossCash } = calculateLadderPrizePool({
      entryFee: option.entryFee,
      participantCount: option.maxPlayers,
    });
    expect(grossCash).toBe(40960);
  });

  it("keys a pre-registration per user and ladder", () => {
    expect(
      getLadderPreRegistrationId("u1", LADDER_PRE_REGISTRATION_KEY.CASH_MENS_DOUBLES),
    ).toBe("u1_cash-mens-doubles");
  });

  it.each([
    [{ ladderType: "Singles", genderType: "Mens", entryFee: 20 }, "cash-mens-singles"],
    [{ ladderType: "Doubles", genderType: "Mens", entryFee: 20 }, "cash-mens-doubles"],
    [{ ladderType: "Singles", genderType: "Mens", entryFee: 0 }, "community-singles"],
    [{ ladderType: "Doubles", genderType: "Mixed", entryFee: 0 }, "community-doubles"],
    [{ ladderType: "Singles", genderType: "Womens", entryFee: 20 }, null],
  ])("matches a released ladder %o to %s", (ladder, key) => {
    expect(getLadderPreRegistrationKeyForLadder(ladder)).toBe(key);
  });
});
