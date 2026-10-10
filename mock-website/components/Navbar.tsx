"use client";
import { motion } from "framer-motion";

export default function Navbar({ walletAddr }: { walletAddr?: string }) {
  return (
    <motion.nav
      className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.08] bg-black/80 backdrop-blur-md"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border border-white/60 rounded-sm flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
          <span className="font-mono text-sm font-bold tracking-widest uppercase text-white">CivicVault</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {walletAddr ? (
            <div className="flex items-center gap-2 border border-white/20 px-3 py-1.5 rounded-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="font-mono text-xs text-white/70">
                {walletAddr.slice(0, 6)}…{walletAddr.slice(-4)}
              </span>
            </div>
          ) : (
            <div className="skeleton h-7 w-28" />
          )}
        </div>
      </div>
    </motion.nav>
  );
}
