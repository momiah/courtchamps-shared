import {
  canAcceptLadderMatch,
  buildAcceptedLadderMatch,
  canTeamAcceptLadderMatch,
  buildTeamAcceptedLadderMatch,
} from "../acceptLadderMatch";
import { LADDER_MATCH_STATUS } from "../../types/ladderMatch";

const makeMatch = (overrides = {}) => ({
  ladderMatchId: "match-1",
  court: {},
  bestOf: 5,
  matchDate: "2026-09-01",
  matchTime: { start: "18:00" },
  courtFee: 0,
  currencyType: "GBP",
  participants: ["poster-1"],
  games: [],
  matchStatus: LADDER_MATCH_STATUS.POSTED,
  shuttleType: "Feather",
  createdBy: "poster-1",
  createdAt: new Date(),
  ...overrides,
});

describe("canAcceptLadderMatch", () => {
  it("accepts a posted match the user is not part of and that isn't full", () => {
    expect(canAcceptLadderMatch(makeMatch(), "accepter-2")).toBe(true);
  });

  it("rejects when the user is already a participant", () => {
    expect(canAcceptLadderMatch(makeMatch(), "poster-1")).toBe(false);
  });

  it("rejects when the match is not posted", () => {
    const accepted = makeMatch({
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
    });
    expect(canAcceptLadderMatch(accepted, "accepter-2")).toBe(false);
  });

  it("rejects when the match is already full (singles)", () => {
    const full = makeMatch({ participants: ["poster-1", "accepter-2"] });
    expect(canAcceptLadderMatch(full, "accepter-3")).toBe(false);
  });
});

describe("buildAcceptedLadderMatch", () => {
  it("flips status posted -> accepted and appends the accepter", () => {
    const update = buildAcceptedLadderMatch(makeMatch(), "accepter-2");
    expect(update.matchStatus).toBe(LADDER_MATCH_STATUS.ACCEPTED);
    expect(update.participants).toEqual(["poster-1", "accepter-2"]);
    expect(update.acceptedBy).toBe("accepter-2");
    expect(update.acceptedAt).toBeInstanceOf(Date);
  });

  it("uses the supplied acceptedAt when provided", () => {
    const when = new Date("2026-08-21T10:00:00.000Z");
    const update = buildAcceptedLadderMatch(makeMatch(), "accepter-2", when);
    expect(update.acceptedAt).toBe(when);
  });

  it("does not mutate the original participants array", () => {
    const match = makeMatch();
    buildAcceptedLadderMatch(match, "accepter-2");
    expect(match.participants).toEqual(["poster-1"]);
  });
});

const makeDoublesMatch = (overrides = {}) =>
  makeMatch({
    participants: ["poster-1", "poster-2"],
    ladderType: "Doubles",
    teams: [
      { teamId: "team-a", teamKey: "poster-1_poster-2", playerIds: ["poster-1", "poster-2"] },
    ],
    ...overrides,
  });

const opponentTeam = {
  teamId: "team-b",
  teamKey: "accepter-3_accepter-4",
  playerIds: ["accepter-3", "accepter-4"],
};

describe("canTeamAcceptLadderMatch", () => {
  it("accepts a posted match whose players don't overlap and second slot is open", () => {
    expect(
      canTeamAcceptLadderMatch(makeDoublesMatch(), opponentTeam.playerIds)
    ).toBe(true);
  });

  it("rejects when any of the team's players is already a participant", () => {
    expect(canTeamAcceptLadderMatch(makeDoublesMatch(), ["poster-1", "accepter-4"])).toBe(
      false
    );
  });

  it("rejects the poster's own team", () => {
    expect(
      canTeamAcceptLadderMatch(makeDoublesMatch(), ["poster-1", "poster-2"])
    ).toBe(false);
  });

  it("rejects when the match is not posted", () => {
    const accepted = makeDoublesMatch({ matchStatus: LADDER_MATCH_STATUS.ACCEPTED });
    expect(canTeamAcceptLadderMatch(accepted, opponentTeam.playerIds)).toBe(false);
  });

  it("rejects when both team slots are already filled", () => {
    const full = makeDoublesMatch({
      teams: [
        { teamId: "team-a", teamKey: "poster-1_poster-2", playerIds: ["poster-1", "poster-2"] },
        opponentTeam,
      ],
    });
    expect(canTeamAcceptLadderMatch(full, ["accepter-5", "accepter-6"])).toBe(false);
  });
});

describe("buildTeamAcceptedLadderMatch", () => {
  it("appends the team's players and the team, and flips status to accepted", () => {
    const update = buildTeamAcceptedLadderMatch(
      makeDoublesMatch(),
      opponentTeam,
      "accepter-3"
    );
    expect(update.matchStatus).toBe(LADDER_MATCH_STATUS.ACCEPTED);
    expect(update.participants).toEqual([
      "poster-1",
      "poster-2",
      "accepter-3",
      "accepter-4",
    ]);
    expect(update.teams).toHaveLength(2);
    expect(update.teams[1]).toEqual(opponentTeam);
    expect(update.acceptedBy).toBe("accepter-3");
    expect(update.acceptedAt).toBeInstanceOf(Date);
  });

  it("does not mutate the original match arrays", () => {
    const match = makeDoublesMatch();
    buildTeamAcceptedLadderMatch(match, opponentTeam, "accepter-3");
    expect(match.participants).toEqual(["poster-1", "poster-2"]);
    expect(match.teams).toHaveLength(1);
  });
});
