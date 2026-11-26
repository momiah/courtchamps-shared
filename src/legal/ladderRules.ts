import { LADDER_PLAYOFF_TIE_DAYS } from "../types/ladderPlayoff";
import {
  DECISIVE_WIN_MARGIN,
  DECISIVE_WIN_XP_MULTIPLIER,
  GAME_XP_BASE,
  LOSS_STREAK_XP_MULTIPLIERS,
  RANK_GAP_XP,
  WIN_STREAK_XP_MULTIPLIERS,
} from "../helpers/computeGameXp";
import { getLadderInactivityRules } from "../helpers/ladderInactivity";
import {
  LADDER_PLAYOFF_HOST_ARRANGE_HOURS,
  LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS,
} from "../helpers/ladderPlayoffMatches";
import {
  LADDER_PLAYOFF_SIZES,
  LADDER_PLAYOFF_STRUCTURE,
} from "../helpers/ladderPlayoffStructure";
import { LADDER_STANDINGS_FINAL_DAYS } from "../helpers/ladderSeasonClose";
import { getLadderSeasonStartRules } from "../helpers/ladderSeasonPhases";
import type { LegalSection, LegalTable } from "./blocks";

type Noun = "player" | "team";

const formatCount = (count: number) => count.toLocaleString("en-GB");

const days = (count: number) => `${count} day${count === 1 ? "" : "s"}`;

const times = (count: number) =>
  count === 2 ? "twice" : count === 3 ? "three times" : `${count} times`;

const multiplierVerb = (multiplier: number) =>
  multiplier === 2 ? "doubles" : multiplier === 3 ? "triples" : `multiplies by ${multiplier}`;

const formatStreaks = (
  table: readonly { streak: number; multiplier: number }[],
  outcome: "wins" | "losses",
): string => {
  const steps = [...table].sort((a, b) => a.streak - b.streak);
  const parts = steps.map((step, index) => {
    const last = index === steps.length - 1;
    const count = index === 0 ? `${step.streak} ${outcome} in a row` : `${step.streak}`;
    return `×${step.multiplier} for ${count}${last ? " or more" : ""}`;
  });
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};

/** The playoff and cash places for each ladder size, from LADDER_PLAYOFF_STRUCTURE. */
export const getLadderPlayoffPlacesTable = (): LegalTable => {
  const sizes = [...LADDER_PLAYOFF_SIZES].sort((a, b) => a - b);
  return {
    id: "ladder-playoff-places",
    columns: ["Registered at close", "Playoff places", "Places that win cash"],
    rows: sizes.map((size, index) => {
      const next = sizes[index + 1];
      const { playoffSpots, inTheMoney } = LADDER_PLAYOFF_STRUCTURE[size];
      return [
        next ? `${formatCount(size)}–${formatCount(next - 1)}` : `${formatCount(size)} or more`,
        `Top ${formatCount(playoffSpots)}`,
        `Top ${formatCount(inTheMoney)}`,
      ];
    }),
  };
};

export const getLadderRules = (noun: Noun): LegalSection[] => [
  {
    id: "how-ladders-work",
    title: "How ladders work",
    body: [
      "Players are ranked on a ladder.",
      "Challenge others to climb, and hold your position by defending against challengers.",
    ],
  },
  {
    id: "registration",
    title: "Registration",
    body: [
      "Join while registration is open.",
      ...getLadderSeasonStartRules(noun),
      "Paid ladders require the entry fee before you are added to the standings.",
    ],
  },
  {
    id: "keep-your-place",
    title: "Keep your place",
    body: getLadderInactivityRules(noun),
  },
  {
    id: "how-the-standings-work",
    title: "How the standings work",
    body: [
      "Every ladder game you play wins or loses you Court Points (CP) on this ladder's standings.",
      `A win earns ${GAME_XP_BASE.WIN} CP and a loss costs ${Math.abs(GAME_XP_BASE.LOSS)} CP, before multipliers.`,
      [
        `Win streaks multiply what you earn: ${formatStreaks(WIN_STREAK_XP_MULTIPLIERS, "wins")}.`,
        `Losing streaks multiply what you lose: ${formatStreaks(LOSS_STREAK_XP_MULTIPLIERS, "losses")}.`,
        `Beating a higher-ranked ${noun}: if the ${noun} you beat has at least ${times(RANK_GAP_XP.MIN_RATIO)} your CP, you earn extra CP. The extra is your streak CP multiplied by the gap between you, up to ${times(RANK_GAP_XP.MAX_MULTIPLIER)}. They lose the same extra amount.`,
        `Decisive win: winning a game by ${DECISIVE_WIN_MARGIN} or more points ${multiplierVerb(DECISIVE_WIN_XP_MULTIPLIER)} that game's CP, gained by the winner and lost by the loser.`,
      ],
      "The standings are ordered by CP, then number of wins, then points difference.",
      "You need at least one win to appear in the standings.",
    ],
  },
  {
    id: "who-makes-the-playoffs",
    title: "Who makes the playoffs",
    body: [
      `The number of playoff places depends on how many ${noun}s are registered when registration closes. That number is rounded down to the nearest ladder size below:`,
      getLadderPlayoffPlacesTable(),
      `Playoff places are seeded from the final standings, ${days(LADDER_STANDINGS_FINAL_DAYS)} before the playoffs start.`,
    ],
  },
  {
    id: "playing-games",
    title: "Playing games",
    body: [
      "Arrange challenge games with other ladder members.",
      "Report each result. Both players confirm the score before it counts.",
    ],
  },
  {
    id: "playing-to-win",
    title: "Playing to win",
    body: [
      `You must try to win every ladder game. You must not deliberately lose games, throw points or manage your results to protect or improve a ranking or playoff seed ("sandbagging").`,
      "You must not arrange results with another player, play under another person's account, or hold more than one account.",
      "We may review any pattern of results. If we find a breach, it is treated as a conduct strike, and the results may be removed.",
    ],
  },
  {
    id: "check-in",
    title: "Check-in & no-shows",
    body: [
      "Check in at the court for every match. The games unlock once every player has checked in.",
      "If your opponent hasn't checked in within 30 minutes of the start time, you can report a no-show from the check-in screen:",
      [
        "We confirm you're at the court when you report it.",
        "You can't report one if your opponent has already arrived.",
      ],
      "Misconduct (cheating, abuse or harassment) can be reported from the match menu.",
    ],
  },
  {
    id: "rescheduling",
    title: "Rescheduling & extensions",
    body: [
      "Before any game is reported, either side can ask to move the match to a new time. It only moves if the opponent accepts.",
      "Once a game has been reported, either side can extend the match once, giving 7 days from the request to finish it.",
      "An extension never runs past the day ladder results close, and playoff matches must still finish by the playoff deadline.",
    ],
  },
  {
    id: "inactive-matches",
    title: "Inactive matches",
    body: [
      "An accepted match expires if nothing happens for 72 hours: no check-in, game or report.",
      "The clock starts at the scheduled time and resets with any activity, so any progress keeps the match alive.",
    ],
  },
  {
    id: "before-the-playoffs",
    title: "Before the playoffs",
    body: [
      "Matches can be posted and accepted until 7 days before the playoffs start.",
      "Results close 5 days before. After that no more games or no-shows can be reported, and any unfinished match ends, keeping the games already approved.",
      "Disputes and no-show claims are decided by our admins until 1 day before. Anything still undecided then is closed so the standings are final:",
      [
        "A disputed game is discarded and neither side gets its CP.",
        "A no-show is only awarded if our records show the reporter at the court and their opponent not there.",
      ],
    ],
  },
  {
    id: "playoffs",
    title: "Playoffs",
    body: [
      `When the season ends, the top-ranked ${noun}s enter the playoff bracket to decide the champion.`,
    ],
  },
  {
    id: "playoff-matches",
    title: "Playoff matches",
    body: [
      `Each playoff tie is two matches, one at each ${noun}'s home court. Both must be played within ${LADDER_PLAYOFF_TIE_DAYS} days.`,
      `The lower-ranked ${noun} arranges their home match first. Once it's arranged, the higher-ranked ${noun} can arrange theirs for any date before the deadline, even an earlier one, so you can work around each other.`,
      `The ${noun} that wins more games across both matches goes through.`,
      "If it's level, one deciding game is played at the court of whichever match was played last, straight after it, with everyone already checked in. If you can't stay for it, either side can reschedule it before the deadline.",
      "Once match 1 is finished, either side can offer to play match 2 at the same court there and then. The other side can accept or decline.",
    ],
  },
  {
    id: "arranging-and-answering",
    title: "Arranging and answering",
    body: [
      `The ${noun} you play can decline the time you arrange once. After that they can only accept.`,
      `If they don't answer within ${LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS} hours, the match is accepted for them.`,
      `If the lower-ranked ${noun} hasn't arranged match 1 within ${LADDER_PLAYOFF_HOST_ARRANGE_HOURS} hours of the tie starting, the other ${noun} can arrange their own match without waiting.`,
    ],
  },
  {
    id: "if-time-runs-out",
    title: "If time runs out",
    body: [
      `If some games were played, the ${noun} with more games goes through, then more points, then the higher rank.`,
      "If nothing was played:",
      [
        `The only ${noun} that arranged, accepted or declined a match goes through on a walkover.`,
        "If both did, or neither did, nobody goes through.",
      ],
      `A disqualified ${noun} is out of every tie, and their opponent goes through on a walkover.`,
    ],
  },
  {
    id: "prizes",
    title: "Prizes",
    body: [
      "The prize pot is the total of all entry fees. It is shared among the in-the-money places using the published payout table for the ladder's size (see the Terms).",
      "The table and your ladder's payout structure are shown before you pay.",
    ],
  },
];
