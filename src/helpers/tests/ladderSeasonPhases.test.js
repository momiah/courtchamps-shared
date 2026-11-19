import {
  LADDER_SEASON_PHASE,
  getLadderSeasonPhases,
  getLadderSeasonStartRules,
} from "../ladderSeasonPhases";

describe("getLadderSeasonPhases", () => {
  const phases = getLadderSeasonPhases({
    noun: "player",
    playoffSpots: 128,
    isPaid: true,
  });
  const byKey = Object.fromEntries(phases.map((phase) => [phase.key, phase]));

  it("lists the phases in order", () => {
    expect(phases.map((phase) => phase.key)).toEqual([
      LADDER_SEASON_PHASE.REGISTRATION_OPEN,
      LADDER_SEASON_PHASE.SEASON_STARTS,
      LADDER_SEASON_PHASE.REGISTRATION_CLOSED,
      LADDER_SEASON_PHASE.PLAYOFFS,
      LADDER_SEASON_PHASE.COMPLETED,
    ]);
  });

  it("keeps matches closed during registration and explains the start", () => {
    expect(byKey.registrationOpen).toEqual({
      key: "registrationOpen",
      label: "Registration Open",
      length: "14 - 28 days",
      text: "Sign up and invite friends. The season starts once 128 players have joined. If not, it waits 14 days more, then the ladder is cancelled and refunded.",
    });
  });

  it("counts season days from the season start", () => {
    expect(byKey.seasonStarts).toMatchObject({
      label: "Play Starts",
      length: "Day 1 - 60",
      text: "Matches open. Post or accept matches to climb. New players can still join.",
    });
    expect(byKey.registrationClosed).toMatchObject({
      label: "Registration Closed",
      length: "Day 61 - 90",
      text: "No new players join. Keep climbing; new matches close 7 days before the playoffs.",
    });
  });

  it("describes the playoffs and the finish", () => {
    expect(byKey.playoffs).toMatchObject({
      length: "7 rounds",
      text: "The top 128 players play a knockout. Each round is two matches, home and away, played within 10 days.",
    });
    expect(byKey.completed.text).toBe(
      "The champion crowned. Cash paid. CP awarded.",
    );
  });

  it("leaves refunds and cash out of a free doubles ladder", () => {
    const free = getLadderSeasonPhases({
      noun: "team",
      playoffSpots: 8,
      isPaid: false,
    });
    expect(free[0].text).toBe(
      "Sign up and invite friends. The season starts once 128 teams have joined. If not, it waits 14 days more, then the ladder is cancelled.",
    );
    expect(free[3].length).toBe("3 rounds");
    expect(free[4].text).toBe("The champion crowned. CP awarded.");
  });
});

describe("getLadderSeasonStartRules", () => {
  it("explains the season start", () => {
    expect(getLadderSeasonStartRules("team")).toEqual([
      "Matches open when the season starts, 14 days after registration opens, once 128 teams have joined.",
      "If fewer have joined by then, the season start moves back 14 days. If there are still too few, the ladder is cancelled and every entry fee is refunded in full.",
      "Registration stays open for the first 60 days of the season.",
    ]);
  });
});
