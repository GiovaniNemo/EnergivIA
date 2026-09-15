"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Star, X } from "lucide-react";

export function EnergiviaFloatingHub() {
  const pathname = usePathname();
  const normalizedPath = (pathname ?? "").replace(/\/$/, "") || "/";

  const [isExpanded, setIsExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement | null>(null);

  // Monitora se o chat ou o feedback estão abertos para ajustar a interface
  useEffect(() => {
    const handleChatVisibility = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      const isOpen = Boolean(customEvent.detail?.isOpen);
      setChatOpen(isOpen);
      if (isOpen) {
        setIsExpanded(false);
      }
    };

    const handleFeedbackVisibility = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      const isOpen = Boolean(customEvent.detail?.isOpen);
      setFeedbackOpen(isOpen);
      if (isOpen) {
        setIsExpanded(false);
      }
    };

    window.addEventListener("ai-chat-visibility-change", handleChatVisibility);
    window.addEventListener("feedback-prompt-visibility-change", handleFeedbackVisibility);

    return () => {
      window.removeEventListener("ai-chat-visibility-change", handleChatVisibility);
      window.removeEventListener("feedback-prompt-visibility-change", handleFeedbackVisibility);
    };
  }, []);

  // Fechar menu orbital ao clicar fora
  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (hubRef.current && !hubRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  // Rotas que não devem exibir o botão
  const isFullscreen =
    /^\/propostas\/templates\/[^/]+$/.test(normalizedPath) ||
    /^\/proposals\/templates\/[^/]+$/.test(normalizedPath) ||
    /^\/admin\/template-models\/[^/]+$/.test(normalizedPath) ||
    normalizedPath === "/create-organization" ||
    normalizedPath === "/chat";

  if (isFullscreen) {
    return null;
  }

  // Se a janela do chat ou do feedback estiver aberta, ocultamos o botão flutuante para evitar poluição visual
  if (chatOpen || feedbackOpen) {
    return null;
  }

  const handleOpenChat = () => {
    setIsExpanded(false);
    window.dispatchEvent(new CustomEvent("open-ai-chat"));
  };

  const handleOpenFeedback = () => {
    setIsExpanded(false);
    window.dispatchEvent(new CustomEvent("open-feedback-prompt"));
  };

  return (
    <div
      ref={hubRef}
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-auto select-none"
    >
      {/* Bolinhas Satélite (Menu Orbital Expandido) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-col items-end gap-3 mb-3"
          >
            {/* Bolinha 2: Avaliar EnergivIA */}
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.6 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.6 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              className="flex items-center gap-2.5 group"
            >
              <span className="px-3 py-1.5 rounded-full bg-neutral-900/95 text-amber-300 text-xs font-bold shadow-lg border border-amber-500/30 backdrop-blur-md opacity-90 group-hover:opacity-100 transition whitespace-nowrap">
                Avaliar EnergivIA ⭐
              </span>
              <button
                type="button"
                onClick={handleOpenFeedback}
                aria-label="Avaliar EnergivIA"
                className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 hover:from-amber-300 hover:to-orange-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/35 hover:shadow-amber-500/50 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-amber-200/40"
              >
                <Star className="w-6 h-6 fill-slate-950 text-slate-950" />
              </button>
            </motion.div>

            {/* Bolinha 1: Assistente Chatbot IA */}
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.6 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.6 }}
              transition={{ delay: 0.0, duration: 0.2 }}
              className="flex items-center gap-2.5 group"
            >
              <span className="px-3 py-1.5 rounded-full bg-neutral-900/95 text-emerald-300 text-xs font-bold shadow-lg border border-emerald-500/30 backdrop-blur-md opacity-90 group-hover:opacity-100 transition whitespace-nowrap">
                Assistente EnergivIA 🤖
              </span>
              <button
                type="button"
                onClick={handleOpenChat}
                aria-label="Abrir Assistente EnergivIA"
                className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 hover:shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-emerald-300/30"
              >
                <Bot className="w-6 h-6 text-white" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão Flutuante Principal Fixo */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-label="Menu Inteligente EnergivIA"
        className={`relative w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden ${
          isExpanded
            ? "bg-neutral-900 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-105"
            : "bg-gradient-to-br from-[#060c18] via-[#09182b] to-[#040810] border border-emerald-500/40 hover:border-amber-400/80 shadow-[0_4px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_35px_rgba(245,158,11,0.5)] hover:scale-108 active:scale-95"
        }`}
      >
        {/* Halo estático suave */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.25)_0%,transparent_70%)] pointer-events-none" />

        {isExpanded ? (
          /* Quando expandido, exibe o ícone de fechar */
          <motion.div
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 flex items-center justify-center text-emerald-400"
          >
            <X className="w-7 h-7" />
          </motion.div>
        ) : (
          /* Imagem fixa do cérebro com circuitos e nós neurais */
          <div className="relative w-full h-full flex items-center justify-center p-2.5">
            <Image
              src="/brain-circuit-icon.png"
              alt="EnergivIA"
              width={48}
              height={48}
              className="w-[44px] h-[44px] object-contain shrink-0 select-none drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"
              priority
              unoptimized
            />
          </div>
        )}
      </button>
    </div>
  );
}
