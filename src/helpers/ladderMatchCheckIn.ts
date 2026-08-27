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

/**
 * Build the persisted {@link LadderMatchCheckIn} written on a successful scan.
 * Pure — the caller persists the result (e.g. via Firestore `updateDoc`).
 */
export const buildLadderMatchCheckIn = (
  scannedBy: string,
  checkedInAt: Date = new Date(),
): LadderMatchCheckIn => ({
  completed: true,
  checkedInAt,
  scannedBy,
});

/**
 * True when a match's persisted check-in handshake is complete. Games unlock is
 * derived from this, not from any local toggle state.
 */
export const isLadderMatchCheckedIn = (
  match: Pick<LadderMatch, "checkIn">,
): boolean => match.checkIn?.completed === true;
