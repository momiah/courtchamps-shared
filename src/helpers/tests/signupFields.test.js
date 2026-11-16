import {
  getEmailRuleError,
  getUsernameRuleError,
  normaliseEmail,
  normaliseUsername,
  EMAIL_MAX_LENGTH,
} from "../signupFields";

describe("signup field rules", () => {
  it("accepts a normal email and rejects malformed or long ones", () => {
    expect(getEmailRuleError("player@example.com")).toBeNull();
    expect(getEmailRuleError("")).toBe("Email is required");
    expect(getEmailRuleError("not-an-email")).toBe("Invalid email format");
    expect(getEmailRuleError(`${"a".repeat(EMAIL_MAX_LENGTH)}@x.io`)).toMatch(
      /characters or fewer/,
    );
  });

  it("normalises emails and usernames", () => {
    expect(normaliseEmail("  Player@Example.COM ")).toBe("player@example.com");
    expect(normaliseUsername(" Ace-1 ")).toBe("ace-1");
  });

  it.each([
    ["ace1", null],
    ["ace-12", null],
    ["", "Username is required"],
    ["abc", "Username must be at least 4 characters"],
    ["abcdefghijk", "Username cannot exceed 10 characters"],
    ["ab cd", "Spaces are not allowed"],
    ["ab_cd", "Only letters, numbers, and dashes (-) are allowed"],
    ["-abcd", "Username can't start or end with a dash"],
    ["abcd-", "Username can't start or end with a dash"],
    ["ab--cd", "Username can't have two dashes in a row"],
  ])("username %p -> %p", (value, error) => {
    expect(getUsernameRuleError(value)).toBe(error);
  });
});
