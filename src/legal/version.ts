/**
 * The version of the Terms of Use, Ladder Terms and Ladder Rules, recorded as
 * `termsVersion` when a user accepts them. Bump it on every wording change and
 * tag the shared commit `terms-v<version>` so each past version's text is kept.
 */
export const TERMS_VERSION = "1.0.0";

/** ISO date (UK time) the current version takes effect. */
export const TERMS_EFFECTIVE_DATE = "2026-11-27";

export const formatTermsEffectiveDate = (isoDate: string = TERMS_EFFECTIVE_DATE): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${day} ${months[month - 1]} ${year}`;
};

export const TERMS_VERSION_LINE = `Version ${TERMS_VERSION}, effective ${formatTermsEffectiveDate()}`;
