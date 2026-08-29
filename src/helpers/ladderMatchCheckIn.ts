import type { LadderMatch, LadderMatchCheckIn } from "../types/ladderMatch";

/** Number of trailing characters of the match id used for the reference code. */
export const LADDER_CHECKIN_REFERENCE_LENGTH = 6;

/**
 * Derive the human-readable check-in reference code for a match. It is not a
 * stored field — both players compute the same code from `ladderMatchId`
 * (its last {@link LADDER_CHECKIN_REFERENCE_LENGTH} characters, uppercased) so
 * it can be read out loud as a fallback when scanning isn't possible.
 */
export const getLadderMatchReference = (ladderMatchId: string): string =>
  (ladderMatchId ?? "")
    .slice(-LADDER_CHECKIN_REFERENCE_LENGTH)
    .toUpperCase();

/** The minimal payload encoded in the poster's check-in QR code. */
export interface LadderCheckInPayload {
  ladderMatchId: string;
  reference: string;
}

/**
 * Build the QR payload for a match: just the id and its derived reference, kept
 * minimal so the QR stays easy to scan. Encode with `JSON.stringify` for the QR
 * value; decode the scanned string with {@link parseLadderCheckInPayload}.
 */
export const buildLadderCheckInPayload = (
  match: Pick<LadderMatch, "ladderMatchId">,
): LadderCheckInPayload => ({
  ladderMatchId: match.ladderMatchId,
  reference: getLadderMatchReference(match.ladderMatchId),
});

/**
 * Parse a scanned QR string back into a {@link LadderCheckInPayload}. Returns
 * `null` for anything that isn't the expected shape (malformed JSON, a QR from
 * elsewhere, missing fields) so the caller can reject it.
 */
export const parseLadderCheckInPayload = (
  raw: string,
): LadderCheckInPayload | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<LadderCheckInPayload>;
    if (
      parsed &&
      typeof parsed.ladderMatchId === "string" &&
      typeof parsed.reference === "string"
    ) {
      return {
        ladderMatchId: parsed.ladderMatchId,
        reference: parsed.reference,
      };
    }
  } catch {
    // fall through to null
  }
  return null;
};

/**
 * True when a scanned QR string belongs to `match`: it parses to a valid
 * payload whose id and derived reference both match. Guards against checking in
 * against the wrong match (a stale or mismatched QR).
 */
export const isValidLadderCheckInScan = (
  match: Pick<LadderMatch, "ladderMatchId">,
  raw: string,
): boolean => {
  const payload = parseLadderCheckInPayload(raw);
  if (!payload) return false;
  const expected = buildLadderCheckInPayload(match);
  return (
    payload.ladderMatchId === expected.ladderMatchId &&
    payload.reference === expected.reference
  );
};

/** The userIds that have checked in for a match (empty when none have). */
export const getLadderCheckedInUserIds = (
  match: Pick<LadderMatch, "checkIn">,
): string[] => match.checkIn?.checkedInBy ?? [];

/** True when `userId` has completed their own check-in for the match. */
export const hasUserCheckedIn = (
  match: Pick<LadderMatch, "checkIn">,
  userId: string,
): boolean => getLadderCheckedInUserIds(match).includes(userId);

/** Check-in progress: how many participants are in vs the total required. */
export const getLadderCheckInProgress = (
  match: Pick<LadderMatch, "checkIn" | "participants">,
): { checkedIn: number; total: number } => {
  const checkedIn = getLadderCheckedInUserIds(match);
  return {
    checkedIn: match.participants.filter((id) => checkedIn.includes(id)).length,
    total: match.participants.length,
  };
};

/**
 * Add `userId`'s check-in to a match and return the updated
 * {@link LadderMatchCheckIn}. Pure — the caller persists the result (e.g. via a
 * Firestore transaction). Idempotent per user (checking in twice is a no-op),
 * and recomputes `completed`/`completedAt` against the current participants so
 * the games only unlock once everyone is in.
 */
export const addLadderMatchCheckIn = (
  match: Pick<LadderMatch, "participants" | "checkIn">,
  userId: string,
  at: Date = new Date(),
): LadderMatchCheckIn => {
  const existing = match.checkIn;
  const priorBy = Array.isArray(existing?.checkedInBy)
    ? existing.checkedInBy
    : [];
  const checkedInBy = priorBy.includes(userId)
    ? priorBy
    : [...priorBy, userId];

  const checkedInAt: Record<string, Date> = {
    ...(existing?.checkedInAt ?? {}),
    [userId]: existing?.checkedInAt?.[userId] ?? at,
  };

  const completed =
    match.participants.length > 0 &&
    match.participants.every((id) => checkedInBy.includes(id));

  const result: LadderMatchCheckIn = { checkedInBy, checkedInAt, completed };
  if (completed) {
    // Preserve the original completion time once set.
    result.completedAt = existing?.completedAt ?? at;
  }
  return result;
};

/**
 * True when a match is fully checked in (every participant has checked in) and
 * the games are unlocked. Games unlock is derived from this, not from any local
 * toggle state.
 */
export const isLadderMatchCheckedIn = (
  match: Pick<LadderMatch, "checkIn">,
): boolean => match.checkIn?.completed === true;
