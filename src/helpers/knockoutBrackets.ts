import moment from "moment";
import type { FixtureMetadata, Fixtures, Game, GameTeam } from "../types";
import { assignCourtForGameIndex } from "./advanceBrackets";

export interface KnockoutBracketTeam {
  player1: GameTeam["player1"];
  player2: GameTeam["player2"];
}

export interface KnockoutBracketMetadata extends FixtureMetadata {
  totalTeams: number;
  firstRoundGames: number;
}

export interface KnockoutBracketResult {
  fixtures: Fixtures[];
  metadata: KnockoutBracketMetadata;
}

const MINUTES_PER_GAME = 15;

export const isKnockoutBracketSize = (size: number): boolean =>
  Number.isInteger(size) && size >= 2 && (size & (size - 1)) === 0;

const buildEmptyTeam = (): GameTeam => ({ player1: null, player2: null });

const buildShellGame = ({
  gameId,
  gameNumber,
  now,
}: {
  gameId: string;
  gameNumber: number;
  now: Date;
}): Game => ({
  gameId,
  gameNumber,
  court: null,
  team1: buildEmptyTeam(),
  team2: buildEmptyTeam(),
  gamescore: "",
  createdAt: now,
  createdTime: moment(now).format("HH:mm"),
  reportedAt: null,
  reportedTime: null,
  approvalStatus: "Scheduled",
  result: null,
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  reporter: "",
  isThirdPlacePlayoff: false,
  approvers: [],
});

/**
 * Builds a single-elimination bracket. Round 1 pairs `teams` in the order given
 * (0 v 1, 2 v 3, ...), so callers control placement by ordering `teams`. Later
 * rounds are empty shells filled by advancement. With `numberOfCourts` <= 0 no
 * courts are assigned.
 */
export const generateKnockoutBrackets = ({
  teams,
  numberOfCourts,
  createGameId,
  includeThirdPlacePlayoff = true,
  now = new Date(),
}: {
  teams: KnockoutBracketTeam[];
  numberOfCourts: number;
  createGameId: (existingGames: Game[]) => string;
  includeThirdPlacePlayoff?: boolean;
  now?: Date;
}): KnockoutBracketResult => {
  const totalTeams = teams.length;
  if (!isKnockoutBracketSize(totalTeams)) {
    throw new Error(
      `Knockout brackets need a power-of-two number of teams. Received ${totalTeams}.`,
    );
  }

  const totalRounds = Math.log2(totalTeams);
  const firstRoundGames = totalTeams / 2;
  const allCreatedGames: Game[] = [];
  const fixtures: Fixtures[] = [];
  let runningGameNumber = 1;

  const createShell = (): Game => {
    const game = buildShellGame({
      gameId: createGameId(allCreatedGames),
      gameNumber: runningGameNumber++,
      now,
    });
    allCreatedGames.push(game);
    return game;
  };

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const gamesInRound = totalTeams / 2 ** (roundIndex + 1);
    const isFinalRound = roundIndex === totalRounds - 1;
    const roundGames: Game[] = [];

    for (let gameIndex = 0; gameIndex < gamesInRound; gameIndex++) {
      const game = createShell();
      if (roundIndex === 0) {
        const team1 = teams[gameIndex * 2];
        const team2 = teams[gameIndex * 2 + 1];
        game.team1 = { player1: team1.player1, player2: team1.player2 };
        game.team2 = { player1: team2.player1, player2: team2.player2 };
        if (numberOfCourts > 0) {
          game.court = assignCourtForGameIndex(gameIndex, numberOfCourts);
        }
      }
      roundGames.push(game);
    }

    if (isFinalRound && includeThirdPlacePlayoff && totalTeams >= 4) {
      const playoff = createShell();
      playoff.isThirdPlacePlayoff = true;
      roundGames.push(playoff);
    }

    fixtures.push({ round: roundIndex + 1, games: roundGames });
  }

  const totalGames = allCreatedGames.length;
  const courtsForEstimate = Math.max(numberOfCourts, 1);
  const estimatedMinutes = fixtures.reduce(
    (sum, round) =>
      sum + Math.ceil(round.games.length / courtsForEstimate) * MINUTES_PER_GAME,
    0,
  );

  return {
    fixtures,
    metadata: {
      totalRounds,
      totalTeams,
      totalGames,
      firstRoundGames,
      estimatedMinutes,
      estimatedHours: estimatedMinutes / 60,
      disclaimers: [],
    },
  };
};
