"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  /** Teks status utama dengan efek kilau shimmer */
  status?: string;
  /** Teks petunjuk opsional berukuran kecil di bawah/samping status */
  hint?: string;
  /** Tampilkan chip penghitung waktu berjalan (elapsed timer) */
  showTimer?: boolean;
  /** Ukuran grid pixel (3 = 3x3, 4 = 4x4) */
  gridSize?: 3 | 4;
  className?: string;
}

/**
 * Compact pixel-grid loader with an animated diagonal wavefront,
 * shimmering status label, optional hint, and live elapsed timer.
 */
export function LoadingState({
  status = "Menganalisis data audit...",
  hint,
  showTimer = true,
  gridSize = 3,
  className,
}: LoadingStateProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!showTimer) return;
    const start = performance.now();
    const timer = setInterval(() => {
      setElapsedMs(performance.now() - start);
    }, 100);
    return () => clearInterval(timer);
  }, [showTimer]);

  const cells = Array.from({ length: gridSize * gridSize }, (_, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    return { index, wavefrontDelay: (row + col) * 0.1 };
  });

  const formattedTime = `${(elapsedMs / 1000).toFixed(1)}s`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center gap-2.5 py-1.5",
        className
      )}
    >
      {/* Compact Pixel-Grid Wavefront */}
      <div
        aria-hidden="true"
        className={cn(
          "grid gap-[2.5px] shrink-0",
          gridSize === 4 ? "grid-cols-4" : "grid-cols-3"
        )}
      >
        {cells.map(({ index, wavefrontDelay }) => (
          <motion.span
            key={index}
            className="w-1.5 h-1.5 rounded-[1.5px] bg-[#193f53]"
            animate={{
              opacity: [0.18, 1, 0.18],
              scale: [0.8, 1.08, 0.8],
            }}
            transition={{
              duration: 1.15,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: wavefrontDelay,
            }}
          />
        ))}
      </div>

      {/* Shimmering Status Label + Optional Hint */}
      <div className="flex flex-col min-w-0">
        <motion.span
          className="text-[11.5px] font-semibold leading-tight bg-gradient-to-r from-slate-500 via-[#193f53] to-slate-400 bg-[length:220%_100%] bg-clip-text text-transparent select-none"
          animate={{
            backgroundPosition: ["120% 0%", "-120% 0%"],
          }}
          transition={{
            duration: 1.8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          {status}
        </motion.span>
        {hint && (
          <span className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
            {hint}
          </span>
        )}
      </div>

      {/* Live Elapsed Timer Chip */}
      {showTimer && (
        <span className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 text-[10px] font-mono tabular-nums text-slate-500 shrink-0">
          {formattedTime}
        </span>
      )}
    </motion.div>
  );
}

export default LoadingState;
