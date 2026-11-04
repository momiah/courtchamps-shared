import {
  buildClubCreatedEvent,
  buildPlayerJoinedEvent,
  buildCompetitionCreatedEvent,
  buildCompetitionWonEvent,
} from "../clubFeedEvents";

const actor = { userId: "u1", username: "sam", firstName: "Sam" };

describe("club feed events", () => {
  it("club created names the owner and the club", () => {
    expect(
      buildClubCreatedEvent({ clubName: "Smash", actor, image: "img" }),
    ).toEqual({
      type: "club_created",
      title: "Club created",
      message: 'Sam created the club "Smash"',
      actor,
      thumbnail: "img",
      icon: "flag-outline",
    });
  });

  it("player joined falls back to the username", () => {
    expect(
      buildPlayerJoinedEvent({ userId: "u2", username: "alex" }).message,
    ).toBe("alex joined the club");
  });

  it("competition created carries the competition id and type", () => {
    const event = buildCompetitionCreatedEvent({
      name: "Spring League",
      competitionType: "league",
      competitionId: "l1",
      actor,
    });
    expect(event.message).toBe('Sam created the league "Spring League"');
    expect(event.data).toEqual({
      competitionId: "l1",
      competitionType: "league",
    });
    expect(event.thumbnail).toBeNull();
  });

  it("competition won names the winner and the competition", () => {
    expect(
      buildCompetitionWonEvent({
        name: "Cup",
        competitionType: "tournament",
        competitionId: "t1",
        winnerName: "sam / alex",
      }),
    ).toEqual({
      type: "competition_won",
      title: "Competition winner",
      message: 'sam / alex won the tournament "Cup"',
      icon: "trophy-outline",
      data: { competitionId: "t1", competitionType: "tournament" },
    });
  });
});
