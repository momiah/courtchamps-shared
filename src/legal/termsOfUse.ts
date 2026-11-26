import { numberLegalSections } from "./blocks";
import type { LegalSection } from "./blocks";
import {
  COURT_CHAMPS_CONTACT_EMAIL,
  COURT_CHAMPS_LEGAL_NAME,
  GOVERNING_LAW,
  SUPPORT_REPLY_HOURS,
} from "./company";

export const TERMS_OF_USE_INTRO =
  "These terms apply whenever you use the Court Champs app or website. By creating an account or using Court Champs you accept them.";

export const TERMS_OF_USE: LegalSection[] = numberLegalSections([
  {
    id: "who-we-are",
    title: "Who we are",
    body: [
      `Court Champs is run by ${COURT_CHAMPS_LEGAL_NAME}. Contact: ${COURT_CHAMPS_CONTACT_EMAIL}.`,
      "Ladders, leagues and tournaments have their own terms and rules as well, which apply when you join them.",
    ],
  },
  {
    id: "your-account",
    title: "Your account",
    body: [
      "You may hold only one account. The details on it, including your name and location, must be accurate and your own.",
      "Keep your sign-in details private. You are responsible for what happens on your account.",
      "You can delete your account at any time from the app or the website.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: [
      "Treat other players with respect, on and off the court.",
      "You must not:",
      [
        "harass, abuse, threaten or discriminate against anyone",
        "report false scores, results or reports",
        "pretend to be someone else or use another person's account",
        "use Court Champs for anything unlawful, or try to break, overload or get around its security",
        "collect other users' details or contact them for purposes unrelated to playing",
      ],
    ],
  },
  {
    id: "your-content",
    title: "Your content",
    body: [
      "You keep ownership of the photos, videos, messages and other content you post.",
      "You give Court Champs permission to store, show and share that content within Court Champs and in Court Champs promotion, for as long as it stays on Court Champs.",
      "You must only post content you have the right to share, and nothing unlawful, offensive or that shows someone who has not agreed to it.",
      "Any user can report content. We may remove content or restrict an account that breaks these terms.",
    ],
  },
  {
    id: "playing-safely",
    title: "Playing safely",
    body: [
      "You take part in matches at your own risk. Make sure you are fit to play and follow each venue's rules.",
      "Court Champs does not run the courts or venues you play at and is not responsible for them.",
    ],
  },
  {
    id: "our-liability",
    title: "Our liability",
    body: [
      "We work to keep Court Champs available and accurate, but we cannot promise it will always be uninterrupted or error-free.",
      "We are not liable for losses that were not foreseeable, or for losses caused by other users or venues.",
      "Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot be limited by law.",
    ],
  },
  {
    id: "suspension",
    title: "Suspension and closing accounts",
    body: [
      "We may suspend or close an account that seriously or repeatedly breaks these terms, and will tell you why.",
      "If you think we got it wrong, contact Support and we will review it.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    body: [
      "How we collect and use your personal data is set out in our Privacy Policy.",
    ],
  },
  {
    id: "complaints",
    title: "Complaints",
    body: [
      `Send any complaint through in-app Support or to ${COURT_CHAMPS_CONTACT_EMAIL}. We aim to reply within ${SUPPORT_REPLY_HOURS} hours.`,
      "Nothing in these terms affects your statutory rights.",
    ],
  },
  {
    id: "changes",
    title: "Changes",
    body: [
      "We may update these terms. We will tell you about material changes before they take effect.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing law",
    body: [
      `These terms are governed by the law of ${GOVERNING_LAW}.`,
      "If you live in Scotland or Northern Ireland, you keep the protection of your local consumer law and may bring proceedings in your local courts.",
    ],
  },
]);
