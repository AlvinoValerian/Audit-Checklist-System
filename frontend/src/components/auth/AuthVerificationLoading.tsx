"use client";

import React from "react";
import { MorphingSquare } from "@/components/ui/morphing-square";

interface AuthVerificationLoadingProps {
  message?: string;
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
  isRedirecting?: boolean;
}

export default function AuthVerificationLoading({
  message = "Loading...",
}: AuthVerificationLoadingProps) {
  return (
    <div className="fixed inset-0 z-[9999] min-h-screen w-full bg-white flex flex-col items-center justify-center p-6 text-[#193f53] font-sans select-none">
      <MorphingSquare
        className="w-7 h-7 bg-[#193f53]"
        message={message}
        messagePlacement="bottom"
      />
    </div>
  );
}
