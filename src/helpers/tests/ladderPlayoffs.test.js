import { LADDER_PLAYOFF_TIE_STATUS } from "../../types/ladderPlayoff";
import {
  buildLadderPlayoffTies,
  compareLadderPlayoffEntrants,
  getLadderPlayoffBracketSize,
  getLadderPlayoffQualifiers,
  ladderPlayoffTiesToFixtures,
  orderLadderPlayoffEntrantsByProximity,
  rankLadderPlayoffEntrants,
} from "../ladderPlayoffs";

const CITIES = {
  london: [51.5074, -0.1278],
  croydon: [51.3762, -0.0982],
  manchester: [53.4808, -2.2426],
  salford: [53.4875, -2.2901],
  birmingham: [52.4862, -1.8904],
  coventry: [52.4068, -1.5197],
  leeds: [53.8008, -1.5491],
  bradford: [53.7960, -1.7594],
};

const homeCourt = (city) =>
  city
    ? {
        courtId: `court-${city}`,
        courtName: city,
        location: {
          city,
          country: "United Kingdom",
          countryCode: "GB",
          postCode: "",
          address: "",
          latitude: CITIES[city][0],
          longitude: CITIES[city][1],
        },
      }
    : null;

const entrant = (key, overrides = {}) => ({
  entrantKey: key,
  teamId: null,
  players: [{ userId: key, firstName: key, lastName: "", username: key }],
  competitionXP: 0,
  numberOfWins: 0,
  totalPointDifference: 0,
  globalXp: 0,
  joinedAt: null,
  homeCourt: null,
  ...overrides,
});

const keys = (entrants) => entrants.map((e) => e.entrantKey);

describe("compareLadderPlayoffEntrants", () => {
  it("ranks by CP, then wins, then point difference", () => {
    const ranked = rankLadderPlayoffEntrants([
      entrant("pd", { competitionXP: 10, numberOfWins: 2, totalPointDifference: 5 }),
      entrant("cp", { competitionXP: 20 }),
      entrant("wins", { competitionXP: 10, numberOfWins: 3 }),
      entrant("low", { competitionXP: 10, numberOfWins: 2, totalPointDifference: 1 }),
    ]);
    expect(keys(ranked)).toEqual(["cp", "wins", "pd", "low"]);
  });

  it("then prefers the higher global rank", () => {
    const ranked = rankLadderPlayoffEntrants([
      entrant("lower", { globalXp: 100 }),
      entrant("higher", { globalXp: 900 }),
    ]);
    expect(keys(ranked)).toEqual(["higher", "lower"]);
  });

  it("then prefers whoever joined first, with unknown join times last", () => {
    const ranked = rankLadderPlayoffEntrants([
      entrant("unknown"),
      entrant("later", { joinedAt: new Date("2026-02-02") }),
      entrant("earlier", { joinedAt: new Date("2026-02-01") }),
    ]);
    expect(keys(ranked)).toEqual(["earlier", "later", "unknown"]);
  });

  it("falls back to the entrant key so the order is always the same", () => {
    expect(compareLadderPlayoffEntrants(entrant("a"), entrant("b"))).toBeLessThan(0);
    expect(compareLadderPlayoffEntrants(entrant("b"), entrant("a"))).toBeGreaterThan(0);
  });

  it("includes entrants with no wins", () => {
    const ranked = rankLadderPlayoffEntrants([
      entrant("winless", { competitionXP: 0 }),
      entrant("winner", { competitionXP: 5, numberOfWins: 1 }),
    ]);
    expect(keys(ranked)).toEqual(["winner", "winless"]);
  });
});

describe("getLadderPlayoffBracketSize", () => {
  it("uses the playoff spots for the registrations", () => {
    expect(
      getLadderPlayoffBracketSize({
        registeredCount: 2048,
        maxPlayers: 2048,
        entrantCount: 2048,
      }),
    ).toBe(128);
    expect(
      getLadderPlayoffBracketSize({
        registeredCount: 600,
        maxPlayers: 2048,
        entrantCount: 600,
      }),
    ).toBe(32);
    expect(
      getLadderPlayoffBracketSize({
        registeredCount: 150,
        maxPlayers: 256,
        entrantCount: 150,
      }),
    ).toBe(8);
  });

  it("shrinks to the largest power of two the entrants can fill", () => {
    expect(
      getLadderPlayoffBracketSize({
        registeredCount: 256,
        maxPlayers: 256,
        entrantCount: 12,
      }),
    ).toBe(8);
  });

  it("is 0 below the minimum size or with fewer than 2 entrants", () => {
    expect(
      getLadderPlayoffBracketSize({ registeredCount: 100, entrantCount: 100 }),
    ).toBe(0);
    expect(
      getLadderPlayoffBracketSize({ registeredCount: 300, entrantCount: 1 }),
    ).toBe(0);
  });
});

describe("getLadderPlayoffQualifiers", () => {
  const located = (key, overrides = {}) =>
    entrant(key, { homeCourt: homeCourt("london"), ...overrides });

  it("only qualifies entrants with a home court", () => {
    const entrants = [
      entrant("no-court-top", { competitionXP: 1000 }),
      ...Array.from({ length: 9 }, (_, index) =>
        located(`p${index}`, { competitionXP: 100 - index }),
      ),
    ];
    const { bracketSize, qualifiers } = getLadderPlayoffQualifiers({
      entrants,
      registeredCount: 150,
      maxPlayers: 256,
    });
    expect(bracketSize).toBe(8);
    expect(keys(qualifiers)).toEqual([
      "p0",
      "p1",
      "p2",
      "p3",
      "p4",
      "p5",
      "p6",
      "p7",
    ]);
  });

  it("shrinks the bracket when too few have a home court", () => {
    const entrants = [
      ...Array.from({ length: 5 }, (_, index) => located(`p${index}`)),
      ...Array.from({ length: 200 }, (_, index) => entrant(`none${index}`)),
    ];
    const { bracketSize, qualifiers } = getLadderPlayoffQualifiers({
      entrants,
      registeredCount: 205,
      maxPlayers: 256,
    });
    expect(bracketSize).toBe(4);
    expect(qualifiers).toHaveLength(4);
  });

  it("ignores a home court without map coordinates", () => {
    const noCoordinates = {
      ...homeCourt("london"),
      location: { ...homeCourt("london").location, latitude: null, longitude: null },
    };
    const { bracketSize } = getLadderPlayoffQualifiers({
      entrants: [
        located("a"),
        entrant("b", { homeCourt: noCoordinates }),
      ],
      registeredCount: 200,
      maxPlayers: 256,
    });
    expect(bracketSize).toBe(0);
  });
});

describe("orderLadderPlayoffEntrantsByProximity", () => {
  const ranked = [
    entrant("london", { homeCourt: homeCourt("london") }),
    entrant("manchester", { homeCourt: homeCourt("manchester") }),
    entrant("birmingham", { homeCourt: homeCourt("birmingham") }),
    entrant("leeds", { homeCourt: homeCourt("leeds") }),
    entrant("croydon", { homeCourt: homeCourt("croydon") }),
    entrant("salford", { homeCourt: homeCourt("salford") }),
    entrant("coventry", { homeCourt: homeCourt("coventry") }),
    entrant("bradford", { homeCourt: homeCourt("bradford") }),
  ];

  const pairs = (ordered) =>
    Array.from({ length: ordered.length / 2 }, (_, index) =>
      [ordered[index * 2].entrantKey, ordered[index * 2 + 1].entrantKey].sort(),
    );

  it("pairs each entrant with their nearest neighbour in round 1", () => {
    expect(pairs(orderLadderPlayoffEntrantsByProximity(ranked)).sort()).toEqual(
      [
        ["birmingham", "coventry"],
        ["bradford", "leeds"],
        ["croydon", "london"],
        ["manchester", "salford"],
      ],
    );
  });

  it("keeps the south and north halves apart until later rounds", () => {
    const ordered = keys(orderLadderPlayoffEntrantsByProximity(ranked));
    expect(ordered.slice(0, 4).sort()).toEqual([
      "birmingham",
      "coventry",
      "croydon",
      "london",
    ]);
    expect(ordered.slice(4).sort()).toEqual([
      "bradford",
      "leeds",
      "manchester",
      "salford",
    ]);
  });

  it("is deterministic", () => {
    expect(keys(orderLadderPlayoffEntrantsByProximity(ranked))).toEqual(
      keys(orderLadderPlayoffEntrantsByProximity(ranked)),
    );
  });
});

describe("buildLadderPlayoffTies", () => {
  const qualifiers = [
    entrant("london", { homeCourt: homeCourt("london") }),
    entrant("manchester", { homeCourt: homeCourt("manchester") }),
    entrant("croydon", { homeCourt: homeCourt("croydon") }),
    entrant("salford", { homeCourt: homeCourt("salford") }),
  ];
  const createdAt = new Date("2026-10-06T00:00:00Z");
  const ties = buildLadderPlayoffTies({
    ladderId: "L1",
    qualifiers,
    createdAt,
  });

  it("creates every slot including the 3rd-place playoff", () => {
    expect(ties.map((tie) => tie.tieId)).toEqual([
      "r1-s0",
      "r1-s1",
      "r2-s0",
      "r2-s1",
    ]);
    expect(ties.map((tie) => tie.isThirdPlacePlayoff)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it("fills round 1 by proximity with each side's ranking position", () => {
    const roundOne = ties.filter((tie) => tie.round === 1);
    const matchups = roundOne.map((tie) =>
      [tie.side1.entrantKey, tie.side2.entrantKey].sort(),
    );
    expect(matchups.sort()).toEqual([
      ["croydon", "london"],
      ["manchester", "salford"],
    ]);
    const london = roundOne
      .flatMap((tie) => [tie.side1, tie.side2])
      .find((side) => side.entrantKey === "london");
    expect(london).toMatchObject({ rank: 1, playerIds: ["london"] });
    expect(london.homeCourt.courtId).toBe("court-london");
    roundOne.forEach((tie) => {
      expect(tie.status).toBe(LADDER_PLAYOFF_TIE_STATUS.SCHEDULED);
      expect(tie.team1.player1.userId).toBe(tie.side1.entrantKey);
      expect(tie.team2.player1.userId).toBe(tie.side2.entrantKey);
    });
  });

  it("leaves later rounds empty and awaiting entrants", () => {
    ties
      .filter((tie) => tie.round > 1)
      .forEach((tie) => {
        expect(tie).toMatchObject({
          side1: null,
          side2: null,
          team1: { player1: null, player2: null },
          team2: { player1: null, player2: null },
          status: LADDER_PLAYOFF_TIE_STATUS.AWAITING_ENTRANTS,
          winner: null,
        });
      });
  });

  it("stamps the ladder and creation time on every slot", () => {
    ties.forEach((tie) => {
      expect(tie.ladderId).toBe("L1");
      expect(tie.createdAt).toBe(createdAt);
    });
  });

  it("puts both doubles players on the bracket side", () => {
    const [tie] = buildLadderPlayoffTies({
      ladderId: "L2",
      qualifiers: [
        entrant("a_b", {
          teamId: "team-ab",
          players: [
            { userId: "a", firstName: "A", lastName: "", username: "a" },
            { userId: "b", firstName: "B", lastName: "", username: "b" },
          ],
        }),
        entrant("c_d", {
          teamId: "team-cd",
          players: [
            { userId: "c", firstName: "C", lastName: "", username: "c" },
            { userId: "d", firstName: "D", lastName: "", username: "d" },
          ],
        }),
      ],
      createdAt,
    });
    expect(tie.team1.player2.userId).toBe("b");
    expect(tie.side1).toMatchObject({ teamId: "team-ab", playerIds: ["a", "b"] });
  });
});

describe("ladderPlayoffTiesToFixtures", () => {
  it("groups ties into rounds in slot order", () => {
    const ties = buildLadderPlayoffTies({
      ladderId: "L1",
      qualifiers: ["a", "b", "c", "d"].map((key) => entrant(key)),
    });
    const fixtures = ladderPlayoffTiesToFixtures([...ties].reverse());
    expect(fixtures.map((round) => round.round)).toEqual([1, 2]);
    expect(fixtures[0].games.map((game) => game.gameId)).toEqual([
      "r1-s0",
      "r1-s1",
    ]);
    expect(fixtures[1].games.map((game) => game.isThirdPlacePlayoff)).toEqual([
      false,
      true,
    ]);
  });
});
