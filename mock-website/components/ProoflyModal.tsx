"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSafeHandProvider,
  fetchSafeHandIdentityHash,
  queryOnChainRegistry,
  BASE_SEPOLIA_CHAIN_ID_HEX,
  EIP1193Provider,
  type SafeHandIdentityHash,
} from "@/lib/proofly";

interface ProoflyModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: (addr: string, hash: string) => void;
  mode: "connect" | "age" | "id";
}

type ModalState =
  | "detecting"
  | "extension_missing"
  | "requesting_accounts"
  | "locked"
  | "rejected"
  | "switching_chain"
  | "verifying_chain"
  | "requesting_signature"
  | "completed"
  | "error";

export default function ProoflyModal({ open, onClose, onVerified, mode }: ProoflyModalProps) {
  const [state, setState] = useState<ModalState>("detecting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [connectedAddress, setConnectedAddress] = useState<string>("");
  const [onChainVerified, setOnChainVerified] = useState<boolean>(false);
  const [resultHash, setResultHash] = useState<string>("");
  const [idHash, setIdHash] = useState<SafeHandIdentityHash | null>(null);

  useEffect(() => {
    if (!open) {
      setState("detecting");
      setErrorMessage("");
      setConnectedAddress("");
      setResultHash("");
      setOnChainVerified(false);
      setIdHash(null);
      return;
    }

    void runWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  async function runWorkflow() {
    setState("detecting");
    setErrorMessage("");

    // Step 1: Detect real provider
    const provider = await getSafeHandProvider(1200);
    if (!provider) {
      setState("extension_missing");
      return;
    }

    // Step 2: Handle Connect vs Age/ID mode
    if (mode === "connect") {
      await handleConnect(provider);
    } else {
      await handleVerification(provider);
    }
  }

  async function handleConnect(provider: EIP1193Provider) {
    setState("requesting_accounts");
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0 || !accounts[0]) {
        setState("error");
        setErrorMessage("No account returned from SafeHand.");
        return;
      }

      const activeAddr = accounts[0];
      setConnectedAddress(activeAddr);

      // Verify chain is Base Sepolia
      try {
        const chainId = (await provider.request({ method: "eth_chainId" })) as string;
        if (chainId?.toLowerCase() !== BASE_SEPOLIA_CHAIN_ID_HEX.toLowerCase()) {
          setState("switching_chain");
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }],
          });
        }
      } catch (chainErr) {
        console.warn("Chain switch note:", chainErr);
      }

      setResultHash(activeAddr);
      setState("completed");

      setTimeout(() => {
        onVerified(activeAddr, activeAddr);
      }, 800);
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string };
      if (error?.code === 4001) {
        setState("rejected");
        setErrorMessage("Connection was rejected by user in the SafeHand popup.");
      } else if (error?.code === 4100) {
        setState("locked");
        setErrorMessage("SafeHand wallet is locked. Please unlock the extension first.");
      } else {
        setState("error");
        setErrorMessage(error?.message || "Failed to connect to SafeHand Wallet.");
      }
    }
  }

  async function handleVerification(provider: EIP1193Provider) {
    setState("verifying_chain");
    try {
      // 1. Get currently connected account
      const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
      let targetAddr = accounts?.[0];

      if (!targetAddr) {
        setState("requesting_accounts");
        const requested = (await provider.request({
          method: "eth_requestAccounts",
        })) as string[];
        targetAddr = requested?.[0];
      }

      if (!targetAddr) {
        setState("error");
        setErrorMessage("Wallet not connected. Please connect SafeHand first.");
        return;
      }

      setConnectedAddress(targetAddr);

      // 2. For ID mode, pull the government-ID identity hash from the wallet
      //    FIRST — this is a fast local read and is what the dApp actually
      //    verifies against. No PII leaves the extension.
      let fetchedIdHash: SafeHandIdentityHash | null = null;
      if (mode === "id") {
        const idResult = await fetchSafeHandIdentityHash(provider);
        if (!idResult.hash) {
          setState("error");
          setErrorMessage(
            idResult.reason === "unsupported"
              ? (idResult.message ??
                  "Reload the SafeHand extension at chrome://extensions, then refresh this page.")
              : "No government ID is linked in SafeHand. Open the extension → ID tab and upload a government ID first.",
          );
          return;
        }
        fetchedIdHash = idResult.hash;
        setIdHash(fetchedIdHash);
      }

      // 3. Kick off the on-chain registry check in the background — it must not
      //    block signing. It resolves/updates the badge whenever it finishes.
      void queryOnChainRegistry(targetAddr)
        .then((verified) => setOnChainVerified(verified))
        .catch(() => setOnChainVerified(false));

      // 4. Request cryptographic authority challenge signature. For ID mode the
      //    challenge binds the government-ID hash to the wallet signature so the
      //    proof is cryptographically tied to the specific credential.
      setState("requesting_signature");
      const timestamp = new Date().toISOString();
      const challenge =
        mode === "age"
          ? `[SafeHand Humanity & Age Verification]\nCivicVault Access Gate\nWallet: ${targetAddr}\nRequirement: Age 18+\nTimestamp: ${timestamp}`
          : `[SafeHand Unique Identity Verification]\nCivicVault Access Gate\nWallet: ${targetAddr}\nRequirement: Government ID ZK Proof\nIdentity Hash: ${fetchedIdHash?.identityHash}\nDocument: ${fetchedIdHash?.documentType}\nTimestamp: ${timestamp}`;

      const signature = (await provider.request({
        method: "personal_sign",
        params: [challenge, targetAddr],
      })) as string;

      // For ID mode the credential proof is the government-ID identity hash.
      const proofHash = mode === "id" && fetchedIdHash ? fetchedIdHash.identityHash : signature;
      setResultHash(proofHash);
      setState("completed");

      setTimeout(() => {
        onVerified(targetAddr, proofHash);
      }, 900);
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string };
      if (error?.code === 4001) {
        setState("rejected");
        setErrorMessage("Verification signing was rejected by user in SafeHand.");
      } else if (error?.code === 4100) {
        setState("locked");
        setErrorMessage("SafeHand wallet is locked. Please open the extension and unlock.");
      } else {
        setState("error");
        setErrorMessage(error?.message || "Failed to complete verification.");
      }
    }
  }

  const title =
    mode === "connect"
      ? "Connect SafeHand Wallet"
      : mode === "age"
      ? "Prove Age with SafeHand"
      : "Prove Identity with SafeHand";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={state === "completed" ? onClose : undefined}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-sm border border-white/20 bg-black glow-ring p-0"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
          >
            {/* Header */}
            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </motion.div>
                <div>
                  <p className="font-mono text-xs text-white/40 uppercase tracking-widest">SafeHand</p>
                  <p className="font-mono text-sm font-bold text-white">{title}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content states */}
            <div className="px-6 py-6 space-y-4">
              {state === "detecting" && (
                <div className="space-y-3 py-2 text-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-mono text-xs text-white/70">Detecting SafeHand Extension…</p>
                  <p className="font-mono text-[10px] text-white/30">Checking window.safehand / EIP-6963</p>
                </div>
              )}

              {state === "extension_missing" && (
                <div className="space-y-4 py-2">
                  <div className="border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                    <p className="font-mono text-xs font-bold text-amber-300">Extension Not Detected</p>
                    <p className="font-mono text-[11px] text-white/60 leading-relaxed">
                      Please make sure the SafeHand Extension is installed and active in Chrome.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-white/40 space-y-1 bg-white/[0.02] border border-white/10 p-3">
                    <p className="text-white/60 font-bold">How to load SafeHand:</p>
                    <p>1. Open Chrome &gt; chrome://extensions</p>
                    <p>2. Enable Developer mode</p>
                    <p>3. Click &quot;Load unpacked&quot; and select `hackstorm/apps/extension/dist`</p>
                  </div>
                  <button onClick={() => void runWorkflow()} className="btn-primary w-full text-xs py-2.5">
                    Retry Detection
                  </button>
                </div>
              )}

              {state === "requesting_accounts" && (
                <div className="space-y-3 py-2 text-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-mono text-xs text-white">Requesting Wallet Approval…</p>
                  <p className="font-mono text-[10px] text-white/40">
                    Check the SafeHand Extension notification popup to approve connection.
                  </p>
                </div>
              )}

              {state === "switching_chain" && (
                <div className="space-y-3 py-2 text-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-mono text-xs text-white">Switching to Base Sepolia…</p>
                </div>
              )}

              {state === "verifying_chain" && (
                <div className="space-y-3 py-2 text-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-mono text-xs text-white">Querying Registry on Base Sepolia…</p>
                  <p className="font-mono text-[10px] text-white/40">Checking on-chain human proof</p>
                </div>
              )}

              {state === "requesting_signature" && (
                <div className="space-y-3 py-2 text-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-mono text-xs text-white">Signing Authority Challenge…</p>
                  <p className="font-mono text-[10px] text-white/40">
                    Confirm personal_sign in the SafeHand Extension.
                  </p>
                </div>
              )}

              {state === "locked" && (
                <div className="space-y-4 py-2">
                  <div className="border border-red-500/30 bg-red-500/10 p-3 space-y-1">
                    <p className="font-mono text-xs font-bold text-red-300">Wallet Locked</p>
                    <p className="font-mono text-[11px] text-white/60">
                      {errorMessage || "Please unlock the SafeHand Extension and try again."}
                    </p>
                  </div>
                  <button onClick={() => void runWorkflow()} className="btn-primary w-full text-xs py-2.5">
                    Retry After Unlocking
                  </button>
                </div>
              )}

              {state === "rejected" && (
                <div className="space-y-4 py-2">
                  <div className="border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                    <p className="font-mono text-xs font-bold text-amber-300">Request Declined</p>
                    <p className="font-mono text-[11px] text-white/60">{errorMessage}</p>
                  </div>
                  <button onClick={() => void runWorkflow()} className="btn-primary w-full text-xs py-2.5">
                    Try Again
                  </button>
                </div>
              )}

              {state === "error" && (
                <div className="space-y-4 py-2">
                  <div className="border border-red-500/30 bg-red-500/10 p-3 space-y-1">
                    <p className="font-mono text-xs font-bold text-red-300">Error</p>
                    <p className="font-mono text-[11px] text-white/60 break-all">{errorMessage}</p>
                  </div>
                  <button onClick={() => void runWorkflow()} className="btn-primary w-full text-xs py-2.5">
                    Retry
                  </button>
                </div>
              )}

              {state === "completed" && (
                <motion.div
                  className="space-y-3 py-1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex items-center gap-2 text-white">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-none">
                      <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-mono text-xs font-bold">
                      {mode === "connect" ? "SafeHand Wallet Connected" : "Verification Signed"}
                    </span>
                  </div>

                  <div className="border border-white/10 bg-white/[0.02] p-3 space-y-2">
                    <div>
                      <p className="font-mono text-[10px] text-white/40 uppercase">Account</p>
                      <p className="font-mono text-xs text-white break-all">{connectedAddress}</p>
                    </div>

                    {mode !== "connect" && (
                      <>
                        <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-white/40">Registry (Base Sepolia)</span>
                          <span
                            className={`font-mono text-[10px] font-bold ${
                              onChainVerified ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {onChainVerified ? "Verified On-Chain" : "Authority Confirmed"}
                          </span>
                        </div>

                        {mode === "id" && idHash && (
                          <div className="border-t border-white/10 pt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] text-white/40 uppercase">Credential</span>
                              <span className="font-mono text-[10px] text-white">{idHash.documentType}</span>
                            </div>
                            <p className="font-mono text-[10px] text-emerald-400/80 uppercase">
                              Government ID Hash (proof)
                            </p>
                            <p className="font-mono text-[10px] text-emerald-300 break-all leading-tight">
                              {idHash.identityHash}
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="font-mono text-[10px] text-white/40 uppercase">
                            {mode === "id" ? "Wallet Signature" : "Signature Hash"}
                          </p>
                          <p className="font-mono text-[10px] text-white/60 break-all leading-tight">
                            {resultHash.slice(0, 42)}…
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
