import { PAYOUT_STRUCTURE } from "../types/ladder";
import type { PayoutStructure } from "../types/ladder";
import { ACCOUNT_STRIKE_LIMIT, ACCOUNT_STRIKE_MONTHS } from "../helpers/accountStrikes";
import {
  LADDER_PLAYOFF_START_DAYS,
  LADDER_REGISTRATION_CLOSE_DAYS,
  LADDER_SEASON_EXTENSION_DAYS,
  LADDER_SEASON_START_DAYS,
} from "../helpers/ladderDates";
import { LADDER_PAYOUT_TABLES } from "../helpers/ladderPayoutStructure";
import type { LadderPayoutBand } from "../helpers/ladderPayoutStructure";
import { LADDER_PLAYOFF_SIZES } from "../helpers/ladderPlayoffStructure";
import { ordinalPlace } from "../helpers/ladderPrizes";
import { LADDER_MIN_ENTRANTS_TO_START } from "../helpers/ladderSeasonStart";
import { numberLegalSections } from "./blocks";
import type { LegalSection, LegalTable } from "./blocks";
import {
  COURT_CHAMPS_CONTACT_EMAIL,
  COURT_CHAMPS_LEGAL_NAME,
  GOVERNING_LAW,
  SUPPORT_REPLY_HOURS,
} from "./company";
import { LADDER_CANCELLED_REFUND, PLATFORM_FEE_PERCENT } from "./disclaimers";

export const LADDER_TERMS_INTRO =
  "Please read these terms carefully before joining a ladder. Joining a ladder means you accept the terms below.";

export const PAYOUT_STRUCTURE_NAMES: Record<PayoutStructure, string> = {
  [PAYOUT_STRUCTURE.LINEAR]: "Linear",
  [PAYOUT_STRUCTURE.PROGRESSIVE]: "Progressive",
};

const formatCount = (count: number) => count.toLocaleString("en-GB");

const formatShare = (share: number) => `${parseFloat((share * 100).toFixed(1))}%`;

const bandKey = (band: LadderPayoutBand) => `${band.fromPlace}-${band.toPlace}`;

const bandLabel = (band: LadderPayoutBand) =>
  band.fromPlace === band.toPlace
    ? ordinalPlace(band.fromPlace)
    : `${ordinalPlace(band.fromPlace)}–${ordinalPlace(band.toPlace)} (shared)`;

/**
 * One payout structure's cash table: a column per ladder size (sizes that pay
 * the same are merged, e.g. "128–511") and a row per place or shared band.
 */
export const getLadderPayoutTable = (payoutStructure: PayoutStructure): LegalTable => {
  const cash = LADDER_PAYOUT_TABLES[payoutStructure].cash;
  const sizes = [...LADDER_PLAYOFF_SIZES].sort((a, b) => a - b);
  const groups: { sizes: number[]; bands: LadderPayoutBand[] }[] = [];
  sizes.forEach((size) => {
    const bands = cash[size] ?? [];
    const last = groups[groups.length - 1];
    if (last && JSON.stringify(last.bands) === JSON.stringify(bands)) {
      last.sizes.push(size);
    } else {
      groups.push({ sizes: [size], bands });
    }
  });
  const columnLabel = (index: number) => {
    const next = groups[index + 1];
    const from = groups[index].sizes[0];
    return next ? `${formatCount(from)}–${formatCount(next.sizes[0] - 1)}` : `${formatCount(from)}+`;
  };
  const rowBands = new Map<string, LadderPayoutBand>();
  groups.forEach((group) => group.bands.forEach((band) => rowBands.set(bandKey(band), band)));
  const rows = [...rowBands.values()].sort((a, b) => a.fromPlace - b.fromPlace);
  return {
    id: `ladder-payouts-${payoutStructure}`,
    columns: ["Place", ...groups.map((_, index) => columnLabel(index))],
    rows: rows.map((row) => [
      bandLabel(row),
      ...groups.map((group) => {
        const band = group.bands.find((candidate) => bandKey(candidate) === bandKey(row));
        return band ? formatShare(band.share) : "–";
      }),
    ]),
  };
};

const payoutTableBlocks = (payoutStructure: PayoutStructure) => [
  `${PAYOUT_STRUCTURE_NAMES[payoutStructure]} structure (cash):`,
  getLadderPayoutTable(payoutStructure),
];

export const LADDER_TERMS: LegalSection[] = numberLegalSections([
  {
    id: "who-we-are",
    title: "Who we are",
    body: [
      `Ladders are run by ${COURT_CHAMPS_LEGAL_NAME}. Contact: ${COURT_CHAMPS_CONTACT_EMAIL}.`,
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: [
      "You must have a valid Court Champs account to enter a ladder, and you may hold only one Court Champs account.",
      [
        "You must be 18 or over to enter a paid ladder.",
        "You must be resident in the United Kingdom, and your profile country must match the ladder's.",
        "You confirm your date of birth when you create your account.",
      ],
      "By joining you confirm the information on your account is accurate.",
      "Before any cash prize is paid, we will verify your identity and age. If you cannot be verified as 18 or over, your entry is cancelled and refunded, and no prize is paid.",
    ],
  },
  {
    id: "entry",
    title: "Entry & registration",
    body: [
      "A place on a ladder is confirmed once your registration is accepted and, for paid ladders, once your entry fee has been successfully processed.",
      "Each ladder shows, before you pay:",
      [
        `the entry fee and the ${PLATFORM_FEE_PERCENT} platform fee`,
        "the registration closing date and time",
        "the season start date and the playoff start date",
        "the payout table for each ladder size",
      ],
      `The season starts ${LADDER_SEASON_START_DAYS} days after registration opens. If too few players have joined by then, the start may move back once, by ${LADDER_SEASON_EXTENSION_DAYS} days.`,
      `Registration closes ${LADDER_REGISTRATION_CLOSE_DAYS} days after the season starts. The playoffs start ${LADDER_PLAYOFF_START_DAYS} days after the season starts.`,
    ],
  },
  {
    id: "entry-fees",
    title: "Entry fees & service charge",
    body: [
      `Paid ladders require the stated entry fee plus a ${PLATFORM_FEE_PERCENT} platform fee, which is added on top and shown at checkout.`,
      "The full entry fee goes into the prize pool. The platform fee covers platform costs.",
    ],
  },
  {
    id: "prizes",
    title: "Prizes & payouts",
    body: [
      "The playoff and payout structure is tiered and scales with the ladder's actual size at registration close, not its maximum capacity.",
      "The payout tables below show each place's share of the prize pot. Where a band covers several places (for example 5th–8th), its share is split equally between those places.",
      `Each ladder uses either the ${PAYOUT_STRUCTURE_NAMES[PAYOUT_STRUCTURE.LINEAR]} or the ${PAYOUT_STRUCTURE_NAMES[PAYOUT_STRUCTURE.PROGRESSIVE]} structure, and says which before you pay.`,
      ...payoutTableBlocks(PAYOUT_STRUCTURE.LINEAR),
      ...payoutTableBlocks(PAYOUT_STRUCTURE.PROGRESSIVE),
      "Prizes are distributed to qualifying finishers once the ladder completes and results are finalised.",
      "To receive a prize you must provide valid payout details and pass the identity check described under Eligibility.",
      "Everyone in the money is paid for the round they reached, including a player or team who loses on a walkover.",
      "In doubles, a team's prize is split equally between both players.",
      "If a playoff tie is void because neither side played:",
      [
        "Both sides are treated as losing that round and are paid the lowest prize that round guarantees.",
        "Nobody moves up a place.",
        "Prizes nobody won go into the Unclaimed Prize Pot. Its cash is split equally between every other player or team who won cash, and its CP between every other player or team who won CP.",
        "If there is nobody else to share it with, it will be retained by Court Champs, as no eligible player is left to receive it.",
      ],
      "Prizes are paid in whole units of the ladder's currency and whole CP, except that a doubles share may include half a unit. Any amount left over from rounding goes to the highest finisher.",
      "If your account is deleted before prizes are paid, your prize is forfeited and will be retained by Court Champs, as there is no account left to pay it to.",
    ],
  },
  {
    id: "rules",
    title: "The Rules",
    body: [
      "Every ladder is played under the ladder Rules, which form part of these terms.",
      [
        "By joining you agree to play your matches as the Rules describe.",
        "That includes checking in, reporting results and rescheduling.",
        "It also covers playoff matches and when inactive matches expire.",
      ],
    ],
  },
  {
    id: "fair-play",
    title: "Fair play",
    body: [
      "Results must be reported honestly and confirmed by both players.",
      "Any manipulation of scores, collusion, or abusive conduct may result in removal from the ladder without refund and further account action.",
    ],
  },
  {
    id: "reports",
    title: "Reports, strikes & disqualification",
    body: [
      "All no-show and misconduct reports are reviewed by an admin. Reporting a no-show records your location at the court, and arrivals at the court are recorded during check-in.",
      "Reports still undecided 1 day before the playoffs start are closed as set out in the Rules.",
      "An upheld no-show awards the match to the player who showed up as a walkover:",
      [
        "They gain up to 50 CP, transferred from the no-show and never taking them below zero.",
        "No games, points or medals are awarded.",
      ],
      "Upheld reports add a strike against the reported player. Strikes are counted per ladder.",
      "Reaching the limit for any reason disqualifies that player from the ladder:",
      [
        "5 no-shows, or 3 for a conduct reason.",
        "A disqualified player can no longer post or accept matches.",
        "In the playoffs, their opponent goes through on a walkover.",
        "There is no refund of their entry fee.",
      ],
      "Strikes also count against your account, across every ladder:",
      [
        `${ACCOUNT_STRIKE_LIMIT} strikes upheld in the last ${ACCOUNT_STRIKE_MONTHS} months stops you joining new ladders.`,
        `Each strike stops counting ${ACCOUNT_STRIKE_MONTHS} months after it was upheld.`,
        "A report can still be upheld after a ladder has finished. It adds a strike but doesn't change results or prizes already paid.",
      ],
      "If a player is disqualified once they are in the money, their prize is held for review:",
      [
        "An admin decides whether to pay it in full, in part or not at all, and the player is told the outcome.",
        "Any part not paid will be retained by Court Champs, as the player broke the ladder Rules.",
      ],
    ],
  },
  {
    id: "expired-matches",
    title: "Expired matches",
    body: [
      "A match that expires under the Rules carries no result and no penalty for either side.",
    ],
  },
  {
    id: "refunds",
    title: "Refunds & cancellations",
    body: [
      `A ladder needs at least ${formatCount(LADDER_MIN_ENTRANTS_TO_START)} players or teams to start. If fewer have joined by the season start, the start moves back ${LADDER_SEASON_EXTENSION_DAYS} days, once.`,
      `If there are still too few, the ladder is cancelled and every entry is ${LADDER_CANCELLED_REFUND}.`,
      `If a ladder is cancelled for any other reason before it begins, paid entries are ${LADDER_CANCELLED_REFUND}.`,
      "Once a ladder has started, you have the right for refund before you play your first match.",
      "After that, entry fees are generally non-refundable except where required by law.",
    ],
  },
  {
    id: "chargebacks",
    title: "Chargebacks & payment disputes",
    body: [
      "If you have a problem with a payment, contact Court Champs first. We will look into it and refund anything you are owed under these terms.",
      "Asking your bank or card provider to reverse a payment these terms say is non-refundable is a breach of these terms. That includes an entry fee for a ladder you have played in, a court-fee share or the platform fee.",
      "While a chargeback or payment dispute is open:",
      [
        "Your place on the ladder is suspended and you cannot post or accept matches.",
        "Any prize you would receive is held until the dispute is resolved.",
        "You cannot join another paid ladder or competition.",
      ],
      "To respond to a dispute, Court Champs may share with the payment provider your entry details, your acceptance of these terms and the matches you played.",
      "If the payment is reversed:",
      [
        "You are removed from the ladder, as your entry fee has been taken back out of the prize pool.",
        "Any prize you would have received is forfeited and will be retained by Court Champs to make up the prize pool.",
        "Your account may be barred from paid ladders and competitions.",
      ],
      "If the dispute is withdrawn or decided in Court Champs' favour, the suspension is lifted. Matches that expired while you were suspended stay expired.",
      "Nothing in this section affects your statutory rights, including where a payment was taken without your authorisation.",
    ],
  },
  {
    id: "court-fees",
    title: "Court fees",
    body: [
      `Where a match sets a court fee, the accepting player pays their share, plus a ${PLATFORM_FEE_PERCENT} platform fee, when they accept the match. This secures the match so the poster is never left with an unpaid opponent.`,
      [
        "The court-fee share is released to the poster once the match completes or expires, since the poster has already paid for the court.",
        "If the match is cancelled, the court-fee share is refunded to the accepting player.",
        `The ${PLATFORM_FEE_PERCENT} platform fee is non-refundable in all cases and is retained by Court Champs to cover payment processing.`,
      ],
    ],
  },
  {
    id: "complaints",
    title: "Complaints",
    body: [
      `Send any complaint about a ladder, a result or a payment through in-app Support or to ${COURT_CHAMPS_CONTACT_EMAIL}. We aim to reply within ${SUPPORT_REPLY_HOURS} hours.`,
      "Disputed game scores are decided by our admins as the Rules describe, and any still open 1 day before the playoffs are closed under those Rules.",
      "Nothing in this section affects your statutory rights.",
    ],
  },
  {
    id: "changes",
    title: "Changes",
    body: [
      "Court Champs may update these terms or a ladder's details where reasonably necessary.",
      "Material changes affecting an active ladder will be communicated to participants.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing law",
    body: [
      `These terms are governed by the law of ${GOVERNING_LAW}.`,
      "If you live in Scotland or Northern Ireland, you keep the protection of your local consumer law and may bring proceedings in your local courts.",
    ],
  },
]);
