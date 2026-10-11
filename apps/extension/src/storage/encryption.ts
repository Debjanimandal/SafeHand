/**
 * Iteration count for NEW wallets. 210k is the OWASP-recommended minimum for
 * PBKDF2-HMAC-SHA256 — a solid security/latency balance that unlocks noticeably
 * faster than the previous 600k while remaining strong.
 */
export const PBKDF2_ITERATIONS = 210_000;

/**
 * Iteration count assumed for keystores created before per-payload iterations
 * were stored. Existing wallets were encrypted at 600k, so we must derive with
 * 600k to decrypt them. New payloads carry their own `iterations` field.
 */
export const LEGACY_PBKDF2_ITERATIONS = 600_000;

const AES_KEY_BITS = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface EncryptedPayload {
  salt: string;
  iv: string;
  ciphertext: string;
  /** PBKDF2 iterations used to derive this payload's key. Absent on old wallets. */
  iterations?: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const passwordBuffer = new TextEncoder().encode(password);
  const importedKey = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: salt as BufferSource,
    },
    importedKey,
    {
      name: 'AES-GCM',
      length: AES_KEY_BITS,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBytes(password: string, plaintext: Uint8Array): Promise<EncryptedPayload> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveAesKey(password, salt, PBKDF2_ITERATIONS);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource,
  );

  return {
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    iterations: PBKDF2_ITERATIONS,
  };
}

export async function decryptBytes(password: string, payload: EncryptedPayload): Promise<Uint8Array> {
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const encrypted = base64ToBytes(payload.ciphertext);
  // Fall back to the legacy 600k for wallets created before iterations were stored.
  const iterations = payload.iterations ?? LEGACY_PBKDF2_ITERATIONS;
  const key = await deriveAesKey(password, salt, iterations);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encrypted as BufferSource,
  );

  return new Uint8Array(decrypted);
}
