"use client";
import { motion } from "framer-motion";

export default function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <motion.div
      className="card p-6 space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="skeleton h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3" style={{ width: `${75 + Math.random() * 25}%` }} />
      ))}
    </motion.div>
  );
}
