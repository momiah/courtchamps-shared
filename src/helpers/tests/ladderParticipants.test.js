import { buildLadderParticipant } from "../ladderParticipants";

const user = {
  userId: "u1",
  username: "moe",
  firstName: "Moe Junior",
  lastName: "Miah Senior",
  profileImage: "https://example.com/moe.png",
  profileDetail: { memberSince: "Jan 2024" },
};

describe("buildLadderParticipant", () => {
  it("seeds identity fields and takes only the first name token", () => {
    const participant = buildLadderParticipant(user);
    expect(participant.userId).toBe("u1");
    expect(participant.username).toBe("moe");
    expect(participant.firstName).toBe("Moe");
    expect(participant.lastName).toBe("Miah");
    expect(participant.memberSince).toBe("Jan 2024");
    expect(participant.profileImage).toBe("https://example.com/moe.png");
  });

  it("starts every stat at the zeroed schema default", () => {
    const participant = buildLadderParticipant(user);
    expect(participant.numberOfWins).toBe(0);
    expect(participant.numberOfGamesPlayed).toBe(0);
    expect(participant.totalPoints).toBe(0);
    expect(participant.resultLog).toEqual([]);
  });

  it("seeds ladder CP (XP) at 0 — it's a display-only accumulator", () => {
    expect(buildLadderParticipant(user).competitionXP).toBe(0);
  });

  it("falls back to the default image and empty memberSince", () => {
    const participant = buildLadderParticipant({
      userId: "u9",
      username: "guest",
      firstName: "Guest",
      lastName: "User",
      profileImage: "",
    });
    expect(participant.profileImage).toBeTruthy();
    expect(participant.memberSince).toBe("");
  });

  it("gives each participant its own resultLog/currentStreak — mutating one must not affect another built from the same schema singleton", () => {
    // Regression: buildLadderParticipant used to shallow-spread the
    // module-level scoreboardProfileSchema, so every participant shared the
    // same currentStreak object and resultLog/pointDifferenceLog/
    // matchResultLog arrays by reference. Scoring one participant (e.g. the
    // buildLadderParticipant fallback scoreDoublesLadderGame takes for a
    // player with no existing doc) then corrupted the next participant's
    // streak and XP calculation — this is exactly the mutation pattern
    // calculatePlayerPerformance performs on a real participant during
    // scoring.
    const first = buildLadderParticipant(user);
    const second = buildLadderParticipant({ ...user, userId: "u2" });

    first.resultLog.push("W");
    first.pointDifferenceLog.push(6);
    first.matchResultLog.push("W");
    first.currentStreak.type = "W";
    first.currentStreak.count = 1;

    expect(second.resultLog).toEqual([]);
    expect(second.pointDifferenceLog).toEqual([]);
    expect(second.matchResultLog).toEqual([]);
    expect(second.currentStreak).toEqual({ type: null, count: 0 });
  });
});
