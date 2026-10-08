"use client";

import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Sparkles,
  Lock,
  Send,
  RotateCcw,
  Copy,
  Check,
  FileText,
  HelpCircle,
} from "lucide-react";
import { AIService, QUICK_PROMPT_SUGGESTIONS } from "@/services/ai.service";
import { ChatMessage } from "@/types/ai";
import { toast } from "sonner";

export default function TanyaAIPage() {
  // Saat awal-awal default kosongan (tidak ada datanya)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  type RenderStage = "input-only" | "chat-entering" | "ready";

  // Staged rendering state like ChatGPT:
  // 1. Field ketikan mounts & renders immediately (input-only, chat kosongan)
  // 2. Chat messages column streams in with smooth transition (chat-entering)
  // 3. Smoothly scrolls down to latest message and activates input (ready)
  const [renderStage, setRenderStage] = useState<RenderStage>("input-only");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMountedRef = useRef(true);

  // Scroll sampai paling bawah ke kolom ketikan dan seluruh percakapan
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    // 1. Scroll pesan dalam container internal
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }

    // 2. Scroll anchor pesan terakhir
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior,
        block: "end",
      });
    }

    // 3. Scroll halaman sampai ke kolom ketikan di bawah
    if (inputContainerRef.current) {
      inputContainerRef.current.scrollIntoView({
        behavior,
        block: "end",
        inline: "nearest",
      });
    }

    // 4. Pastikan container <main> (DashboardLayout) juga ter-scroll ke bawah
    try {
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.scrollTo({
          top: mainEl.scrollHeight,
          behavior,
        });
      }
    } catch {
      // Fallback safe
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    // Tahap 1 (Saat awal-awal): Default kosongan (tidak ada datanya), hanya field ketikan yang siap
    // Tahap 2: Kolom chat muncul bertahap beserta datanya dengan transisi halus
    const stageTimer = setTimeout(() => {
      if (isMountedRef.current) {
        setMessages(AIService.getInitialMessages());
        setRenderStage("chat-entering");

        // Tahap 3: Scroll sampai bawah ke kolom ketikan secara bertahap dan halus
        const scrollTimer1 = setTimeout(() => {
          if (isMountedRef.current) {
            scrollToBottom("smooth");
          }
        }, 150);

        const scrollTimer2 = setTimeout(() => {
          if (isMountedRef.current) {
            scrollToBottom("smooth");
          }
        }, 350);

        // Tahap 4: Status ready & aman fokus ke textarea
        const readyTimer = setTimeout(() => {
          if (isMountedRef.current) {
            scrollToBottom("smooth");
            setRenderStage("ready");
            textareaRef.current?.focus({ preventScroll: true });
          }
        }, 600);

        return () => {
          clearTimeout(scrollTimer1);
          clearTimeout(scrollTimer2);
          clearTimeout(readyTimer);
        };
      }
    }, 350);

    return () => {
      isMountedRef.current = false;
      clearTimeout(stageTimer);
    };
  }, []);

  // Auto scroll when messages change or while generating
  useEffect(() => {
    if (renderStage === "input-only") return;
    const timer = setTimeout(() => {
      scrollToBottom("smooth");
    }, 60);
    return () => clearTimeout(timer);
  }, [messages.length, isGenerating, renderStage]);

  // Handle Send message
  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || isGenerating) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      senderName: "Anda",
      timestamp: timeStr,
      content: promptToSend.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt("");
    setIsGenerating(true);

    try {
      await new Promise((res) => setTimeout(res, 900));
      if (!isMountedRef.current) return;
      const aiResponse = await AIService.generateResponse(promptToSend);
      if (!isMountedRef.current) return;
      setMessages((prev) => [...prev, aiResponse]);
    } catch {
      if (!isMountedRef.current) return;
      toast.error("Gagal memproses pesan AI. Silakan coba lagi.");
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false);
        setTimeout(() => {
          if (isMountedRef.current) {
            textareaRef.current?.focus();
          }
        }, 100);
      }
    }
  };

  // Copy single message content
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Respons berhasil disalin ke papan klip!");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Reset conversation to initial state with staged transition
  const handleResetSession = () => {
    setRenderStage("input-only");
    setMessages([]);
    setInputPrompt("");
    toast.info("Sesi tanya jawab AI telah diatur ulang.");
    setTimeout(() => {
      if (isMountedRef.current) {
        setRenderStage("chat-entering");
        setTimeout(() => {
          if (isMountedRef.current) {
            setRenderStage("ready");
            textareaRef.current?.focus();
          }
        }, 350);
      }
    }, 200);
  };

  // Copy entire conversation history
  const handleCopyEntireHistory = () => {
    if (messages.length === 0) {
      toast.info("Belum ada riwayat percakapan untuk disalin.");
      return;
    }
    const historyText = messages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.senderName}:\n${m.content}\n-------------------------`
      )
      .join("\n\n");
    navigator.clipboard.writeText(historyText);
    toast.success("Seluruh riwayat obrolan berhasil disalin!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-3 max-w-3xl mx-auto pb-6">
        {/* Page Header */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Tanya AI (Audit Pro Assistant)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Asisten kecerdasan buatan untuk analisis temuan audit toko
          </p>
        </div>

        {/* Main Card Canvas */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-[560px]">
          {/* Card Header Bar */}
          <div className="px-4 py-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-900 text-xs">Sesi Aktif</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 text-[11px]">
                Audit Pro Assistant AI
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyEntireHistory}
                disabled={messages.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Salin seluruh riwayat obrolan"
              >
                <Copy className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Salin Riwayat</span>
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                title="Reset sesi percakapan"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset Sesi</span>
              </button>
            </div>
          </div>

          {/* Canvas Tengah: Kolom Chat Messages Stream & ChatGPT-style Skeleton Placeholder */}
          <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* ChatGPT-style Loading Skeleton Placeholder saat Awal Buka Halaman (Tahap input-only) */}
            {renderStage === "input-only" && (
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center max-w-lg mx-auto bg-white z-10 animate-pulse">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 mb-2.5" />
                <div className="h-4 w-36 bg-slate-100 rounded-md mb-1.5" />
                <div className="h-3 w-56 bg-slate-100 rounded-md mb-5" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <div className="h-16 bg-slate-100/70 rounded-xl" />
                  <div className="h-16 bg-slate-100/70 rounded-xl" />
                  <div className="h-16 bg-slate-100/70 rounded-xl" />
                  <div className="h-16 bg-slate-100/70 rounded-xl" />
                </div>
              </div>
            )}

            {/* Kolom Chat Messages Stream (Scroll Container murni tanpa transform agar browser tidak membatalkan smooth scroll) */}
            <div
              ref={scrollContainerRef}
              className="p-3.5 sm:p-4 flex-1 space-y-4 overflow-y-auto flex flex-col"
            >
              <div
                className={`space-y-4 flex-1 flex flex-col transition-all duration-500 ease-out ${
                  renderStage !== "input-only"
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3 pointer-events-none"
                }`}
              >
                {/* Security Banner */}
                <div className="flex items-center justify-center pt-0.5 pb-1 shrink-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/70 border border-blue-100 text-[10.5px] text-slate-600 shadow-2xs text-center">
                    <Lock className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>
                      Konteks audit data retail telah diamankan dan disinkronkan dengan database pusat.
                    </span>
                  </div>
                </div>

                {/* JIKA KOSONG: Hero Welcome State dengan Starter Prompt Cards */}
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center max-w-lg mx-auto my-auto animate-in fade-in duration-300">
                    <div className="w-11 h-11 rounded-2xl bg-[#193f53]/10 border border-[#193f53]/20 flex items-center justify-center mb-2.5 shadow-2xs">
                      <Sparkles className="w-5 h-5 text-[#193f53]" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Audit Pro Assistant
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      Asisten cerdas untuk analisis data kepatuhan gerai, ringkasan temuan audit, atau pembuatan memo tindak lanjut CAPA.
                    </p>

                    {/* Starter Suggestions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 w-full text-left">
                      {QUICK_PROMPT_SUGGESTIONS.slice(0, 4).map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(sug)}
                          disabled={isGenerating}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-[11px] text-slate-700 leading-snug transition-all text-left shadow-2xs cursor-pointer group flex flex-col justify-between"
                        >
                          <span className="font-medium text-slate-800 line-clamp-2">
                            {sug}
                          </span>
                          <span className="text-[10px] text-[#193f53] font-semibold mt-1.5 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            Tanyakan sekarang →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Messages Stream */
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col transition-all duration-500 ease-out ${
                        msg.sender === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      {msg.sender === "user" ? (
                        /* User Message Bubble */
                        <div className="max-w-lg sm:max-w-xl">
                          <div className="bg-[#102d3c] text-white px-3.5 py-2.5 rounded-xl rounded-tr-xs text-xs leading-relaxed shadow-2xs font-normal">
                            {msg.content}
                          </div>
                          <p className="text-[10px] text-slate-400 text-right mt-1 font-medium">
                            {msg.timestamp} • {msg.senderName}
                          </p>
                        </div>
                      ) : (
                        /* Assistant Message Bubble */
                        <div className="flex items-start gap-2.5 max-w-xl sm:max-w-2xl w-full">
                          {/* Assistant Avatar */}
                          <div className="w-7 h-7 rounded-md bg-[#193f53] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="bg-white border border-slate-200 rounded-xl rounded-tl-xs p-3.5 shadow-2xs text-xs text-slate-800 leading-relaxed relative group">
                              {/* Message Content Rendered */}
                              <div className="whitespace-pre-line space-y-1.5">
                                {msg.content}
                              </div>

                              {/* Message Action Footer */}
                              <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                                  className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                >
                                  {copiedId === msg.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-600">Tersalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Salin Jawaban</span>
                                    </>
                                  )}
                                </button>

                                {msg.isDraft && (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    <FileText className="w-3 h-3" />
                                    Format Memo Resmi
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Timestamp & Sender */}
                            <p className="text-[10px] text-slate-400 mt-1 pl-0.5 font-medium">
                              {msg.timestamp} • {msg.senderName}
                            </p>

                            {/* Follow-up Suggestions Chips */}
                            {msg.suggestions && msg.suggestions.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-0.5">
                                {msg.suggestions.map((sug, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSend(sug)}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-[#193f53]" />
                                    <span>{sug}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* AI Typing Indicator */}
                {isGenerating && (
                  <div className="flex items-start gap-2.5 max-w-xl sm:max-w-2xl">
                    <div className="w-7 h-7 rounded-md bg-[#193f53] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-sky-300 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl rounded-tl-xs px-3 py-2 shadow-2xs flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Menganalisis data laporan audit...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Anchor scroll pesan */}
              <div ref={messagesEndRef} className="h-px shrink-0" />
            </div>
          </div>

          {/* Quick Prompts Carousel Bar (Hanya tampil saat percakapan aktif) */}
          {messages.length > 0 && (
            <div
              className={`px-4 py-1.5 border-t border-slate-100 bg-slate-50/50 shrink-0 transition-all duration-500 ${renderStage !== "input-only"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
                }`}
            >
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  Rekomendasi:
                </span>
                {QUICK_PROMPT_SUGGESTIONS.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(sug)}
                    disabled={isGenerating}
                    className="shrink-0 text-[10.5px] font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAHAP 1: Field Ketikan (Tampil Langsung di Awal dan Siap Digunakan) */}
          <div
            ref={inputContainerRef}
            className="p-3 sm:p-3.5 bg-white border-t border-slate-100 shrink-0 animate-in fade-in duration-300"
          >
            <div className="border border-slate-200 rounded-lg p-2.5 bg-white focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15 transition-all shadow-2xs">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isGenerating}
                placeholder="Tanyakan apa saja seputar audit atau kepatuhan..."
                rows={1}
                className="w-full bg-transparent resize-none text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 disabled:opacity-50"
              />

              <div className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t border-slate-100">
                <span className="text-[10.5px] text-slate-400 font-medium hidden sm:inline">
                  Tekan <kbd className="px-1 py-0.2 bg-slate-100 rounded text-[9.5px] border border-slate-200 font-mono">Enter ↵</kbd> untuk kirim
                </span>

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputPrompt.trim() || isGenerating}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#193f53] hover:bg-[#143343] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Kirim Pesan</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Security Subtitle */}
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Audit Pro Assistant memproses data audit retail internal secara aman dan terenkripsi.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
