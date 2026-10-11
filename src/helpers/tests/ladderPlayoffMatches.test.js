import {
  LADDER_PLAYOFF_TIE_OUTCOME as OUTCOME,
  LADDER_PLAYOFF_TIE_STATUS as STATUS,
} from "../../types/ladderPlayoff";
import {
  advanceLadderPlayoffBracket,
  buildLadderPlayoffLegMatch,
  decideLadderPlayoffTie,
  decideLadderPlayoffTieAtDeadline,
  flipLadderPlayoffCoin,
  getDueLadderPlayoffReminderDays,
  getLadderPlayoffLegHost,
  tallyLadderPlayoffTie,
} from "../ladderPlayoffMatches";
import {
  getLadderPlayoffBestOf,
  scheduleLadderPlayoffTie,
} from "../ladderPlayoffSchedule";
import { buildLadderPlayoffTies } from "../ladderPlayoffs";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-11T12:00:00Z");

const side = (playerIds, rank) => ({
  entrantKey: playerIds.join("_"),
  teamId: null,
  playerIds,
  rank,
  homeCourt: null,
});

const tie = {
  side1: side(["a"], 3),
  side2: side(["b"], 7),
};

const player = (userId) => ({ userId, firstName: userId, lastName: "", username: userId });

const game = (winnerId, winnerScore, loserScore, { approved = true, flip = false } = {}) => {
  const winnerTeam = winnerId === "a" ? "Team 1" : "Team 2";
  const loserId = winnerId === "a" ? "b" : "a";
  const team1 = { player1: player("a"), player2: null, score: winnerId === "a" ? winnerScore : loserScore };
  const team2 = { player1: player("b"), player2: null, score: winnerId === "a" ? loserScore : winnerScore };
  return {
    approvalStatus: approved ? "approved" : "Pending",
    team1: flip ? team2 : team1,
    team2: flip ? team1 : team2,
    result: {
      winner: { team: flip ? (winnerTeam === "Team 1" ? "Team 2" : "Team 1") : winnerTeam, players: [winnerId], score: winnerScore },
      loser: { team: "x", players: [loserId], score: loserScore },
    },
  };
};

const leg = (playoffLeg, games, matchStatus = "completed") => ({
  playoffLeg,
  games,
  matchStatus,
});

describe("getLadderPlayoffBestOf", () => {
  it("scales from the Final back", () => {
    const totalRounds = 7;
    const formats = [1, 2, 3, 4, 5, 6, 7].map((round) =>
      getLadderPlayoffBestOf({ round, totalRounds, isThirdPlacePlayoff: false }),
    );
    expect(formats).toEqual([5, 5, 5, 7, 7, 7, 7]);
    expect(
      getLadderPlayoffBestOf({ round: 7, totalRounds, isThirdPlacePlayoff: true }),
    ).toBe(7);
  });

  it("makes an 8-player bracket start at the Quarter-Finals", () => {
    expect(
      [1, 2, 3].map((round) =>
        getLadderPlayoffBestOf({ round, totalRounds: 3, isThirdPlacePlayoff: false }),
      ),
    ).toEqual([7, 7, 7]);
  });
});

describe("scheduleLadderPlayoffTie", () => {
  it("opens a 10-day window", () => {
    expect(scheduleLadderPlayoffTie(now)).toEqual({
      status: STATUS.SCHEDULED,
      scheduledAt: now,
      deadlineAt: new Date(now.getTime() + 10 * DAY_MS),
    });
  });
});

describe("getDueLadderPlayoffReminderDays", () => {
  const scheduled = { status: STATUS.SCHEDULED, scheduledAt: now, remindersSentDays: [] };
  const at = (days) => new Date(now.getTime() + days * DAY_MS);

  it("sends day 3, 6 and 9 once each", () => {
    expect(getDueLadderPlayoffReminderDays(scheduled, at(2))).toEqual([]);
    expect(getDueLadderPlayoffReminderDays(scheduled, at(3))).toEqual([3]);
    expect(
      getDueLadderPlayoffReminderDays({ ...scheduled, remindersSentDays: [3] }, at(6.5)),
    ).toEqual([6]);
    expect(
      getDueLadderPlayoffReminderDays({ ...scheduled, remindersSentDays: [3, 6] }, at(9)),
    ).toEqual([9]);
    expect(
      getDueLadderPlayoffReminderDays({ ...scheduled, remindersSentDays: [3, 6, 9] }, at(9.5)),
    ).toEqual([]);
  });

  it("catches up on reminders missed while the job was down", () => {
    expect(getDueLadderPlayoffReminderDays(scheduled, at(7))).toEqual([3, 6]);
  });

  it("only reminds scheduled ties", () => {
    expect(
      getDueLadderPlayoffReminderDays({ ...scheduled, status: STATUS.COMPLETED }, at(5)),
    ).toEqual([]);
    expect(
      getDueLadderPlayoffReminderDays({ ...scheduled, scheduledAt: null }, at(5)),
    ).toEqual([]);
  });
});

describe("coin toss", () => {
  it("lets the random draw pick the first host", () => {
    expect(flipLadderPlayoffCoin({ random: () => 0.2, userId: "a", now })).toEqual({
      firstHost: "team1",
      flippedBy: "a",
      flippedAt: now,
    });
    expect(flipLadderPlayoffCoin({ random: () => 0.7, userId: "b", now }).firstHost).toBe(
      "team2",
    );
  });

  it("has the other side host match 2 and the decider", () => {
    const coinToss = { firstHost: "team2" };
    expect(getLadderPlayoffLegHost(coinToss, 1)).toBe("team2");
    expect(getLadderPlayoffLegHost(coinToss, 2)).toBe("team1");
    expect(getLadderPlayoffLegHost(coinToss, 3)).toBe("team1");
  });
});

describe("tallyLadderPlayoffTie", () => {
  it("counts approved games and points per tie side across legs", () => {
    const tally = tallyLadderPlayoffTie(tie, [
      leg(1, [game("a", 21, 10), game("a", 21, 15), game("b", 21, 19, { approved: false })]),
      leg(2, [game("b", 21, 5)]),
    ]);
    expect(tally).toEqual({
      team1Games: 2,
      team2Games: 1,
      team1Points: 21 + 21 + 5,
      team2Points: 10 + 15 + 21,
      gamesPlayed: 3,
    });
  });

  it("maps games by player, not by the game's team labels", () => {
    const tally = tallyLadderPlayoffTie(tie, [leg(2, [game("a", 21, 12, { flip: true })])]);
    expect(tally).toMatchObject({ team1Games: 1, team2Games: 0, team1Points: 21, team2Points: 12 });
  });
});

describe("decideLadderPlayoffTie", () => {
  it("waits until both matches are complete", () => {
    expect(
      decideLadderPlayoffTie(tie, [leg(1, [game("a", 21, 10)]), leg(2, [], "accepted")]),
    ).toMatchObject({ decided: false, winner: null, deciderRequired: false });
  });

  it("sends the side with more games won through", () => {
    expect(
      decideLadderPlayoffTie(tie, [
        leg(1, [game("a", 21, 10), game("a", 21, 10), game("a", 21, 10)]),
        leg(2, [game("b", 21, 10), game("b", 21, 10), game("a", 21, 19), game("b", 21, 10)]),
      ]),
    ).toMatchObject({ decided: true, winner: "team1", deciderRequired: false });
  });

  it("asks for one deciding game when the aggregate is level", () => {
    const legs = [
      leg(1, [game("a", 21, 10), game("a", 21, 10), game("a", 21, 10)]),
      leg(2, [game("b", 21, 10), game("b", 21, 10), game("b", 21, 10)]),
    ];
    expect(decideLadderPlayoffTie(tie, legs)).toMatchObject({
      decided: false,
      deciderRequired: true,
    });
    expect(
      decideLadderPlayoffTie(tie, [...legs, leg(3, [game("b", 21, 19)])]),
    ).toMatchObject({ decided: true, winner: "team2", deciderRequired: true });
  });

  it("keeps waiting while the decider isn't complete", () => {
    expect(
      decideLadderPlayoffTie(tie, [
        leg(1, [game("a", 21, 10)]),
        leg(2, [game("b", 21, 10)]),
        leg(3, [], "accepted"),
      ]),
    ).toMatchObject({ decided: false, deciderRequired: true });
  });
});

describe("decideLadderPlayoffTieAtDeadline", () => {
  it("is void when nothing was played", () => {
    expect(decideLadderPlayoffTieAtDeadline(tie, [])).toEqual({
      winner: null,
      outcome: OUTCOME.VOID,
    });
  });

  it("uses games, then points, then the higher-ranked side", () => {
    expect(
      decideLadderPlayoffTieAtDeadline(tie, [leg(1, [game("b", 21, 10)], "accepted")]),
    ).toEqual({ winner: "team2", outcome: OUTCOME.DEADLINE });
    expect(
      decideLadderPlayoffTieAtDeadline(tie, [
        leg(1, [game("a", 21, 19), game("b", 21, 5)], "accepted"),
      ]),
    ).toEqual({ winner: "team2", outcome: OUTCOME.DEADLINE });
    expect(
      decideLadderPlayoffTieAtDeadline(tie, [
        leg(1, [game("a", 21, 15), game("b", 21, 15)], "accepted"),
      ]),
    ).toEqual({ winner: "team1", outcome: OUTCOME.DEADLINE });
  });
});

const entrant = (key) => ({
  entrantKey: key,
  teamId: null,
  players: [player(key)],
  competitionXP: 0,
  numberOfWins: 0,
  totalPointDifference: 0,
  globalXp: 0,
  joinedAt: null,
  homeCourt: null,
});

const bracket = (size) =>
  buildLadderPlayoffTies({
    ladderId: "L1",
    qualifiers: Array.from({ length: size }, (_, index) => entrant(`p${index}`)),
    createdAt: new Date("2026-10-01T00:00:00Z"),
  });

const byId = (ties) => new Map(ties.map((t) => [t.tieId, t]));

const apply = (ties, changes) => {
  const map = byId(ties);
  changes.forEach((t) => map.set(t.tieId, t));
  return [...map.values()];
};

describe("buildLadderPlayoffTies scheduling", () => {
  it("opens round 1 for 10 days and sets each round's format", () => {
    const ties = byId(bracket(8));
    expect(ties.get("r1-s0")).toMatchObject({
      bestOf: 7,
      status: STATUS.SCHEDULED,
      deadlineAt: new Date(new Date("2026-10-01T00:00:00Z").getTime() + 10 * DAY_MS),
    });
    expect(ties.get("r2-s0")).toMatchObject({ bestOf: 7, scheduledAt: null });
    expect(ties.get("r3-s0")).toMatchObject({ bestOf: 7 });
    expect(ties.get("r3-s1")).toMatchObject({ bestOf: 7, isThirdPlacePlayoff: true });
  });
});

describe("advanceLadderPlayoffBracket", () => {
  it("fills the winner's next slot and waits for the other feeder", () => {
    const ties = bracket(8);
    const changes = byId(
      advanceLadderPlayoffBracket({ ties, tieId: "r1-s0", winner: "team2", outcome: OUTCOME.PLAYED, now }),
    );
    expect(changes.get("r1-s0")).toMatchObject({
      status: STATUS.COMPLETED,
      winner: "team2",
      outcome: OUTCOME.PLAYED,
      completedAt: now,
    });
    const next = changes.get("r2-s0");
    expect(next.side1.entrantKey).toBe(byId(ties).get("r1-s0").side2.entrantKey);
    expect(next.team1.player1.userId).toBe(next.side1.entrantKey);
    expect(next.status).toBe(STATUS.AWAITING_ENTRANTS);
  });

  it("starts the next tie's 10-day window once both feeders finish", () => {
    let ties = bracket(8);
    ties = apply(ties, advanceLadderPlayoffBracket({ ties, tieId: "r1-s0", winner: "team1", outcome: OUTCOME.PLAYED, now }));
    const changes = byId(
      advanceLadderPlayoffBracket({ ties, tieId: "r1-s1", winner: "team1", outcome: OUTCOME.PLAYED, now }),
    );
    expect(changes.get("r2-s0")).toMatchObject({
      status: STATUS.SCHEDULED,
      scheduledAt: now,
      deadlineAt: new Date(now.getTime() + 10 * DAY_MS),
    });
    expect(changes.get("r2-s0").side2.entrantKey).toBe(byId(ties).get("r1-s1").side1.entrantKey);
  });

  it("gives the next-round opponent a walkover when a tie is void", () => {
    let ties = bracket(8);
    ties = apply(ties, advanceLadderPlayoffBracket({ ties, tieId: "r1-s0", winner: "team1", outcome: OUTCOME.PLAYED, now }));
    const changes = byId(
      advanceLadderPlayoffBracket({ ties, tieId: "r1-s1", winner: null, outcome: OUTCOME.VOID, now }),
    );
    expect(changes.get("r2-s0")).toMatchObject({
      status: STATUS.COMPLETED,
      winner: "team1",
      outcome: OUTCOME.WALKOVER,
    });
    expect(changes.get("r3-s0").side1.entrantKey).toBe(byId(ties).get("r1-s0").side1.entrantKey);
  });

  it("voids a tie when both feeders are void, and keeps going up", () => {
    let ties = bracket(8);
    ties = apply(ties, advanceLadderPlayoffBracket({ ties, tieId: "r1-s0", winner: null, outcome: OUTCOME.VOID, now }));
    const changes = byId(
      advanceLadderPlayoffBracket({ ties, tieId: "r1-s1", winner: null, outcome: OUTCOME.VOID, now }),
    );
    expect(changes.get("r2-s0")).toMatchObject({
      status: STATUS.COMPLETED,
      winner: null,
      outcome: OUTCOME.VOID,
    });
    expect(changes.get("r3-s0").side1).toBeNull();
    expect(changes.get("r3-s1").side1).toBeNull();
  });

  it("sends semi-final losers to the 3rd-place game and starts both last ties", () => {
    let ties = bracket(4);
    ties = apply(ties, advanceLadderPlayoffBracket({ ties, tieId: "r1-s0", winner: "team1", outcome: OUTCOME.PLAYED, now }));
    const changes = byId(
      advanceLadderPlayoffBracket({ ties, tieId: "r1-s1", winner: "team2", outcome: OUTCOME.PLAYED, now }),
    );
    const original = byId(bracket(4));
    const final = changes.get("r2-s0");
    const thirdPlace = changes.get("r2-s1");
    expect(final.side1.entrantKey).toBe(original.get("r1-s0").side1.entrantKey);
    expect(final.side2.entrantKey).toBe(original.get("r1-s1").side2.entrantKey);
    expect(thirdPlace.side1.entrantKey).toBe(original.get("r1-s0").side2.entrantKey);
    expect(thirdPlace.side2.entrantKey).toBe(original.get("r1-s1").side1.entrantKey);
    expect(final.status).toBe(STATUS.SCHEDULED);
    expect(thirdPlace.status).toBe(STATUS.SCHEDULED);
  });

  it("gives the 3rd-place game a walkover when a semi-final was a walkover", () => {
    let ties = bracket(4);
    ties = apply(ties, advanceLadderPlayoffBracket({ ties, tieId: "r1-s0", winner: null, outcome: OUTCOME.VOID, now }));
    const changes = byId(
      advanceLadderPlayoffBracket({ ties, tieId: "r1-s1", winner: "team1", outcome: OUTCOME.PLAYED, now }),
    );
    expect(changes.get("r2-s0")).toMatchObject({ winner: "team2", outcome: OUTCOME.WALKOVER });
    expect(changes.get("r2-s1")).toMatchObject({ winner: "team2", outcome: OUTCOME.WALKOVER });
  });

  it("stops at the Final", () => {
    let ties = bracket(2);
    const changes = advanceLadderPlayoffBracket({ ties, tieId: "r1-s0", winner: "team1", outcome: OUTCOME.PLAYED, now });
    expect(changes.map((t) => t.tieId)).toEqual(["r1-s0"]);
  });
});

describe("buildLadderPlayoffLegMatch", () => {
  const court = { courtId: "c1", courtName: "Court" };
  const input = {
    court,
    matchDate: "2026-10-12",
    matchTime: { start: "18:00" },
    currencyType: "GBP",
    shuttleType: "Feather",
  };
  const doublesTie = {
    tieId: "r1-s0",
    bestOf: 5,
    side1: { entrantKey: "a_b", teamId: "t1", playerIds: ["a", "b"], rank: 1, homeCourt: null },
    side2: { entrantKey: "c_d", teamId: "t2", playerIds: ["c", "d"], rank: 2, homeCourt: null },
  };

  it("builds a posted, fee-free match hosted by the given side", () => {
    const match = buildLadderPlayoffLegMatch({
      tie: doublesTie,
      leg: 1,
      host: "team2",
      ladderMatchId: "m1",
      ladderType: "Doubles",
      input,
      createdBy: "c",
      now,
    });
    expect(match).toMatchObject({
      ladderMatchId: "m1",
      bestOf: 5,
      courtFee: 0,
      matchStatus: "posted",
      participants: ["c", "d", "a", "b"],
      teams: [
        { teamId: "t2", teamKey: "c_d", playerIds: ["c", "d"] },
        { teamId: "t1", teamKey: "a_b", playerIds: ["a", "b"] },
      ],
      playoffTieId: "r1-s0",
      playoffLeg: 1,
      createdBy: "c",
    });
    expect(match.games.map((g) => g.gameId)).toEqual(["m1-g1", "m1-g2", "m1-g3", "m1-g4", "m1-g5"]);
  });

  it("makes the decider a single accepted game with no teams for singles", () => {
    const singlesTie = {
      ...doublesTie,
      side1: { ...doublesTie.side1, playerIds: ["a"], teamId: null },
      side2: { ...doublesTie.side2, playerIds: ["c"], teamId: null },
    };
    const match = buildLadderPlayoffLegMatch({
      tie: singlesTie,
      leg: 3,
      host: "team1",
      ladderMatchId: "m3",
      ladderType: "Singles",
      input,
      createdBy: "system",
      now,
      accepted: true,
    });
    expect(match).toMatchObject({ bestOf: 1, matchStatus: "accepted", acceptedAt: now, playoffLeg: 3 });
    expect(match.teams).toBeUndefined();
    expect(match.games).toHaveLength(1);
  });

  it("needs both sides", () => {
    expect(() =>
      buildLadderPlayoffLegMatch({
        tie: { ...doublesTie, side2: null },
        leg: 1,
        host: "team1",
        ladderMatchId: "m1",
        ladderType: "Doubles",
        input,
        createdBy: "a",
        now,
      }),
    ).toThrow("needs both sides");
  });
});
