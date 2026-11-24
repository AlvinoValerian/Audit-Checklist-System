"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordStrengthProps {
  value: string;
  confirmValue?: string;
  className?: string;
}

const COMMON_PATTERNS = [
  "password",
  "sandi",
  "admin",
  "qwerty",
  "asdf",
  "zxcv",
  "auditpro",
  "rahasia",
  "1234",
  "2345",
  "3456",
  "4567",
  "5678",
  "6789",
  "0123",
  "9876",
  "8765",
  "abcd",
  "bcde",
  "cdef",
];

function detectCommonPattern(password: string): string | null {
  if (!password) return null;
  const lower = password.toLowerCase();

  if (/(.)\1{3,}/.test(password)) {
    return "Hindari pengulangan karakter yang sama berturut-turut.";
  }

  const matched = COMMON_PATTERNS.find((pattern) => lower.includes(pattern));
  if (matched) {
    return "Hindari pola umum atau urutan karakter yang mudah ditebak.";
  }

  return null;
}

const LEVEL_CONFIG = [
  {
    label: "",
    textClass: "text-slate-400",
    barClass: "bg-slate-200",
  },
  {
    label: "Lemah",
    textClass: "text-rose-600",
    barClass: "bg-rose-500",
  },
  {
    label: "Cukup",
    textClass: "text-amber-600",
    barClass: "bg-amber-500",
  },
  {
    label: "Baik",
    textClass: "text-[#193f53]",
    barClass: "bg-[#193f53]",
  },
  {
    label: "Kuat",
    textClass: "text-emerald-600",
    barClass: "bg-emerald-500",
  },
] as const;

export function PasswordStrength({
  value,
  confirmValue,
  className,
}: PasswordStrengthProps) {
  const analysis = useMemo(() => {
    const hasMinLength = value.length >= 8;
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasAlphaNum = /[a-zA-Z]/.test(value) && /[0-9]/.test(value);
    const isMatched =
      confirmValue !== undefined && value.length > 0 && value === confirmValue;
    const patternWarning = detectCommonPattern(value);

    const requirements = [
      { id: "length", label: "Min. 8 karakter", met: hasMinLength },
      { id: "upper", label: "Huruf kapital (A-Z)", met: hasUppercase },
      { id: "alphanum", label: "Huruf & angka", met: hasAlphaNum },
      ...(confirmValue !== undefined
        ? [{ id: "match", label: "Konfirmasi cocok", met: isMatched }]
        : []),
    ];

    let level = 0;
    if (value.length > 0) {
      const corePassed = [hasMinLength, hasUppercase, hasAlphaNum].filter(
        Boolean
      ).length;

      if (corePassed <= 1) {
        level = 1;
      } else if (corePassed === 2) {
        level = 2;
      } else {
        level = hasLowercase ? 4 : 3;
      }

      if (patternWarning && level > 2) {
        level = 2;
      }
    }

    return {
      level,
      patternWarning,
      requirements,
    };
  }, [value, confirmValue]);

  const currentLevel = LEVEL_CONFIG[analysis.level];

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 space-y-2.5",
        className
      )}
    >
      {/* Header & Segmented Strength Bars */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-slate-500">
            Kekuatan Kata Sandi{" "}
            <span className="text-slate-400 font-normal">(tanpa simbol)</span>
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={analysis.level}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.16 }}
              className={cn("font-semibold", currentLevel.textClass)}
            >
              {analysis.level === 0 ? "Belum diisi" : currentLevel.label}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => {
            const isActive = analysis.level >= segment;
            return (
              <div
                key={segment}
                className="h-1.5 w-full rounded-full bg-slate-200/90 overflow-hidden"
              >
                <motion.div
                  initial={false}
                  animate={{
                    scaleX: isActive ? 1 : 0,
                    opacity: isActive ? 1 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 32,
                  }}
                  style={{ transformOrigin: "left" }}
                  className={cn("h-full w-full rounded-full", currentLevel.barClass)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Common Pattern Detection Warning */}
      <AnimatePresence initial={false}>
        {analysis.patternWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 text-[11px] text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{analysis.patternWarning}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Requirements Checklist */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {analysis.requirements.map((req) => (
          <li
            key={req.id}
            className="flex items-center gap-1.5 text-[11px] leading-tight"
          >
            <motion.span
              initial={false}
              animate={{
                scale: req.met ? [0.85, 1.08, 1] : 1,
                backgroundColor: req.met ? "#10b981" : "#e2e8f0",
              }}
              transition={{ duration: 0.2 }}
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
            >
              {req.met ? (
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              ) : (
                <span className="w-1 h-1 rounded-full bg-slate-400" />
              )}
            </motion.span>
            <span
              className={cn(
                "transition-colors duration-150",
                req.met ? "text-slate-700 font-medium" : "text-slate-400"
              )}
            >
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrength;
