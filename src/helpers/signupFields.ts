/** Longest address email standards allow (RFC 5321). */
export const EMAIL_MAX_LENGTH = 254;
export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_CHARACTERS = /^[a-zA-Z0-9-]+$/;

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** Usernames are matched case-insensitively (stored as `usernameLower`). */
export const normaliseUsername = (username: string) =>
  username.trim().toLowerCase();

/** Why an email can't be used, or null when it can. */
export const getEmailRuleError = (email: string): string | null => {
  if (!email) return "Email is required";
  if (email.length > EMAIL_MAX_LENGTH) {
    return `Email must be ${EMAIL_MAX_LENGTH} characters or fewer`;
  }
  if (!EMAIL_PATTERN.test(email)) return "Invalid email format";
  return null;
};

/**
 * Why a username breaks the sign-up rules, or null when it doesn't:
 * 4-10 letters, numbers and single dashes, not starting or ending with a dash.
 */
export const getUsernameRuleError = (rawValue: string): string | null => {
  const value = rawValue.trim();
  if (!value) return "Username is required";
  if (value.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }
  if (value.length > USERNAME_MAX_LENGTH) {
    return `Username cannot exceed ${USERNAME_MAX_LENGTH} characters`;
  }
  if (/\s/.test(value)) return "Spaces are not allowed";
  if (!USERNAME_CHARACTERS.test(value)) {
    return "Only letters, numbers, and dashes (-) are allowed";
  }
  if (value.startsWith("-") || value.endsWith("-")) {
    return "Username can't start or end with a dash";
  }
  if (value.includes("--")) return "Username can't have two dashes in a row";
  return null;
};
