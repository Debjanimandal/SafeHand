"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ProoflyModal from "@/components/ProoflyModal";
import { useApp } from "@/lib/context";

export default function HomePage() {
  const router = useRouter();
  const { setWallet } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStep, setEmailStep] = useState(false);

  function handleVerified(addr: string, hash: string) {
    setWallet(addr, hash);
    setTimeout(() => router.push("/verify/age"), 400);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Background accent */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full border border-white/[0.03] animate-pulse-slow" />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-white/[0.05] animate-pulse-slow" style={{ animationDelay: "0.5s" }} />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-white/[0.08] animate-pulse-slow" style={{ animationDelay: "1s" }} />
      </div>

      {/* Card */}
      <motion.div
        className="relative w-full max-w-md border border-white/10 bg-white/[0.02] backdrop-blur-sm p-8 space-y-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Site brand */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 border border-white/60 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white" />
            </div>
            <span className="font-mono text-xs text-white/40 uppercase tracking-widest">CivicVault</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign in</h1>
          <p className="text-sm text-white/40">Verified access platform · powered by SafeHand</p>
        </div>

        <AnimatePresence mode="wait">
          {!emailStep ? (
            <motion.div
              key="email"
              className="space-y-4"
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            >
              <div className="space-y-2">
                <label className="font-mono text-xs text-white/40 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/40 transition-colors font-mono"
                />
              </div>
              <button
                onClick={() => email.includes("@") && setEmailStep(true)}
                className="btn-primary w-full"
              >
                Continue
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="font-mono text-xs text-white/20">or</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* SafeHand CTA */}
              <button
                onClick={() => setModalOpen(true)}
                className="w-full flex items-center justify-between border border-white/20 px-4 py-3.5 hover:border-white/50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </motion.div>
                  <div className="text-left">
                    <p className="font-mono text-xs font-bold text-white">Verify with SafeHand</p>
                    <p className="font-mono text-[10px] text-white/30">Connect wallet + ZK proof</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="password"
              className="space-y-4"
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            >
              <button onClick={() => setEmailStep(false)} className="flex items-center gap-1 font-mono text-xs text-white/30 hover:text-white/60 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="border border-white/[0.08] px-4 py-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                <span className="font-mono text-xs text-white/50">{email}</span>
              </div>
              <div className="space-y-2">
                <label className="font-mono text-xs text-white/40 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/40 transition-colors font-mono"
                />
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="btn-primary w-full"
              >
                Sign in + Verify with SafeHand
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="font-mono text-[10px] text-white/20 text-center">
          Protected by SafeHand ZK verification
        </p>
      </motion.div>

      {/* Proofly Modal */}
      <ProoflyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onVerified={handleVerified}
        mode="connect"
      />
    </main>
  );
}
