import { createRootTeam } from "../createRootTeam";

const member = (over = {}) => ({
  userId: over.userId ?? "u1",
  username: over.username ?? "user1",
  firstName: over.firstName ?? "First",
  lastName: over.lastName ?? "Last",
  ...over,
});

describe("createRootTeam", () => {
  const players = [
    member({ userId: "zeta", firstName: "Zed", lastName: "Zephyr" }),
    member({ userId: "alpha", firstName: "Al", lastName: "Apple" }),
  ];

  it("keys the team by the normalized (sorted) member ids", () => {
    const team = createRootTeam({ players, createdBy: "zeta" });
    expect(team.teamKey).toBe("alpha-zeta");
    expect(team.playerIds).toEqual(["zeta", "alpha"]);
  });

  it("stores the roster and display names", () => {
    const team = createRootTeam({ players, createdBy: "zeta" });
    expect(team.players).toHaveLength(2);
    expect(team.team).toEqual(["Zed Zephyr", "Al Apple"]);
  });

  it("falls back to username when a member has no name", () => {
    const team = createRootTeam({
      players: [member({ userId: "x", firstName: "", lastName: "", username: "noname" })],
      createdBy: "x",
    });
    expect(team.team).toEqual(["noname"]);
  });

  it("sets a trimmed custom teamName only when provided", () => {
    expect(createRootTeam({ players, createdBy: "zeta" }).teamName).toBeUndefined();
    expect(
      createRootTeam({ players, createdBy: "zeta", teamName: "  Smash Bros  " })
        .teamName,
    ).toBe("Smash Bros");
    expect(
      createRootTeam({ players, createdBy: "zeta", teamName: "   " }).teamName,
    ).toBeUndefined();
  });

  it("zeroes lifetime stats and records the creator", () => {
    const team = createRootTeam({ players, createdBy: "zeta" });
    expect(team.numberOfWins).toBe(0);
    expect(team.XP).toBe(0);
    expect(team.createdBy).toBe("zeta");
    expect(team.createdAt).toBeInstanceOf(Date);
  });
});
