import type { ClubFeedActor, ClubFeedDocument } from "../types/club";

export type ClubFeedEvent = Omit<ClubFeedDocument, "id" | "createdAt">;

type ClubCompetitionType = "league" | "tournament";

export const buildClubCreatedEvent = (p: {
  clubName: string;
  actor?: ClubFeedActor | null;
  image?: string | null;
}): ClubFeedEvent => ({
  type: "club_created",
  title: "Club created",
  message: `${p.actor?.firstName ?? p.actor?.username ?? "The owner"} created the club "${p.clubName}"`,
  actor: p.actor ?? null,
  thumbnail: p.image ?? null,
  icon: "flag-outline",
});

export const buildPlayerJoinedEvent = (
  actor: ClubFeedActor,
): ClubFeedEvent => ({
  type: "player_joined",
  title: "New member",
  message: `${actor.firstName ?? actor.username} joined the club`,
  actor,
  icon: "person-add-outline",
});

export const buildCompetitionCreatedEvent = (p: {
  name: string;
  competitionType: ClubCompetitionType;
  competitionId: string;
  actor?: ClubFeedActor | null;
  image?: string | null;
}): ClubFeedEvent => ({
  type: "competition_created",
  title: "New competition",
  message: `${p.actor?.firstName ?? "An admin"} created the ${p.competitionType} "${p.name}"`,
  actor: p.actor ?? null,
  thumbnail: p.image ?? null,
  icon: "add-circle-outline",
  data: {
    competitionId: p.competitionId,
    competitionType: p.competitionType,
  },
});

export const buildCompetitionWonEvent = (p: {
  name: string;
  competitionType: ClubCompetitionType;
  competitionId: string;
  winnerName: string;
}): ClubFeedEvent => ({
  type: "competition_won",
  title: "Competition winner",
  message: `${p.winnerName} won the ${p.competitionType} "${p.name}"`,
  icon: "trophy-outline",
  data: {
    competitionId: p.competitionId,
    competitionType: p.competitionType,
  },
});
