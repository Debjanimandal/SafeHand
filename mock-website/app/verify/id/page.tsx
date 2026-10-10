"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import StepIndicator from "@/components/StepIndicator";
import ProoflyModal from "@/components/ProoflyModal";
import { useApp } from "@/lib/context";

const STEPS = ["Connect Wallet", "Prove Age", "Prove Identity", "Dashboard"];

export default function IdVerifyPage() {
  const router = useRouter();
  const { walletAddr, ageHash, setIdProof } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddr || !ageHash) { router.replace("/"); return; }
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, [walletAddr, ageHash, router]);

  function handleVerified(_addr: string, hash: string) {
    setIdProof(hash);
    setTimeout(() => router.push("/dashboard"), 500);
  }

  return (
    <>
      <Navbar walletAddr={walletAddr} />
      <main className="min-h-screen flex flex-col items-center justify-center px-4 pt-14">
        <motion.div
          className="w-full max-w-lg space-y-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StepIndicator steps={STEPS} current={2} />

          <div className="border border-white/10 bg-white/[0.02] p-8 space-y-6">
            <div>
              <p className="font-mono text-xs text-white/30 uppercase tracking-widest mb-2">Step 3 of 3</p>
              <h2 className="text-xl font-bold text-white">Identity Verification</h2>
              <p className="text-sm text-white/40 mt-1">
                Prove your identity is unique and real without revealing who you are. SafeHand generates a ZK proof from your government ID credential.
              </p>
            </div>

            {/* Age proof confirmed banner */}
            <motion.div
              className="flex items-center gap-3 border border-white/10 px-4 py-3"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            >
              <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center flex-none">
                <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-mono text-xs font-bold text-white">Age proof verified</p>
                <p className="font-mono text-[10px] text-white/30 break-all">{ageHash?.slice(0, 42)}…</p>
              </div>
            </motion.div>

            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-16 w-full" />
                <div className="skeleton h-12 w-full" />
              </div>
            ) : (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="border border-white/[0.08] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white/40">Credential type</span>
                    <span className="font-mono text-xs text-white">Government ID</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white/40">Nullifier</span>
                    <span className="font-mono text-xs text-white">Unique per wallet</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white/40">Chain</span>
                    <span className="font-mono text-xs text-white">Base Sepolia</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white/40">Data disclosed</span>
                    <span className="font-mono text-xs text-white">None</span>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(true)}
                  className="w-full flex items-center justify-between border border-white px-5 py-4 hover:bg-white hover:text-black transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-6 h-6 rounded-full border border-current flex items-center justify-center"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-2 h-2 rounded-full bg-current" />
                    </motion.div>
                    <div className="text-left">
                      <p className="font-mono text-sm font-bold">Prove Identity with SafeHand</p>
                      <p className="font-mono text-[10px] opacity-50">Opens SafeHand Wallet</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>

      <ProoflyModal open={modalOpen} onClose={() => setModalOpen(false)} onVerified={handleVerified} mode="id" />
    </>
  );
}
