'use client';

import { useState } from 'react';
import { bytesToHex } from 'viem';
import { walletRequest } from '../../lib/wallet/provider';

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return bytesToHex(new Uint8Array(digest));
}

export default function MediaPage(): JSX.Element {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connectWallet(): Promise<void> {
    setError(null);

    try {
      const accounts = (await walletRequest('eth_requestAccounts', [])) as string[];
      setWalletAddress(accounts[0] ?? null);
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    if (!walletAddress) {
      setError('Connect wallet first.');
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);

    try {
      const hash = await hashFile(file);
      setFileHash(hash);
      const signed = (await walletRequest('personal_sign', [hash])) as string;
      setSignature(signed);

      const response = await fetch('/api/media/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          fileHash: hash,
          signature: signed,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  }

  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto grid w-full max-w-shell gap-6">
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Media Signing</h1>
          <p className="mt-2 text-sm text-subtext">Hash media locally and sign via extension for tamper-evident provenance.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-subtext">
            Connected wallet: {walletAddress ?? 'Not connected'}
          </div>
          <button
            className="mb-4 rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
            onClick={() => {
              void connectWallet();
            }}
            type="button"
          >
            Connect Wallet
          </button>
          <input type="file" onChange={(event) => { void onFileChange(event); }} className="text-sm" />
          <p className="mt-4 break-all font-mono text-xs text-subtext">File Hash: {fileHash ?? 'N/A'}</p>
          <p className="mt-2 break-all font-mono text-xs text-subtext">Signature: {signature ?? 'N/A'}</p>
          {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
