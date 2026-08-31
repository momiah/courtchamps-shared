export interface ScoreboardProfile {
  prevGameXP: number;
  highestLossStreak: number;
  highestWinStreak: number;
  totalPoints: number;
  totalPointDifference: number;
  numberOfWins: number;
  pointEfficiency: number;
  totalPointEfficiency: number;
  winStreak3: number;
  winStreak5: number;
  winStreak7: number;
  demonWin: number;
  pointDifferenceLog: number[];
  averagePointDifference: number;
  /** Per-game results ("W"/"L"). */
  resultLog: string[];
  /**
   * Per-MATCH results ("W"/"L"), distinct from the per-game `resultLog`. Used
   * on ladders where a match is a set of games. Optional/back-compat.
   */
  ladderResultLog?: string[];
  /**
   * Court Points (displayed as "CP"). Still the XP field in types/db/backend —
   * "CP" is only a display label. On a competition participant record this is
   * the CP earned in that competition; optional for back-compat.
   */
  XP?: number;
  currentStreak: {
    type: string | null;
    count: number;
  };
  lastActive: string | Date;
  winPercentage: number;
  numberOfLosses: number;
  numberOfGamesPlayed: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  memberSince?: string;
  profileImage?: string;
}

export type PlayersToUpdate = ScoreboardProfile[];

export interface LeagueTournamentStats {
  first: number;
  second: number;
  third: number;
  fourth: number;
}

export interface ProfileDetail extends ScoreboardProfile {
  XP: number;
  memberSince: string;
  leagueStats: LeagueTournamentStats;
  tournamentStats: LeagueTournamentStats;
}

export interface Location {
  city: string;
  country: string;
  countryCode: string;
  postCode: string;
  address: string;
}

export interface UserProfile {
  handPreference: string;
  userId: string;
  lastName: string;
  firstName: string;
  username: string;
  usernameLower: string;
  provider: string;
  dob: string;
  profileDetail: ProfileDetail;
  profileImage: string;
  bio: string;
  headline: string;
  profileViews: number;
  location: Location;
  email: string;
  phoneNumber: string;
  showEmail: boolean;
  showPhoneNumber: boolean;
  pushTokens: string[];
}

export type UsersToUpdate = UserProfile[];
