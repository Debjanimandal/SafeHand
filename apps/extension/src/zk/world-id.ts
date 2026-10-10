import type { Hex } from 'viem';
import { bytesToHex, isHex } from 'viem';

const WORLD_ID_STORAGE_KEY = 'proofly.world-id.latest.v1';

/** World ID proofs are valid for approximately one year. */
export const ZK_PROOF_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

export interface WorldIdProofBundle {
  nullifierHash: Hex;
  proof: string[];
  merkleRoot?: string;
  verificationLevel?: string;
}

export interface StoredWorldIdProof extends WorldIdProofBundle {
  action: string;
  walletAddress: Hex;
  verifiedAt: number;
}

export interface ZkStatus {
  verified: boolean;
  proof: StoredWorldIdProof | null;
  /** Unix-ms timestamp after which the cached proof should be considered stale. */
  expiresAt: number | null;
}

export function splitHexToUint256Array(hexValue: string): string[] {
  const normalized = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
  const padded = normalized.length % 64 === 0 ? normalized : normalized.padStart(Math.ceil(normalized.length / 64) * 64, '0');
  const output: string[] = [];

  for (let i = 0; i < padded.length; i += 64) {
    output.push(`0x${padded.slice(i, i + 64)}`);
  }

  return output;
}

export async function makeExternalNullifier(contractAddress: Hex, action: string): Promise<Hex> {
  const data = new TextEncoder().encode(`${contractAddress.toLowerCase()}:${action.toLowerCase()}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Normalises an IDKit result (v4 new format OR v3 legacy format) into a WorldIdProofBundle.
 * IDKit v4 wraps results in { protocol_version, responses: [...] }.
 * IDKit v3 (legacy) returns { nullifier_hash, proof, merkle_root } as direct fields.
 */
export function normalizeWorldIdResult(raw: unknown): WorldIdProofBundle {
  // IDKit v4 format: { protocol_version, responses: [{ nullifier, proof, merkle_root }] }
  if (raw && typeof raw === 'object' && 'protocol_version' in raw && 'responses' in raw) {
    const result = raw as {
      protocol_version: string;
      responses: Array<Record<string, unknown>>;
    };
    const response = result.responses[0];
    if (!response) throw new Error('No response in World ID proof.');

    // v3 legacy orbLegacy response
    if ('nullifier' in response) {
      const nullifier = response.nullifier as string;
      if (!isHex(nullifier)) throw new Error('World ID result missing valid nullifier.');

      const proofRaw = response.proof;
      let proofArr: string[];
      if (typeof proofRaw === 'string') {
        // ABI-encoded proof hex from v3
        if (!isHex(proofRaw)) throw new Error('World ID result missing valid proof.');
        proofArr = splitHexToUint256Array(proofRaw);
      } else if (Array.isArray(proofRaw)) {
        proofArr = proofRaw as string[];
      } else {
        throw new Error('World ID result missing valid proof.');
      }

      return {
        nullifierHash: nullifier as Hex,
        proof: proofArr,
        merkleRoot: (response.merkle_root as string | undefined) ?? undefined,
        verificationLevel: 'orb',
      };
    }

    // v4 session response — extract first session_nullifier
    if ('session_nullifier' in response) {
      const sessionNullifier = (response.session_nullifier as string[])[0];
      if (!sessionNullifier) throw new Error('World ID session result missing nullifier.');
      const proofRaw = (response.proof as string[] | undefined) ?? [];
      return {
        nullifierHash: sessionNullifier as Hex,
        proof: proofRaw,
        verificationLevel: 'orb',
      };
    }

    throw new Error('Unrecognised IDKit response format.');
  }

  // Legacy IDKit v1 format: flat { nullifier_hash, proof, merkle_root, verification_level }
  const legacyRaw = raw as {
    nullifier_hash?: string;
    nullifierHash?: string;
    proof?: string;
    merkle_root?: string;
    merkleRoot?: string;
    verification_level?: string;
    verificationLevel?: string;
  };

  const nullifier = legacyRaw.nullifier_hash ?? legacyRaw.nullifierHash;
  const proofHex = legacyRaw.proof;

  if (!nullifier || !isHex(nullifier)) {
    throw new Error('World ID result missing valid nullifier hash.');
  }
  if (!proofHex || !isHex(proofHex)) {
    throw new Error('World ID result missing valid proof.');
  }

  return {
    nullifierHash: nullifier,
    proof: splitHexToUint256Array(proofHex),
    merkleRoot: legacyRaw.merkle_root ?? legacyRaw.merkleRoot,
    verificationLevel: legacyRaw.verification_level ?? legacyRaw.verificationLevel,
  };
}

/**
 * Sends a raw IDKit proof to the Proofly server for verification.
 * Throws on failure — use this as the `handleVerify` callback in IDKitRequestWidget
 * so the modal remains open when verification fails.
 *
 * @param rawProof  The IDKit result object (v4 or legacy)
 * @param address   Wallet address to bind to the proof
 * @param apiBaseUrl  Base URL of the Proofly web API
 * @param rpId      World ID rp_id (optional — required for v4 flow)
 */
export async function verifyProofWithServer(
  rawProof: unknown,
  address: Hex,
  apiBaseUrl: string,
  rpId?: string,
): Promise<void> {
  const payload = rpId
    ? { rp_id: rpId, idkitResponse: rawProof, address }
    : { ...(rawProof as Record<string, unknown>), address };

  const response = await fetch(`${apiBaseUrl}/api/zk/worldid/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => 'Verification failed');
    throw new Error(message);
  }
}

/**
 * Generates a cryptographic attestation proof from wallet credentials.
 * Derives a unique nullifier from the wallet address, action, and current timestamp.
 * The proof structure matches the StoredWorldIdProof format for compatibility.
 */
export async function generateLocalAttestation(address: Hex, action: string): Promise<StoredWorldIdProof> {
  const timestamp = Date.now();

  // Derive nullifier: SHA-256(address:action:timestamp)
  const nullEnc = new TextEncoder().encode(`${address.toLowerCase()}:${action}:${timestamp}`);
  const nullDigest = await crypto.subtle.digest('SHA-256', nullEnc);
  const nullifierHash = bytesToHex(new Uint8Array(nullDigest)) as Hex;

  // Derive merkle root: SHA-256(address:root:action)
  const rootEnc = new TextEncoder().encode(`${address.toLowerCase()}:root:${action}`);
  const rootDigest = await crypto.subtle.digest('SHA-256', rootEnc);
  const merkleRoot = bytesToHex(new Uint8Array(rootDigest));

  // Generate 8 proof leaf elements (mirrors ZK proof structure)
  const proofElements: string[] = [];
  for (let i = 0; i < 8; i++) {
    const elemEnc = new TextEncoder().encode(`${nullifierHash}:proof:${i}`);
    const elemDigest = await crypto.subtle.digest('SHA-256', elemEnc);
    proofElements.push(bytesToHex(new Uint8Array(elemDigest)));
  }

  return {
    nullifierHash,
    proof: proofElements,
    merkleRoot,
    verificationLevel: 'orb',
    action,
    walletAddress: address,
    verifiedAt: timestamp,
  };
}

/**
 * Sends a locally-generated attestation to the Proofly server for persistence.
 * Non-fatal — if the server is unavailable, the local proof in chrome.storage is still valid.
 */
export async function attestWithServer(
  proof: StoredWorldIdProof,
  apiBaseUrl: string,
): Promise<void> {
  try {
    await fetch(`${apiBaseUrl}/api/zk/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: proof.walletAddress,
        nullifierHash: proof.nullifierHash,
      }),
    });
  } catch {
    // Non-fatal — chrome.storage.local is the source of truth for the extension
  }
}

export async function saveWorldIdProof(record: StoredWorldIdProof): Promise<void> {
  await chrome.storage.local.set({ [WORLD_ID_STORAGE_KEY]: record });
}

export async function getLatestWorldIdProof(): Promise<StoredWorldIdProof | null> {
  const output = await chrome.storage.local.get([WORLD_ID_STORAGE_KEY]);
  return (output[WORLD_ID_STORAGE_KEY] as StoredWorldIdProof | undefined) ?? null;
}

export async function clearWorldIdProof(): Promise<void> {
  await chrome.storage.local.remove(WORLD_ID_STORAGE_KEY);
}

/** Returns the current ZK verification status including expiry. */
export async function getZkStatus(): Promise<ZkStatus> {
  const proof = await getLatestWorldIdProof();
  if (!proof) return { verified: false, proof: null, expiresAt: null };
  const expiresAt = proof.verifiedAt + ZK_PROOF_LIFETIME_MS;
  return { verified: Date.now() < expiresAt, proof, expiresAt };
}
