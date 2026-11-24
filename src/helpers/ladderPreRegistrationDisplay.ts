import { prizeTypes } from "../schema";
import { GENDER_TYPE, LADDER_TYPE } from "../types/ladder";
import type { Ladder } from "../types/ladder";
import type { LadderPreRegistrationDetails } from "../types/ladderPreRegistration";
import { calculateLadderPrizePool } from "./calculateLadderPrizePool";
import { getLadderPrizeBands } from "./ladderPayoutStructure";
import { formatCurrency, formatLadderPayoutPlace } from "./ladderPrizes";
import { getPrizeType } from "./prizeType";

type PoolDetails = Pick<LadderPreRegistrationDetails, "entryFee" | "currencyType" | "maxPlayers">;

type PrizeDetails = PoolDetails & Pick<LadderPreRegistrationDetails, "payoutStructure">;

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

/** "London, GB": the city and country code, or the region when a ladder has no city yet. */
export const getLadderLocation = (
  details: Partial<Pick<Ladder, "city" | "countryCode" | "region">>,
) => {
  const city = details.city?.trim();
  if (!city) return details.region?.trim() ?? "";
  return details.countryCode ? `${city}, ${details.countryCode}` : city;
};

/**
 * "London Men's Singles": the ladder's stored `name`, worked out from its city
 * and title so it always matches the ticket. Falls back to the region, then the
 * title alone, while a ladder has no city.
 */
export const getLadderName = (
  details: Partial<Pick<Ladder, "city" | "region" | "genderType" | "ladderType">>,
) =>
  [details.city?.trim() || details.region?.trim(), getLadderTitle(details)]
    .filter(Boolean)
    .join(" ");

/** "team" in a doubles ladder, "player" in singles. */
export const getLadderEntrantNoun = (ladderType?: string): "team" | "player" =>
  ladderType === LADDER_TYPE.DOUBLES ? "team" : "player";

/** The prize pool at a given size; a full ladder by default. */
export const getLadderPrizePoolAtSize = (
  details: PoolDetails,
  ladderSize = details.maxPlayers,
) =>
  calculateLadderPrizePool({
    entryFee: details.entryFee,
    participantCount: ladderSize,
  });

/** "£40,960" for a cash ladder, "10,240 CP" for a community one. */
export const formatLadderPrizePool = (
  details: PoolDetails,
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
): LadderPrizeTableRow[] =>
  getLadderPrizeBands(
    getLadderPrizePoolAtSize(details),
    details.maxPlayers,
    details.payoutStructure,
  ).map((band) => ({
    ...band,
    label: formatLadderPayoutPlace(band),
  }));
