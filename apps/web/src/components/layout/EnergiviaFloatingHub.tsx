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
  const [isHovered, setIsHovered] = useState(false);
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

      {/* Botão Flutuante Principal: Rede Neural que se transforma no Cérebro da EnergivIA */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Menu Inteligente EnergivIA"
        className={`relative w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden ${
          isExpanded
            ? "bg-neutral-900 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-105"
            : "bg-gradient-to-br from-[#060c18] via-[#09182b] to-[#040810] border border-emerald-500/40 hover:border-amber-400/80 shadow-[0_4px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_35px_rgba(245,158,11,0.5)] hover:scale-108 active:scale-95"
        }`}
      >
        {/* Anel de energia pulsante quando em repouso */}
        {!isExpanded && (
          <div className="absolute inset-0 rounded-full border border-emerald-400/25 animate-ping opacity-30 pointer-events-none" />
        )}

        {/* Brilho radial de fundo dinâmico */}
        <div
          className={`absolute inset-0 rounded-full transition-opacity duration-500 pointer-events-none ${
            isHovered
              ? "opacity-100 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.35)_0%,rgba(245,158,11,0.22)_50%,transparent_80%)]"
              : "opacity-40 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.2)_0%,transparent_70%)]"
          }`}
        />

        {isExpanded ? (
          /* Quando expandido, exibe o ícone de fechar suave */
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
          /* Metamorfose: Cérebro de Rede Neural (repouso) -> Cérebro Oficial EnergivIA (hover) */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Camada 1: Cérebro de Rede Neural (Constelação de nós e sinapses) */}
            <motion.div
              animate={{
                opacity: isHovered ? 0 : 1,
                scale: isHovered ? 0.8 : 1,
                rotate: isHovered ? 8 : 0,
                filter: isHovered
                  ? "brightness(1.8) drop-shadow(0 0 15px rgba(52,211,153,1)) blur(2px)"
                  : "brightness(1) drop-shadow(0 0 6px rgba(0,245,212,0.65)) drop-shadow(0 0 12px rgba(16,185,129,0.4)) blur(0px)",
              }}
              transition={{
                duration: 0.42,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute inset-0 flex items-center justify-center p-2.5 pointer-events-none"
            >
              <Image
                src="/neural-brain-white.png"
                alt="Rede Neural EnergivIA"
                width={48}
                height={48}
                className="w-[45px] h-[45px] object-contain shrink-0 select-none"
                priority
                unoptimized
              />
            </motion.div>

            {/* Onda de choque / Flash de transição bio-elétrica */}
            <motion.div
              animate={{
                opacity: isHovered ? [0, 0.85, 0] : 0,
                scale: isHovered ? [0.6, 1.4] : 0.6,
              }}
              transition={{
                duration: 0.48,
                ease: "easeOut",
              }}
              className="absolute inset-1 rounded-full border-2 border-emerald-400/80 pointer-events-none"
            />

            {/* Camada 2: Cérebro Oficial da EnergivIA (bateria solar + circuitos + cores reais da marca) */}
            <motion.div
              animate={{
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1 : 0.8,
                rotate: isHovered ? 0 : -8,
                filter: isHovered
                  ? "drop-shadow(0 0 10px rgba(16,185,129,0.95)) drop-shadow(0 0 20px rgba(245,158,11,0.5)) blur(0px)"
                  : "drop-shadow(0 0 0px transparent) blur(2px)",
              }}
              transition={{
                duration: 0.42,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute inset-0 flex items-center justify-center p-2.5 pointer-events-none"
            >
              <Image
                src="/favicon-dark.png"
                alt="Cérebro EnergivIA"
                width={48}
                height={48}
                className="w-[45px] h-[45px] object-contain shrink-0 select-none"
                priority
                unoptimized
              />
            </motion.div>
          </div>
        )}
      </button>
    </div>
  );
}
