"use client";

import React, { useState } from "react";
import { MorphingSquare } from "@/components/ui/morphing-square";

export default function DemoPage() {
  const [spinStyle, setSpinStyle] = useState<"smooth" | "linear">("smooth");
  const [theme, setTheme] = useState<"white" | "dark">("white");

  return (
    <div
      className={`fixed inset-0 min-h-screen w-full flex flex-col items-center justify-center p-6 font-sans select-none transition-colors duration-300 ${
        theme === "white" ? "bg-white text-[#193f53]" : "bg-black text-white"
      }`}
    >
      {/* Floating Controls */}
      <div className="fixed top-4 right-4 z-50 flex flex-wrap items-center gap-2 bg-slate-100/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-semibold text-slate-600">Gaya Putar:</span>
        <button
          onClick={() => setSpinStyle("smooth")}
          className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
            spinStyle === "smooth"
              ? "bg-[#193f53] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          Fluid 360° (Mulus)
        </button>
        <button
          onClick={() => setSpinStyle("linear")}
          className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
            spinStyle === "linear"
              ? "bg-[#193f53] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          Linear (Konstan)
        </button>

        <span className="text-xs font-semibold text-slate-400 ml-2">|</span>

        <button
          onClick={() => setTheme(theme === "white" ? "dark" : "white")}
          className="text-xs px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
        >
          Tema: {theme === "white" ? "Putih" : "Hitam"}
        </button>
      </div>

      <MorphingSquare
        className={theme === "white" ? "w-7 h-7 bg-[#193f53]" : "w-7 h-7 bg-white"}
        message="Loading..."
        messagePlacement="bottom"
        spinStyle={spinStyle}
      />
    </div>
  );
}
