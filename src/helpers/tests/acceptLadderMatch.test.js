import {
  canAcceptLadderMatch,
  buildAcceptedLadderMatch,
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
    const update = buildAcceptedLadderMatch(
      makeMatch(),
      "accepter-2",
      undefined,
      when
    );
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

describe("canAcceptLadderMatch (doubles, with team)", () => {
  it("accepts a posted match whose players don't overlap and second slot is open", () => {
    expect(
      canAcceptLadderMatch(makeDoublesMatch(), "accepter-3", opponentTeam)
    ).toBe(true);
  });

  it("rejects when any of the team's players is already a participant", () => {
    const team = { ...opponentTeam, playerIds: ["poster-1", "accepter-4"] };
    expect(canAcceptLadderMatch(makeDoublesMatch(), "poster-1", team)).toBe(
      false
    );
  });

  it("rejects the poster's own team", () => {
    const team = {
      teamId: "team-a",
      teamKey: "poster-1_poster-2",
      playerIds: ["poster-1", "poster-2"],
    };
    expect(canAcceptLadderMatch(makeDoublesMatch(), "poster-1", team)).toBe(
      false
    );
  });

  it("rejects when the match is not posted", () => {
    const accepted = makeDoublesMatch({ matchStatus: LADDER_MATCH_STATUS.ACCEPTED });
    expect(canAcceptLadderMatch(accepted, "accepter-3", opponentTeam)).toBe(
      false
    );
  });

  it("rejects when both team slots are already filled", () => {
    const full = makeDoublesMatch({
      teams: [
        { teamId: "team-a", teamKey: "poster-1_poster-2", playerIds: ["poster-1", "poster-2"] },
        opponentTeam,
      ],
    });
    const team = {
      teamId: "team-c",
      teamKey: "accepter-5_accepter-6",
      playerIds: ["accepter-5", "accepter-6"],
    };
    expect(canAcceptLadderMatch(full, "accepter-5", team)).toBe(false);
  });
});

describe("buildAcceptedLadderMatch (doubles, with team)", () => {
  it("appends the team's players and the team, and flips status to accepted", () => {
    const update = buildAcceptedLadderMatch(
      makeDoublesMatch(),
      "accepter-3",
      opponentTeam
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

  it("singles accept carries no teams field", () => {
    const update = buildAcceptedLadderMatch(makeMatch(), "accepter-2");
    expect("teams" in update).toBe(false);
  });

  it("does not mutate the original match arrays", () => {
    const match = makeDoublesMatch();
    buildAcceptedLadderMatch(match, "accepter-3", opponentTeam);
    expect(match.participants).toEqual(["poster-1", "poster-2"]);
    expect(match.teams).toHaveLength(1);
  });
});
