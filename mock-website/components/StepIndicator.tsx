"use client";
import { motion } from "framer-motion";

interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export default function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 w-full max-w-md mx-auto">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          {/* Circle */}
          <div className="relative flex-none">
            <motion.div
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono font-bold transition-all duration-500
                ${i < current ? "border-white bg-white text-black" : i === current ? "border-white bg-transparent text-white" : "border-white/20 bg-transparent text-white/30"}`}
              initial={false}
              animate={i === current ? { boxShadow: "0 0 12px rgba(255,255,255,0.3)" } : { boxShadow: "none" }}
            >
              {i < current ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                i + 1
              )}
            </motion.div>
          </div>
          {/* Line */}
          {i < steps.length - 1 && (
            <div className="flex-1 h-px mx-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10" />
              <motion.div
                className="absolute inset-0 bg-white origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: i < current ? 1 : 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
