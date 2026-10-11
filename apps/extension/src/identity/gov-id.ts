import { bytesToHex, type Hex } from 'viem';

/**
 * ─── Government ID Vault ──────────────────────────────────────────────────────
 *
 * Fully-local government-ID ingestion for SafeHand.
 *
 * Flow:
 *   1. User uploads an image of a government-issued ID.
 *   2. OCR runs 100% client-side (tesseract.js, assets bundled in the extension —
 *      nothing is uploaded anywhere).
 *   3. The extracted text is classified: is this actually a government ID?
 *      If NOT, we refuse — no hash is generated.
 *   4. If it IS a government ID, we extract readable details, store them locally
 *      as plaintext, and compute a one-way SHA-256 "identity hash" of the raw
 *      image bytes. That hash — never the underlying data — is what the wallet
 *      presents to external sites to prove identity without leaking PII.
 */

const GOV_ID_STORAGE_KEY = 'safehand.gov-id.v1';

/** Max accepted upload size (bytes). Keeps OCR responsive and storage sane. */
export const MAX_ID_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export const ACCEPTED_ID_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];

export interface GovIdDetails {
  /** Best-effort document kind, e.g. "Passport", "Driver's License". */
  documentType: string;
  /** Detected issuing country / authority (best effort). */
  country?: string;
  /** Document / ID number, if a confident match was found. */
  documentNumber?: string;
  /** Holder name, if confidently extracted. */
  name?: string;
  /** Date of birth as it appears on the document (string, not parsed PII). */
  dateOfBirth?: string;
  /** Expiry date as it appears on the document. */
  expiryDate?: string;
}

export interface StoredGovId {
  /** One-way SHA-256 of the raw uploaded image bytes — the shareable identity key. */
  identityHash: Hex;
  /** Human-readable details extracted from the ID (plaintext, local only). */
  details: GovIdDetails;
  /** The full OCR text, kept locally so the user can audit what was read. */
  rawText: string;
  /** MIME type of the source image. */
  mimeType: string;
  /** Original file name. */
  fileName: string;
  /** Unix-ms timestamp of ingestion. */
  savedAt: number;
}

/** Result of a classification attempt. */
export interface GovIdClassification {
  isGovernmentId: boolean;
  /** 0..1 confidence score. */
  confidence: number;
  /** Matched signals that drove the decision (for UI transparency). */
  matchedSignals: string[];
  documentType: string;
}

// ─── Government-ID signatures ─────────────────────────────────────────────────
//
// A document is accepted only when it carries enough government-issued markers.
// Signals are grouped; the classifier requires either a strong document-type
// marker OR several corroborating authority / field markers.

interface Signal {
  label: string;
  patterns: RegExp[];
  /** Weight toward the government-ID decision. */
  weight: number;
  /** If set, matching this signal names the document type. */
  documentType?: string;
}

const SIGNALS: Signal[] = [
  // ── Strong document-type markers ──
  {
    label: 'Passport',
    documentType: 'Passport',
    weight: 5,
    patterns: [/\bpassport\b/i, /\bpasseport\b/i, /\breisepass\b/i, /\bpasaporte\b/i],
  },
  {
    label: 'Driver / Driving License',
    documentType: "Driver's License",
    weight: 5,
    patterns: [/\bdriver'?s?\s+licen[sc]e\b/i, /\bdriving\s+licen[sc]e\b/i, /\bdl\s*no\b/i],
  },
  {
    label: 'Aadhaar',
    documentType: 'Aadhaar (India)',
    weight: 5,
    patterns: [
      // Latin + common OCR misreads of "AADHAAR"/"AADHAR"
      /\baadh?aa?r\b/i,
      /\ba[a@]dh[a4]{1,2}r\b/i,
      /\buidai\b/i,
      /\bunique\s+identif/i,
      /\bunique\s+identification\s+authority\b/i,
      // Devanagari "आधार"
      /आधार/,
      // Hindi "भारत सरकार" (Government of India)
      /भारत\s*सरकार/,
    ],
  },
  {
    label: 'Aadhaar number format (XXXX XXXX XXXX)',
    documentType: 'Aadhaar (India)',
    weight: 4,
    // A 12-digit number grouped in 4-4-4 is a very reliable Aadhaar signal and
    // survives noisy OCR far better than the Latin/Hindi wordmark.
    patterns: [/\b\d{4}\s+\d{4}\s+\d{4}\b/],
  },
  {
    label: 'Virtual ID (VID)',
    documentType: 'Aadhaar (India)',
    weight: 2,
    patterns: [/\bvid\b\s*[:\-]?\s*\d/i, /\b\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\b/],
  },
  {
    label: 'PAN Card',
    documentType: 'PAN Card (India)',
    weight: 5,
    patterns: [
      /\bpermanent\s+account\s+number\b/i,
      /\bincome\s+tax\s+department\b/i,
      // PAN format: 5 letters, 4 digits, 1 letter
      /\b[A-Z]{5}\d{4}[A-Z]\b/,
    ],
  },
  {
    label: 'National Identity Card',
    documentType: 'National ID Card',
    weight: 4,
    patterns: [/\bnational\s+id(entity)?\s+card\b/i, /\bidentity\s+card\b/i, /\bid\s+card\b/i, /\bcarte\s+nationale\b/i],
  },
  {
    label: 'Voter ID',
    documentType: 'Voter ID',
    weight: 4,
    patterns: [/\bvoter\s+id\b/i, /\belection\s+commission\b/i, /\belectoral\b/i, /\bepic\s*no\b/i],
  },
  {
    label: 'Residence / Green Card',
    documentType: 'Residence Permit',
    weight: 4,
    patterns: [/\bpermanent\s+resident\b/i, /\bresidence\s+permit\b/i, /\bgreen\s+card\b/i],
  },
  {
    label: 'Social Security',
    documentType: 'Social Security Card',
    weight: 4,
    patterns: [/\bsocial\s+security\b/i, /\bssn\b/i],
  },

  // ── Authority markers ──
  {
    label: 'Government authority',
    weight: 3,
    patterns: [
      /\bgovernment\s+of\b/i,
      /\bgovt\.?\s+of\b/i,
      /\brepublic\s+of\b/i,
      /\bdepartment\s+of\b/i,
      /\bministry\s+of\b/i,
      /\bunited\s+states\s+of\s+america\b/i,
      /\bgobierno\b/i,
      /\bgouvernement\b/i,
      /\bbundesrepublik\b/i,
      /भारत\s*सरकार/,
      /सरकार/,
    ],
  },

  // ── Field markers (common ID fields) ──
  {
    label: 'Date of birth field',
    weight: 2,
    patterns: [
      /\bdate\s+of\s+birth\b/i,
      /\bd\.?o\.?b\.?\b/i,
      /\byear\s+of\s+birth\b/i,
      /\by\.?o\.?b\.?\b/i,
      /\bné\(?e\)?\s+le\b/i,
      /\bgeburt/i,
      /जन्म/,
    ],
  },
  { label: 'Nationality field', weight: 1, patterns: [/\bnationality\b/i, /\bnationalité\b/i] },
  {
    label: 'Sex / gender field',
    weight: 2,
    patterns: [/\bsex\b/i, /\bgender\b/i, /\b(?:male|female)\b/i, /पुरुष/, /महिला/, /स्त्री/],
  },
  { label: 'Date of issue field', weight: 1, patterns: [/\bdate\s+of\s+issue\b/i, /\bissued?\b/i] },
  { label: 'Date of expiry field', weight: 1, patterns: [/\bdate\s+of\s+expiry\b/i, /\bexpir/i, /\bvalid\s+until\b/i] },
  {
    label: 'Machine-readable zone (MRZ)',
    weight: 4,
    documentType: 'Passport',
    // ICAO 9303 MRZ: lines of A–Z, digits and chevrons; passports start with P<
    patterns: [/\bP[<K][A-Z]{3}[A-Z<]+/, /[A-Z0-9<]{25,}/],
  },
];

/** Minimum weighted score at which we treat the document as a government ID. */
const GOV_ID_ACCEPT_THRESHOLD = 4;

/**
 * Classifies OCR text as government ID or not.
 * The decision is deterministic and local — no network, no model inference.
 */
export function classifyGovernmentId(ocrText: string): GovIdClassification {
  // Keep the original (with newlines) for Devanagari and a flattened copy for
  // Latin-word matching. OCR output is noisy, so we normalise generously.
  const raw = ocrText;
  const text = ocrText.replace(/\s+/g, ' ').trim();
  const matchedSignals: string[] = [];
  let score = 0;
  let documentType = 'Government ID';
  let bestTypeWeight = 0;

  for (const signal of SIGNALS) {
    const hit = signal.patterns.some((re) => re.test(text) || re.test(raw));
    if (!hit) continue;

    score += signal.weight;
    matchedSignals.push(signal.label);

    if (signal.documentType && signal.weight > bestTypeWeight) {
      documentType = signal.documentType;
      bestTypeWeight = signal.weight;
    }
  }

  // ── OCR-tolerant structural fallbacks ──
  // Real-world Aadhaar OCR often loses the "AADHAAR" wordmark but keeps the
  // 12-digit number. Any 12 consecutive digits (optionally spaced) is a strong
  // ID-number signal; combined with any India/government hint we accept it.
  const digitsOnly = raw.replace(/\D/g, '');
  const has12DigitRun = /\d(?:\s*\d){11}/.test(raw) || /\d{12}/.test(digitsOnly);
  const indiaHint =
    /\bindia\b/i.test(text) || /भारत/.test(raw) || /\buidai\b/i.test(text) || /\bgovt\b/i.test(text);

  if (has12DigitRun && !matchedSignals.includes('Aadhaar number format (XXXX XXXX XXXX)')) {
    score += 3;
    matchedSignals.push('12-digit ID number');
    if (bestTypeWeight < 3) {
      documentType = indiaHint ? 'Aadhaar (India)' : documentType;
    }
  }
  if (indiaHint && !matchedSignals.includes('Government authority')) {
    score += 2;
    matchedSignals.push('India / government hint');
  }

  const isGovernmentId = score >= GOV_ID_ACCEPT_THRESHOLD;
  // Normalise confidence into 0..1 against a comfortable ceiling.
  const confidence = Math.min(1, score / 8);

  return { isGovernmentId, confidence, matchedSignals, documentType };
}

// ─── Detail extraction ────────────────────────────────────────────────────────

function firstMatch(text: string, re: RegExp): string | undefined {
  const m = text.match(re);
  return m?.[1]?.trim();
}

/** Best-effort extraction of human-readable fields from OCR text. */
export function extractGovIdDetails(ocrText: string, documentType: string): GovIdDetails {
  const text = ocrText.replace(/\r/g, '');
  const flat = text.replace(/\s+/g, ' ');

  const details: GovIdDetails = { documentType };

  // Country / authority
  details.country =
    firstMatch(flat, /\b(?:government|republic|gobierno|gouvernement)\s+of\s+([A-Z][A-Za-z ]{2,30})/i) ??
    (/\bunited\s+states\b/i.test(flat) ? 'United States' : undefined) ??
    (/\bindia\b/i.test(flat) ? 'India' : undefined);

  // Document number — look for labelled numbers first, then an alphanumeric token.
  details.documentNumber =
    firstMatch(flat, /\b(?:passport|document|id|dl|licen[sc]e|card)\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9]{5,20})/i) ??
    firstMatch(flat, /\b([A-Z]{1,2}\d{6,12})\b/) ??
    firstMatch(flat, /\b(\d{4}\s?\d{4}\s?\d{4})\b/); // Aadhaar-like 12-digit grouping

  // Name — labelled, else leave undefined (avoid guessing noise).
  details.name =
    firstMatch(flat, /\bname\s*[:\-]?\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/) ??
    firstMatch(flat, /\bsurname\s*[:\-]?\s*([A-Z][A-Za-z]+)/i);

  // Dates
  const dateRe = /\b(\d{2}[\/.\- ]\d{2}[\/.\- ]\d{2,4})\b/;
  details.dateOfBirth =
    firstMatch(flat, new RegExp(`(?:date of birth|d\\.?o\\.?b\\.?|birth)\\s*[:\\-]?\\s*${dateRe.source}`, 'i'));
  details.expiryDate =
    firstMatch(flat, new RegExp(`(?:expiry|expires|valid until|date of expiry)\\s*[:\\-]?\\s*${dateRe.source}`, 'i'));

  return details;
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

/** Computes a one-way SHA-256 identity hash over the raw image bytes. */
export async function hashImageBytes(bytes: Uint8Array): Promise<Hex> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

// ─── Local storage ────────────────────────────────────────────────────────────

export async function saveGovId(record: StoredGovId): Promise<void> {
  await chrome.storage.local.set({ [GOV_ID_STORAGE_KEY]: record });
}

export async function getGovId(): Promise<StoredGovId | null> {
  const output = await chrome.storage.local.get([GOV_ID_STORAGE_KEY]);
  return (output[GOV_ID_STORAGE_KEY] as StoredGovId | undefined) ?? null;
}

export async function clearGovId(): Promise<void> {
  await chrome.storage.local.remove(GOV_ID_STORAGE_KEY);
}
