"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Star, X } from "lucide-react";

/**
 * Componente SVG da Rede Neural (estado padrão):
 * Desenho vetorial de nós interconectados com sinapses pulsantes.
 */
function NeuralNetworkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="neuralGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#065F46" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="synapseGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="synapseGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Aura de fundo */}
      <circle cx="50" cy="50" r="35" fill="url(#neuralGlow)" opacity="0.4" />

      {/* Linhas / Conexões Sinápticas */}
      <g strokeWidth="2.2" strokeLinecap="round" opacity="0.75">
        <line x1="28" y1="32" x2="50" y2="24" stroke="url(#synapseGrad1)" />
        <line x1="50" y1="24" x2="72" y2="32" stroke="url(#synapseGrad2)" />
        <line x1="28" y1="32" x2="36" y2="52" stroke="url(#synapseGrad2)" />
        <line x1="72" y1="32" x2="64" y2="52" stroke="url(#synapseGrad1)" />
        <line x1="36" y1="52" x2="50" y2="48" stroke="url(#synapseGrad1)" />
        <line x1="64" y1="52" x2="50" y2="48" stroke="url(#synapseGrad2)" />
        <line x1="50" y1="24" x2="50" y2="48" stroke="url(#synapseGrad1)" />
        <line x1="36" y1="52" x2="32" y2="72" stroke="url(#synapseGrad2)" />
        <line x1="64" y1="52" x2="68" y2="72" stroke="url(#synapseGrad1)" />
        <line x1="50" y1="48" x2="50" y2="76" stroke="url(#synapseGrad2)" />
        <line x1="32" y1="72" x2="50" y2="76" stroke="url(#synapseGrad1)" />
        <line x1="68" y1="72" x2="50" y2="76" stroke="url(#synapseGrad2)" />
        {/* Conexões transversais */}
        <line
          x1="28"
          y1="32"
          x2="50"
          y2="48"
          stroke="#34D399"
          strokeOpacity="0.4"
          strokeDasharray="3 3"
        />
        <line
          x1="72"
          y1="32"
          x2="50"
          y2="48"
          stroke="#F59E0B"
          strokeOpacity="0.4"
          strokeDasharray="3 3"
        />
      </g>

      {/* Pulsos de energia nas sinapses */}
      <circle cx="39" cy="28" r="2" fill="#FDE047">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="61" cy="28" r="2" fill="#6EE7B7">
        <animate attributeName="opacity" values="1;0.2;1" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="36" r="2" fill="#38BDF8">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="62" r="2" fill="#FBBF24">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2.1s" repeatCount="indefinite" />
      </circle>

      {/* Nós da Rede Neural (pontos de conexão) */}
      <g>
        {/* Topo central */}
        <circle cx="50" cy="24" r="5" fill="#10B981" />
        <circle cx="50" cy="24" r="2" fill="#FFFFFF" />

        {/* Superior esquerdo / direito */}
        <circle cx="28" cy="32" r="4.5" fill="#059669" />
        <circle cx="28" cy="32" r="1.8" fill="#ECFDF5" />
        <circle cx="72" cy="32" r="4.5" fill="#F59E0B" />
        <circle cx="72" cy="32" r="1.8" fill="#FEF3C7" />

        {/* Centro (núcleo da inteligência) */}
        <circle cx="50" cy="48" r="6" fill="#10B981" />
        <circle cx="50" cy="48" r="2.8" fill="#FFFFFF" />

        {/* Meio esquerdo / direito */}
        <circle cx="36" cy="52" r="4.5" fill="#34D399" />
        <circle cx="36" cy="52" r="1.8" fill="#FFFFFF" />
        <circle cx="64" cy="52" r="4.5" fill="#FBBF24" />
        <circle cx="64" cy="52" r="1.8" fill="#FFFFFF" />

        {/* Base esquerda / centro / direita */}
        <circle cx="32" cy="72" r="4" fill="#059669" />
        <circle cx="32" cy="72" r="1.5" fill="#A7F3D0" />
        <circle cx="50" cy="76" r="5" fill="#F59E0B" />
        <circle cx="50" cy="76" r="2" fill="#FFFFFF" />
        <circle cx="68" cy="72" r="4" fill="#D97706" />
        <circle cx="68" cy="72" r="1.5" fill="#FDE68A" />
      </g>
    </svg>
  );
}

/**
 * Componente SVG do Cérebro EnergivIA (estado hover):
 * Ilustração detalhada dos hemisférios cerebrais com circuitos bio-elétricos solares.
 */
function EnergiviaBrainIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="brainCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#10B981" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="circuitGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="circuitGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Brilho de fundo do Cérebro */}
      <circle cx="50" cy="50" r="38" fill="url(#brainCoreGlow)" opacity="0.6" />

      {/* Contornos dos Hemisférios Cerebrais (Esquerdo: Esmeralda / Direito: Ouro Solar) */}
      <g strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Hemisfério Esquerdo */}
        <path
          d="M48 20 C38 18 26 24 24 35 C22 43 25 48 23 54 C21 62 25 72 35 77 C41 80 47 78 48 76"
          stroke="url(#circuitGradLeft)"
          fill="none"
        />
        {/* Circunvoluções internas esquerda */}
        <path
          d="M48 30 C40 30 34 35 34 42 C34 49 42 50 48 50"
          stroke="url(#circuitGradLeft)"
          fill="none"
          strokeWidth="2"
          opacity="0.9"
        />
        <path
          d="M32 44 C27 46 27 54 32 58 C37 62 43 60 48 64"
          stroke="url(#circuitGradLeft)"
          fill="none"
          strokeWidth="2"
          opacity="0.85"
        />

        {/* Hemisfério Direito */}
        <path
          d="M52 20 C62 18 74 24 76 35 C78 43 75 48 77 54 C79 62 75 72 65 77 C59 80 53 78 52 76"
          stroke="url(#circuitGradRight)"
          fill="none"
        />
        {/* Circunvoluções internas direita */}
        <path
          d="M52 30 C60 30 66 35 66 42 C66 49 58 50 52 50"
          stroke="url(#circuitGradRight)"
          fill="none"
          strokeWidth="2"
          opacity="0.9"
        />
        <path
          d="M68 44 C73 46 73 54 68 58 C63 62 57 60 52 64"
          stroke="url(#circuitGradRight)"
          fill="none"
          strokeWidth="2"
          opacity="0.85"
        />
      </g>

      {/* Fissura Central / Conexões do Corpo Caloso */}
      <g strokeWidth="2" strokeLinecap="round">
        <line x1="48" y1="26" x2="52" y2="26" stroke="#FFFFFF" strokeOpacity="0.8" />
        <line x1="47" y1="38" x2="53" y2="38" stroke="#FDE047" strokeOpacity="0.9" />
        <line x1="46" y1="50" x2="54" y2="50" stroke="#34D399" strokeOpacity="0.9" />
        <line x1="47" y1="62" x2="53" y2="62" stroke="#FFFFFF" strokeOpacity="0.8" />
        <line x1="48" y1="72" x2="52" y2="72" stroke="#F59E0B" strokeOpacity="0.9" />
      </g>

      {/* Pontos Sinápticos Iluminados do Cérebro EnergivIA */}
      <g>
        <circle cx="28" cy="35" r="2.8" fill="#34D399" />
        <circle cx="28" cy="35" r="1.2" fill="#FFFFFF" />

        <circle cx="72" cy="35" r="2.8" fill="#FBBF24" />
        <circle cx="72" cy="35" r="1.2" fill="#FFFFFF" />

        <circle cx="50" cy="38" r="3.2" fill="#F59E0B" />
        <circle cx="50" cy="38" r="1.5" fill="#FFFFFF" />

        <circle cx="50" cy="50" r="3.5" fill="#10B981" />
        <circle cx="50" cy="50" r="1.6" fill="#FFFFFF" />

        <circle cx="34" cy="58" r="2.6" fill="#10B981" />
        <circle cx="66" cy="58" r="2.6" fill="#F59E0B" />

        <circle cx="50" cy="62" r="3" fill="#FDE047" />
        <circle cx="50" cy="62" r="1.3" fill="#FFFFFF" />
      </g>

      {/* Feixe / Centelha de Inteligência no topo */}
      <path d="M50 14 L50 19" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="13" r="2" fill="#FDE047" />
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
              <span className="px-3 py-1.5 rounded-full bg-neutral-900/90 text-amber-300 text-xs font-bold shadow-lg border border-amber-500/30 backdrop-blur-md opacity-90 group-hover:opacity-100 transition whitespace-nowrap">
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
              <span className="px-3 py-1.5 rounded-full bg-neutral-900/90 text-emerald-300 text-xs font-bold shadow-lg border border-emerald-500/30 backdrop-blur-md opacity-90 group-hover:opacity-100 transition whitespace-nowrap">
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

      {/* Botão Flutuante Principal ("Bolinha" com Rede Neural que vira Cérebro no Hover) */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Menu Inteligente EnergivIA"
        className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
          isExpanded
            ? "bg-neutral-900 border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-105"
            : "bg-gradient-to-br from-neutral-950 via-slate-900 to-neutral-950 border border-emerald-500/40 hover:border-amber-400/70 shadow-[0_4px_25px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_35px_rgba(245,158,11,0.4)] hover:scale-110 active:scale-95"
        }`}
      >
        {/* Halo / Anel luminoso pulsante quando fechado */}
        {!isExpanded && (
          <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping opacity-25 pointer-events-none" />
        )}

        {isExpanded ? (
          /* Quando expandido, exibe o ícone de fechar suave */
          <motion.div
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center text-emerald-400"
          >
            <X className="w-7 h-7" />
          </motion.div>
        ) : (
          /* Animação de transição: Rede Neural (padrão) -> Cérebro EnergivIA (hover) */
          <div className="relative w-10 h-10 flex items-center justify-center overflow-visible">
            <AnimatePresence mode="wait">
              {isHovered ? (
                /* Estado Hover: Cérebro da EnergivIA com brilho e sinapses ativas */
                <motion.div
                  key="brain-state"
                  initial={{ opacity: 0, scale: 0.82, rotate: -6 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.82, rotate: 6 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <EnergiviaBrainIcon className="w-10 h-10 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]" />
                </motion.div>
              ) : (
                /* Estado Normal: Rede Neural vetorial com nós interligados */
                <motion.div
                  key="neural-state"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <NeuralNetworkIcon className="w-10 h-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </button>
    </div>
  );
}
