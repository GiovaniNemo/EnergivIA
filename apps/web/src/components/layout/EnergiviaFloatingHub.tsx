"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Star, X } from "lucide-react";

/**
 * Ilustração vetorial de alta definição da Rede Neural da EnergivIA.
 * Inspirada em malhas de IA generativa e arquitetura de redes neurais profundas:
 * nós luminosos, caminhos sinápticos com gradientes elétricos e pulsos de dados.
 */
function HighTechNeuralMesh({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Glows e gradientes neon */}
        <radialGradient id="meshCenterGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#06B6D4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cyberLine1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F5D4" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="cyberLine2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="60%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="cyberLine3" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id="neonBloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Aura radial central */}
      <circle cx="50" cy="50" r="42" fill="url(#meshCenterGlow)" />

      {/* Anéis orbitais finos da rede (estilo radar holográfico) */}
      <circle
        cx="50"
        cy="50"
        r="32"
        stroke="#10B981"
        strokeOpacity="0.2"
        strokeWidth="0.8"
        strokeDasharray="2 4"
      />
      <circle
        cx="50"
        cy="50"
        r="18"
        stroke="#00F5D4"
        strokeOpacity="0.25"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />

      {/* Sinapses Primárias e Secundárias interconectadas */}
      <g filter="url(#neonBloom)">
        {/* Linhas da Malha Central */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="20"
          stroke="url(#cyberLine1)"
          strokeWidth="1.2"
          strokeOpacity="0.8"
        />
        <line
          x1="50"
          y1="50"
          x2="76"
          y2="35"
          stroke="url(#cyberLine2)"
          strokeWidth="1.2"
          strokeOpacity="0.8"
        />
        <line
          x1="50"
          y1="50"
          x2="76"
          y2="65"
          stroke="url(#cyberLine1)"
          strokeWidth="1.2"
          strokeOpacity="0.8"
        />
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="80"
          stroke="url(#cyberLine3)"
          strokeWidth="1.2"
          strokeOpacity="0.8"
        />
        <line
          x1="50"
          y1="50"
          x2="24"
          y2="65"
          stroke="url(#cyberLine2)"
          strokeWidth="1.2"
          strokeOpacity="0.8"
        />
        <line
          x1="50"
          y1="50"
          x2="24"
          y2="35"
          stroke="url(#cyberLine1)"
          strokeWidth="1.2"
          strokeOpacity="0.8"
        />

        {/* Polígono Perimetral Hexagonal Interconectado */}
        <polygon
          points="50,20 76,35 76,65 50,80 24,65 24,35"
          fill="none"
          stroke="url(#cyberLine2)"
          strokeWidth="1.1"
          strokeOpacity="0.65"
        />

        {/* Conexões Diagonais Cruzadas da Rede Neural Profunda */}
        <line
          x1="50"
          y1="20"
          x2="76"
          y2="65"
          stroke="#34D399"
          strokeWidth="0.8"
          strokeOpacity="0.45"
          strokeDasharray="3 2"
        />
        <line
          x1="50"
          y1="20"
          x2="24"
          y2="65"
          stroke="#38BDF8"
          strokeWidth="0.8"
          strokeOpacity="0.45"
          strokeDasharray="3 2"
        />
        <line
          x1="24"
          y1="35"
          x2="76"
          y2="35"
          stroke="#FBBF24"
          strokeWidth="0.8"
          strokeOpacity="0.4"
          strokeDasharray="4 3"
        />
        <line
          x1="24"
          y1="65"
          x2="76"
          y2="65"
          stroke="#10B981"
          strokeWidth="0.8"
          strokeOpacity="0.4"
          strokeDasharray="4 3"
        />

        {/* Satélites Externos de Entrada e Saída (Input / Output Layers) */}
        <line
          x1="50"
          y1="20"
          x2="50"
          y2="10"
          stroke="url(#cyberLine1)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
        <line
          x1="76"
          y1="35"
          x2="88"
          y2="28"
          stroke="url(#cyberLine2)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
        <line
          x1="76"
          y1="65"
          x2="88"
          y2="72"
          stroke="url(#cyberLine1)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
        <line
          x1="50"
          y1="80"
          x2="50"
          y2="90"
          stroke="url(#cyberLine3)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
        <line
          x1="24"
          y1="65"
          x2="12"
          y2="72"
          stroke="url(#cyberLine2)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
        <line
          x1="24"
          y1="35"
          x2="12"
          y2="28"
          stroke="url(#cyberLine1)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
      </g>

      {/* Pulsos de Sinal Ativos (fótons/dados viajando pelas sinapses) */}
      <circle cx="50" cy="32" r="1.8" fill="#FDE047">
        <animate attributeName="cy" values="20;50;20" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;1;0.2" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="65" cy="41" r="1.8" fill="#00F5D4">
        <animate attributeName="cx" values="50;76;50" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="cy" values="50;35;50" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;1;0.2" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="35" cy="59" r="1.8" fill="#6EE7B7">
        <animate attributeName="cx" values="50;24;50" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="50;65;50" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Nós Neurais com Núcleo Brilhante e Halo */}
      <g>
        {/* NÓ CENTRAL (Núcleo da IA) */}
        <circle cx="50" cy="50" r="7" fill="#10B981" fillOpacity="0.3" />
        <circle cx="50" cy="50" r="4.5" fill="#059669" />
        <circle cx="50" cy="50" r="2.2" fill="#FFFFFF" />

        {/* NÓS INTERMEDIÁRIOS */}
        {/* Topo */}
        <circle cx="50" cy="20" r="5" fill="#00F5D4" fillOpacity="0.25" />
        <circle cx="50" cy="20" r="3.2" fill="#0D9488" />
        <circle cx="50" cy="20" r="1.5" fill="#FFFFFF" />

        {/* Superior Direito */}
        <circle cx="76" cy="35" r="5" fill="#38BDF8" fillOpacity="0.25" />
        <circle cx="76" cy="35" r="3.2" fill="#0284C7" />
        <circle cx="76" cy="35" r="1.5" fill="#FFFFFF" />

        {/* Inferior Direito */}
        <circle cx="76" cy="65" r="5" fill="#FBBF24" fillOpacity="0.25" />
        <circle cx="76" cy="65" r="3.2" fill="#D97706" />
        <circle cx="76" cy="65" r="1.5" fill="#FFFFFF" />

        {/* Base */}
        <circle cx="50" cy="80" r="5" fill="#10B981" fillOpacity="0.25" />
        <circle cx="50" cy="80" r="3.2" fill="#059669" />
        <circle cx="50" cy="80" r="1.5" fill="#FFFFFF" />

        {/* Inferior Esquerdo */}
        <circle cx="24" cy="65" r="5" fill="#34D399" fillOpacity="0.25" />
        <circle cx="24" cy="65" r="3.2" fill="#059669" />
        <circle cx="24" cy="65" r="1.5" fill="#FFFFFF" />

        {/* Superior Esquerdo */}
        <circle cx="24" cy="35" r="5" fill="#00F5D4" fillOpacity="0.25" />
        <circle cx="24" cy="35" r="3.2" fill="#0F766E" />
        <circle cx="24" cy="35" r="1.5" fill="#FFFFFF" />

        {/* NÓS EXTERNOS DE BORDA (Sensores da Rede) */}
        <circle cx="50" cy="10" r="2.2" fill="#38BDF8" />
        <circle cx="88" cy="28" r="2.2" fill="#FBBF24" />
        <circle cx="88" cy="72" r="2.2" fill="#34D399" />
        <circle cx="50" cy="90" r="2.2" fill="#F59E0B" />
        <circle cx="12" cy="72" r="2.2" fill="#00F5D4" />
        <circle cx="12" cy="28" r="2.2" fill="#10B981" />
      </g>
    </svg>
  );
}

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

      {/* Botão Flutuante Principal ("Bolinha" com Rede Neural que se transforma no Cérebro da EnergivIA) */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Menu Inteligente EnergivIA"
        className={`relative w-[62px] h-[62px] rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden ${
          isExpanded
            ? "bg-neutral-900 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-105"
            : "bg-gradient-to-br from-[#060c18] via-[#09182b] to-[#040810] border border-emerald-500/40 hover:border-amber-400/80 shadow-[0_4px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_35px_rgba(245,158,11,0.5)] hover:scale-108 active:scale-95"
        }`}
      >
        {/* Anel de energia pulsante quando em repouso */}
        {!isExpanded && (
          <div className="absolute inset-0 rounded-full border border-emerald-400/25 animate-ping opacity-30 pointer-events-none" />
        )}

        {/* Brilho radial de fundo no hover */}
        <div
          className={`absolute inset-0 rounded-full transition-opacity duration-500 pointer-events-none ${
            isHovered
              ? "opacity-100 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.28)_0%,rgba(245,158,11,0.18)_50%,transparent_80%)]"
              : "opacity-40 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]"
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
          /* Efeito de Transformação Cinematográfica: Rede Neural (repouso) -> Cérebro Real da EnergivIA (hover) */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Camada 1: Desenho da Rede Neural (visível em repouso, converge/colapsa ao passar o mouse) */}
            <motion.div
              animate={{
                opacity: isHovered ? 0 : 1,
                scale: isHovered ? 0.35 : 1,
                rotate: isHovered ? 45 : 0,
                filter: isHovered ? "blur(4px)" : "blur(0px)",
              }}
              transition={{
                duration: 0.38,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute inset-0 flex items-center justify-center p-2.5 pointer-events-none"
            >
              <HighTechNeuralMesh className="w-full h-full drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </motion.div>

            {/* Pulso de transição / Shockwave de energia */}
            <motion.div
              animate={{
                opacity: isHovered ? [0, 0.9, 0] : 0,
                scale: isHovered ? [0.5, 1.35] : 0.5,
              }}
              transition={{
                duration: 0.45,
                ease: "easeOut",
              }}
              className="absolute inset-2 rounded-full border-2 border-emerald-400/80 pointer-events-none"
            />

            {/* Camada 2: Imagem Oficial do Cérebro EnergivIA (/favicon-dark.png) */}
            <motion.div
              animate={{
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1 : 0.35,
                rotate: isHovered ? 0 : -35,
                filter: isHovered
                  ? "drop-shadow(0 0 10px rgba(16,185,129,0.9)) drop-shadow(0 0 18px rgba(245,158,11,0.5))"
                  : "drop-shadow(0 0 0px transparent)",
              }}
              transition={{
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute inset-0 flex items-center justify-center p-2.5 pointer-events-none"
            >
              <Image
                src="/favicon-dark.png"
                alt="Cérebro EnergivIA"
                width={44}
                height={44}
                className="w-[42px] h-[42px] object-contain shrink-0 select-none"
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
