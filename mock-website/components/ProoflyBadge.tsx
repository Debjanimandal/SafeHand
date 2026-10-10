"use client";
import { motion } from "framer-motion";

export default function ProoflyBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-5 h-5" : size === "lg" ? "w-10 h-10" : "w-7 h-7";
  return (
    <motion.div
      className={`${sz} relative`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-white/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      {/* Inner dot */}
      <div className="absolute inset-1 rounded-full bg-white/90 flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-black" />
      </div>
    </motion.div>
  );
}
