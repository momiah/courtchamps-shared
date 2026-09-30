import { scoreboardProfileSchema, ccImageEndpoint } from "../schema";
import type { ScoreboardProfile, UserProfile } from "../types";

export type LadderJoinUser = Pick<
  UserProfile,
  "userId" | "username" | "firstName" | "lastName" | "profileImage"
> & {
  profileDetail?: Pick<UserProfile["profileDetail"], "memberSince">;
};

export const buildLadderParticipant = (
  user: LadderJoinUser,
): ScoreboardProfile => ({
  ...scoreboardProfileSchema,
  // scoreboardProfileSchema is a module-level singleton — its array/object
  // fields must be given fresh instances here, not inherited via the spread
  // above, or every participant built from it (e.g. scoreDoublesLadderGame's
  // buildLadderParticipant fallback for a player with no existing doc) shares
  // the same currentStreak/resultLog/etc. by reference. Scoring one such
  // participant then mutates the "fresh" state the next one reads.
  pointDifferenceLog: [],
  resultLog: [],
  matchResultLog: [],
  currentStreak: { type: null, count: 0 },
  // Per-ladder CP starts at 0 (the CP shown in the ladder standings), separate
  // from the global profile XP that drives the rank medal.
  competitionXP: 0,
  username: user.username,
  firstName: user.firstName ? user.firstName.split(" ")[0] : "",
  lastName: user.lastName ? user.lastName.split(" ")[0] : "",
  userId: user.userId,
  memberSince: user.profileDetail?.memberSince || "",
  profileImage: user.profileImage || ccImageEndpoint,
});
