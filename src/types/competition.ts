import { Location, ScoreboardProfile } from "./player";
import { Game, Fixtures } from "./game";
import type { COMPETITION_TYPES } from "../schema";

export type CollectionName =
  | "leagues"
  | "tournaments"
  | "pendingVideoUploads"
  | "gameVideos"
  | "comments"
  | "replies"
  | "reportedVideos"
  | "savedVideos"
  | "videoReportAppeals"
  | "failedVideoUploads"
  | "clubs";

export type CompetitionType =
  | typeof COMPETITION_TYPES.LEAGUE
  | typeof COMPETITION_TYPES.TOURNAMENT
  | typeof COMPETITION_TYPES.LADDER;

export interface CompetitionAdmins {
  userId: string;
  username: string;
}

export interface CompetitionLocation extends Location {
  courtName: string;
  courtId: string;
}

export interface CompetitionOwner {
  firstName: string;
  lastName: string;
  username: string;
  userId: string;
  location: Location;
}

export interface PlayingTime {
  day: string;
  endTime: string;
  startTime: string;
}

export interface PendingInvites {
  userId: string;
}

export interface PendingRequests {
  userId: string;
}

interface Rival {
  rivalKey: string;
  rivalPlayers: string[];
}

// A member of a reusable doubles team (root `teams/{teamKey}` doc roster).
export interface TeamMember {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

export interface TeamStats {
  averagePointDifference: number;
  currentStreak: number;
  demonWin: number;
  highestLossStreak: number;
  highestWinStreak: number;
  lossesTo: Record<string, unknown>;
  numberOfGamesPlayed: number;
  numberOfLosses: number;
  numberOfWins: number;
  pointDifferenceLog: number[];
  resultLog: string[];
  /**
   * Per-MATCH results ("W"/"L") for the team, distinct from the per-game
   * `resultLog`. Used on doubles ladders where a match is a set of games.
   * Optional/back-compat.
   */
  matchResultLog?: string[];
  rival: Rival | null;
  team: string[];
  teamKey: string;
  totalPointDifference: number;
  winStreak3: number;
  winStreak5: number;
  winStreak7: number;
  /**
   * Court Points (displayed as "CP") for the team. On a ladder team record this
   * is the CP earned in that ladder alone (the per-ladder standing / playoff
   * tiebreaker); on the root `teams/{teamKey}` doc it is the lifetime aggregate
   * across every ladder the team has played. Optional for back-compat with
   * league/tournament teams, which do not use it.
   */
  XP?: number;
  // ── Root `teams/{teamKey}` doc metadata (a reusable doubles team roster).
  //    Optional so per-competition team records stay back-compat. ──
  /** Member user IDs, for "teams this user is in" queries (array-contains). */
  playerIds?: string[];
  /** Full roster for display (names + avatars). */
  players?: TeamMember[];
  /** Optional custom team name; falls back to the members' names for display. */
  teamName?: string;
  createdBy?: string;
  createdAt?: string | Date;
}

export interface League {
  leagueId?: string;
  id?: string;
  clubId?: string | null;
  leagueParticipants: ScoreboardProfile[];
  leagueTeams: TeamStats[];
  leagueAdmins: CompetitionAdmins[];
  leagueOwner: CompetitionOwner;
  participantIds?: string[];
  games: Game[];
  leagueType: string;
  prizeType: string;
  entryFee: number;
  currencyType: string;
  leagueImage: string;
  leagueName: string;
  leagueDescription: string;
  location: CompetitionLocation;
  countryCode: string;
  createdAt: Date;
  startDate: string;
  leagueLengthInMonths: string;
  endDate: string;
  prizesDistributed: boolean;
  prizeDistributionDate: Date | null;
  maxPlayers: number;
  privacy: string;
  playingTime: PlayingTime[];
  pendingInvites: PendingInvites[];
  pendingRequests: PendingRequests[];
  approvalLimit: number;
}

export interface Tournament {
  tournamentId?: string;
  id?: string;
  clubId?: string | null;
  tournamentParticipants: ScoreboardProfile[];
  tournamentTeams: TeamStats[];
  tournamentAdmins: CompetitionAdmins[];
  tournamentOwner: CompetitionOwner;
  participantIds?: string[];
  games: Game[];
  fixtures: Fixtures[];
  fixturesGenerated: boolean;
  numberOfGames?: number;
  gamesCompleted?: number;
  tournamentType: string;
  tournamentMode: string;
  prizeType: string;
  entryFee: number;
  currencyType: string;
  tournamentImage: string;
  tournamentName: string;
  tournamentDescription: string;
  location: CompetitionLocation;
  countryCode: string;
  createdAt: Date;
  startDate: string;
  tournamentLengthInMonths: string;
  endDate: string;
  prizesDistributed: boolean;
  prizeDistributionDate: string | null;
  maxPlayers: number;
  privacy: string;
  playingTime: PlayingTime[];
  pendingInvites: PendingInvites[];
  pendingRequests: PendingRequests[];
  approvalLimit: number;
  numberOfCourts?: number;
}

export interface NormalizedCompetition {
  participants: ScoreboardProfile[];
  teams: TeamStats[];
  admins: CompetitionAdmins[];
  owner: CompetitionOwner;
  participantIds?: string[];
  clubId?: string | null;
  games: Game[];
  fixtures?: Fixtures[];
  fixturesGenerated?: boolean;
  fixturesGeneratedAt?: Date | string;
  type: string;
  mode: string;
  prizeType: string;
  entryFee: number;
  currencyType: string;
  image: string;
  name: string;
  description: string;
  location: CompetitionLocation;
  countryCode: string;
  createdAt: Date;
  startDate: string;
  lengthInMonths: string;
  endDate: string;
  prizesDistributed: boolean;
  prizeDistributionDate: string | null;
  maxPlayers: number;
  privacy: string;
  playingTime: PlayingTime[];
  pendingInvites: PendingInvites[];
  pendingRequests: PendingRequests[];
  approvalLimit: number;
  id: string;
  numberOfCourts?: number;
}
