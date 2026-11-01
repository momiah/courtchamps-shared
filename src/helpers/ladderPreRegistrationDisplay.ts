import { prizeTypes } from "../schema";
import { GENDER_TYPE, LADDER_TYPE } from "../types/ladder";
import type { Ladder } from "../types/ladder";
import type { LadderPreRegistrationDetails } from "../types/ladderPreRegistration";
import { calculateLadderPrizePool } from "./calculateLadderPrizePool";
import { getLadderPayouts } from "./ladderPayoutStructure";
import { formatCurrency, ordinalPlace } from "./ladderPrizes";
import { getPrizeType } from "./prizeType";

type PrizeDetails = Pick<
  LadderPreRegistrationDetails,
  "entryFee" | "currencyType" | "maxPlayers"
>;

export const COURT_CHAMPS_SITE_URL = "https://courtchamps.com";

/** The page a shared pre-registration link lands on. */
export const getLadderPreRegistrationJoinPath = (preRegistrationId: string) =>
  `/join/ladder-pre-registration/${encodeURIComponent(preRegistrationId)}`;

/** The link to share: it shows a rich preview card, then opens the join page. */
export const getLadderPreRegistrationShareUrl = (preRegistrationId: string) =>
  `${COURT_CHAMPS_SITE_URL}/preview/ladder-pre-registration/${encodeURIComponent(preRegistrationId)}`;

export const isCashLadder = (details: Pick<PrizeDetails, "entryFee">) =>
  getPrizeType(details.entryFee) === prizeTypes.CASH;

const LADDER_GENDER_LABELS: Record<string, string> = {
  [GENDER_TYPE.MENS]: "Men's",
  [GENDER_TYPE.WOMENS]: "Women's",
  [GENDER_TYPE.MIXED]: "Mixed",
};

/** "Men's Doubles", "Women's Singles", "Mixed Doubles". */
export const getLadderTitle = (
  details: Partial<Pick<Ladder, "genderType" | "ladderType">>,
) =>
  [
    LADDER_GENDER_LABELS[details.genderType ?? ""] ?? details.genderType,
    details.ladderType,
  ]
    .filter(Boolean)
    .join(" ");

/** "team" in a doubles ladder, "player" in singles. */
export const getLadderEntrantNoun = (ladderType?: string): "team" | "player" =>
  ladderType === LADDER_TYPE.DOUBLES ? "team" : "player";

/** The prize pool at a given size; a full ladder by default. */
export const getLadderPrizePoolAtSize = (
  details: PrizeDetails,
  ladderSize = details.maxPlayers,
) =>
  calculateLadderPrizePool({
    entryFee: details.entryFee,
    participantCount: ladderSize,
  });

/** "£40,960" for a cash ladder, "10,240 CP" for a community one. */
export const formatLadderPrizePool = (
  details: PrizeDetails,
  ladderSize = details.maxPlayers,
) => {
  const { cash, xp } = getLadderPrizePoolAtSize(details, ladderSize);
  return isCashLadder(details)
    ? formatCurrency(cash, details.currencyType)
    : `${xp.toLocaleString("en-GB")} CP`;
};

export interface LadderPrizeTableRow {
  fromPlace: number;
  toPlace: number;
  label: string;
  cash: number;
  cp: number;
}

/** Each finishing band's cash and CP for a full ladder. */
export const getFullLadderPrizeTable = (
  details: PrizeDetails,
): LadderPrizeTableRow[] => {
  const { cash, xp } = getLadderPrizePoolAtSize(details);
  const cashPayouts = getLadderPayouts(cash, details.maxPlayers);
  return getLadderPayouts(xp, details.maxPlayers).map((cpPayout, index) => ({
    fromPlace: cpPayout.fromPlace,
    toPlace: cpPayout.toPlace,
    label:
      cpPayout.places === 1
        ? ordinalPlace(cpPayout.fromPlace)
        : `${ordinalPlace(cpPayout.fromPlace)}–${ordinalPlace(cpPayout.toPlace)}`,
    cash: cashPayouts[index]?.each ?? 0,
    cp: cpPayout.each,
  }));
};
