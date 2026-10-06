import { LADDER_PLAYOFF_TIE_STATUS } from "../types/ladderPlayoff";
import type {
  LadderPlayoffSide,
  LadderPlayoffTie,
} from "../types/ladderPlayoff";
import type { LadderHomeCourt } from "../types/ladder";
import type { Fixtures, Game, GameTeam, Player } from "../types/game";
import { compareLadderEntrants } from "./getRankInCompetition";
import { getLadderPlayoffStructureForRegistrations } from "./ladderPlayoffStructure";
import { generateKnockoutBrackets } from "./knockoutBrackets";

/** A ladder player (singles) or team (doubles) competing for a playoff spot. */
export interface LadderPlayoffEntrant {
  /** userId (singles) or teamKey (doubles). */
  entrantKey: string;
  teamId: string | null;
  players: Player[];
  /** Per-ladder CP. */
  competitionXP: number;
  numberOfWins: number;
  totalPointDifference: number;
  /** Global profile XP; for doubles the two players combined. */
  globalXp: number;
  joinedAt: Date | null;
  homeCourt: LadderHomeCourt | null;
}

const joinedAtMs = (entrant: LadderPlayoffEntrant): number =>
  entrant.joinedAt instanceof Date && !Number.isNaN(entrant.joinedAt.getTime())
    ? entrant.joinedAt.getTime()
    : Number.POSITIVE_INFINITY;

const compareJoinedAt = (
  a: LadderPlayoffEntrant,
  b: LadderPlayoffEntrant,
): number => {
  const aMs = joinedAtMs(a);
  const bMs = joinedAtMs(b);
  if (aMs === bMs) return 0;
  return aMs < bMs ? -1 : 1;
};

/**
 * Playoff qualification order: ladder CP, wins, point difference (the standings
 * order), then higher global rank, then who joined the ladder first, then the
 * entrant key so the order is always the same.
 */
export const compareLadderPlayoffEntrants = (
  a: LadderPlayoffEntrant,
  b: LadderPlayoffEntrant,
): number =>
  compareLadderEntrants(a, b) ||
  b.globalXp - a.globalXp ||
  compareJoinedAt(a, b) ||
  a.entrantKey.localeCompare(b.entrantKey);

export const rankLadderPlayoffEntrants = (
  entrants: LadderPlayoffEntrant[],
): LadderPlayoffEntrant[] => [...entrants].sort(compareLadderPlayoffEntrants);

/**
 * Bracket size for a ladder: the playoff spots for its registrations, reduced
 * to the largest power of two the available entrants can fill. 0 means no
 * bracket.
 */
export const getLadderPlayoffBracketSize = ({
  registeredCount,
  maxPlayers,
  entrantCount,
}: {
  registeredCount: number;
  maxPlayers?: number;
  entrantCount: number;
}): number => {
  const { playoffSpots } = getLadderPlayoffStructureForRegistrations(
    registeredCount,
    maxPlayers,
  );
  const available = Math.min(playoffSpots, entrantCount);
  let size = 1;
  while (size * 2 <= available) size *= 2;
  return size >= 2 ? size : 0;
};

interface Point {
  latitude: number;
  longitude: number;
}

const homeCourtPoint = (entrant: LadderPlayoffEntrant): Point | null => {
  const location = entrant.homeCourt?.location;
  return typeof location?.latitude === "number" &&
    typeof location?.longitude === "number"
    ? { latitude: location.latitude, longitude: location.longitude }
    : null;
};

const spread = (values: number[]): number =>
  values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);

/**
 * Only entrants with a home court can qualify: it decides round-1 pairing and
 * hosts their home games. A player who never posted or accepted a match has
 * none.
 */
export const hasLadderPlayoffHomeCourt = (
  entrant: LadderPlayoffEntrant,
): boolean => homeCourtPoint(entrant) !== null;

/**
 * The bracket size and its qualifiers in ranking order: entrants with a home
 * court, ranked, cut to the playoff spots for the ladder's registrations (or
 * the largest power of two the eligible entrants can fill).
 */
export const getLadderPlayoffQualifiers = ({
  entrants,
  registeredCount,
  maxPlayers,
}: {
  entrants: LadderPlayoffEntrant[];
  registeredCount: number;
  maxPlayers?: number;
}): { bracketSize: number; qualifiers: LadderPlayoffEntrant[] } => {
  const eligible = entrants.filter(hasLadderPlayoffHomeCourt);
  const bracketSize = getLadderPlayoffBracketSize({
    registeredCount,
    maxPlayers,
    entrantCount: eligible.length,
  });
  return {
    bracketSize,
    qualifiers: rankLadderPlayoffEntrants(eligible).slice(0, bracketSize),
  };
};

/**
 * Orders qualifiers so that round-1 pairs (0 v 1, 2 v 3, ...) are as close as
 * possible and neighbouring pairs are close too, so early rounds stay local.
 * Recursively splits the group in half along whichever axis (north-south or
 * east-west) its home courts are most spread across. Input order breaks ties,
 * so pass qualifiers in ranking order.
 */
export const orderLadderPlayoffEntrantsByProximity = (
  entrants: LadderPlayoffEntrant[],
): LadderPlayoffEntrant[] => {
  if (entrants.length <= 2) return [...entrants];

  const points = entrants
    .map(homeCourtPoint)
    .filter((point): point is Point => point !== null);
  const meanLatitude =
    points.reduce((sum, point) => sum + point.latitude, 0) /
    Math.max(points.length, 1);
  const latitudeSpread = spread(points.map((point) => point.latitude));
  const longitudeSpread =
    spread(points.map((point) => point.longitude)) *
    Math.cos((meanLatitude * Math.PI) / 180);
  const axis: keyof Point =
    latitudeSpread >= longitudeSpread ? "latitude" : "longitude";

  const sorted = entrants
    .map((entrant, index) => ({ entrant, index, point: homeCourtPoint(entrant) }))
    .sort((a, b) => {
      if (!a.point || !b.point) {
        return Number(!a.point) - Number(!b.point) || a.index - b.index;
      }
      return a.point[axis] - b.point[axis] || a.index - b.index;
    })
    .map(({ entrant }) => entrant);

  const half = Math.floor(sorted.length / 2);
  return [
    ...orderLadderPlayoffEntrantsByProximity(sorted.slice(0, half)),
    ...orderLadderPlayoffEntrantsByProximity(sorted.slice(half)),
  ];
};

const toBracketPlayer = (player: Player): Player => ({
  userId: player.userId,
  firstName: player.firstName ?? "",
  lastName: player.lastName ?? "",
  username: player.username ?? "",
  ...(player.displayName ? { displayName: player.displayName } : {}),
});

const toGameTeam = (entrant: LadderPlayoffEntrant): GameTeam => ({
  player1: entrant.players[0] ? toBracketPlayer(entrant.players[0]) : null,
  player2: entrant.players[1] ? toBracketPlayer(entrant.players[1]) : null,
});

export const ladderPlayoffTieId = (round: number, slot: number): string =>
  `r${round}-s${slot}`;

/**
 * Builds every bracket slot for a ladder's playoffs from its qualifiers in
 * ranking order (length must be the bracket size). Round 1 is placed by
 * proximity; later rounds and the 3rd-place playoff start empty.
 */
export const buildLadderPlayoffTies = ({
  ladderId,
  qualifiers,
  createdAt = new Date(),
}: {
  ladderId: string;
  qualifiers: LadderPlayoffEntrant[];
  createdAt?: Date;
}): LadderPlayoffTie[] => {
  const rankByKey = new Map(
    qualifiers.map((entrant, index) => [entrant.entrantKey, index + 1]),
  );
  const toSide = (entrant: LadderPlayoffEntrant): LadderPlayoffSide => ({
    entrantKey: entrant.entrantKey,
    teamId: entrant.teamId,
    playerIds: entrant.players.map((player) => player.userId),
    rank: rankByKey.get(entrant.entrantKey) ?? 0,
    homeCourt: entrant.homeCourt,
  });

  const placed = orderLadderPlayoffEntrantsByProximity(qualifiers);
  const { fixtures } = generateKnockoutBrackets({
    teams: placed.map(toGameTeam),
    createGameId: (existingGames) =>
      `${ladderId}-playoff-${existingGames.length + 1}`,
    now: createdAt,
  });

  return fixtures.flatMap(({ round, games }) =>
    games.map((game, slot): LadderPlayoffTie => {
      const isFirstRound = round === 1;
      return {
        tieId: ladderPlayoffTieId(round, slot),
        ladderId,
        round,
        slot,
        gameNumber: game.gameNumber ?? 0,
        isThirdPlacePlayoff: !!game.isThirdPlacePlayoff,
        team1: game.team1,
        team2: game.team2,
        side1: isFirstRound ? toSide(placed[slot * 2]) : null,
        side2: isFirstRound ? toSide(placed[slot * 2 + 1]) : null,
        status: isFirstRound
          ? LADDER_PLAYOFF_TIE_STATUS.SCHEDULED
          : LADDER_PLAYOFF_TIE_STATUS.AWAITING_ENTRANTS,
        winner: null,
        createdAt,
      };
    }),
  );
};

/** Converts stored ties into the rounds-of-games shape the bracket UI renders. */
export const ladderPlayoffTiesToFixtures = (
  ties: LadderPlayoffTie[],
): Fixtures[] => {
  const rounds = new Map<number, LadderPlayoffTie[]>();
  ties.forEach((tie) => {
    rounds.set(tie.round, [...(rounds.get(tie.round) ?? []), tie]);
  });

  return [...rounds.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, roundTies]) => ({
      round,
      games: [...roundTies]
        .sort((a, b) => a.slot - b.slot)
        .map(
          (tie): Game => ({
            gameId: tie.tieId,
            gameNumber: tie.gameNumber,
            court: null,
            team1: tie.team1,
            team2: tie.team2,
            gamescore: "",
            result: null,
            approvalStatus: "Scheduled",
            numberOfApprovals: 0,
            numberOfDeclines: 0,
            reporter: "",
            approvers: [],
            isThirdPlacePlayoff: tie.isThirdPlacePlayoff,
          }),
        ),
    }));
};
