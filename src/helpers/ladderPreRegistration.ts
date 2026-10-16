import { GENDER_TYPE, LADDER_TYPE } from "../types/ladder";
import type { Ladder } from "../types/ladder";
import {
  LADDER_PRE_REGISTRATION_KEY,
  LADDER_TIER,
} from "../types/ladderPreRegistration";
import type {
  LadderPreRegistrationKey,
  LadderPreRegistrationOption,
} from "../types/ladderPreRegistration";

export const LADDER_PRE_REGISTRATION_OPTIONS: LadderPreRegistrationOption[] = [
  {
    key: LADDER_PRE_REGISTRATION_KEY.CASH_MENS_SINGLES,
    name: "Men's singles",
    tier: LADDER_TIER.CASH,
    ladderType: LADDER_TYPE.SINGLES,
    genderType: GENDER_TYPE.MENS,
    entryFee: 20,
    currencyType: "GBP",
    maxPlayers: 2048,
  },
  {
    key: LADDER_PRE_REGISTRATION_KEY.CASH_MENS_DOUBLES,
    name: "Men's doubles",
    tier: LADDER_TIER.CASH,
    ladderType: LADDER_TYPE.DOUBLES,
    genderType: GENDER_TYPE.MENS,
    entryFee: 20,
    currencyType: "GBP",
    maxPlayers: 2048,
  },
  {
    key: LADDER_PRE_REGISTRATION_KEY.COMMUNITY_SINGLES,
    name: "Singles",
    tier: LADDER_TIER.COMMUNITY,
    ladderType: LADDER_TYPE.SINGLES,
    genderType: null,
    entryFee: 0,
    currencyType: "GBP",
    maxPlayers: 2048,
  },
  {
    key: LADDER_PRE_REGISTRATION_KEY.COMMUNITY_DOUBLES,
    name: "Doubles",
    tier: LADDER_TIER.COMMUNITY,
    ladderType: LADDER_TYPE.DOUBLES,
    genderType: null,
    entryFee: 0,
    currencyType: "GBP",
    maxPlayers: 2048,
  },
];

export const getLadderPreRegistrationOption = (
  key: string,
): LadderPreRegistrationOption | undefined =>
  LADDER_PRE_REGISTRATION_OPTIONS.find((option) => option.key === key);

export const getLadderPreRegistrationId = (
  userId: string,
  key: LadderPreRegistrationKey,
): string => `${userId}_${key}`;

export const getLadderPreRegistrationKeyForLadder = (
  ladder: Pick<Ladder, "ladderType" | "genderType" | "entryFee">,
): LadderPreRegistrationKey | null => {
  const tier = ladder.entryFee > 0 ? LADDER_TIER.CASH : LADDER_TIER.COMMUNITY;
  const option = LADDER_PRE_REGISTRATION_OPTIONS.find(
    (candidate) =>
      candidate.tier === tier &&
      candidate.ladderType === ladder.ladderType &&
      (candidate.genderType === null ||
        candidate.genderType === ladder.genderType),
  );
  return option?.key ?? null;
};
