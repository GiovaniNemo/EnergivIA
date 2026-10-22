"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
  Tv,
  Maximize2,
  Eye,
  Sun,
  Zap,
  Sparkles,
} from "lucide-react";

import { BartMascotVisual, BartExpression } from "@/components/video-simulator/BartMascotVisual";
import { WhatsappPhoneMockup } from "@/components/video-simulator/WhatsappPhoneMockup";
import { ProposalInteractivePreview } from "@/components/video-simulator/ProposalInteractivePreview";
import { useAudioFx } from "@/components/video-simulator/useAudioFx";

// Duração de cada marco em segundos
const TIMELINE_STEPS = [
  { step: 0, label: "1. Hook (Dor)", durationSec: 7, expression: "pensativo" as BartExpression },
  {
    step: 1,
    label: "2. Áudio (Gravando)",
    durationSec: 8,
    expression: "animado" as BartExpression,
  },
  { step: 2, label: "3. Transcrição", durationSec: 8, expression: "determinado" as BartExpression },
  {
    step: 3,
    label: "4. Dimensionamento",
    durationSec: 11,
    expression: "determinado" as BartExpression,
  },
  { step: 4, label: "5. Kit & Nome", durationSec: 8, expression: "feliz" as BartExpression },
  { step: 5, label: "6. Proposta Pronta", durationSec: 6, expression: "feliz" as BartExpression },
  { step: 6, label: "7. Proposta Web", durationSec: 5, expression: "alegre" as BartExpression },
  { step: 7, label: "8. CTA Final", durationSec: 4, expression: "piscando" as BartExpression },
];

export default function BartVideoSimulatorPage() {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [hideUi, setHideUi] = useState<boolean>(false);
  const [showProposalModal, setShowProposalModal] = useState<boolean>(false);

  const audioFx = useAudioFx(soundEnabled);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Gatilho de efeitos sonoros sincronizados a cada etapa
  const triggerAudioForStep = useCallback(
    (step: number) => {
      if (!soundEnabled) return;
      switch (step) {
        case 0:
          audioFx.playNotification();
          break;
        case 1:
          audioFx.playRecordStart();
          break;
        case 2:
          audioFx.playMessageSent();
          break;
        case 3:
          audioFx.playMessageReceived();
          break;
        case 4:
          audioFx.playKeyClick();
          break;
        case 5:
          audioFx.playSuccessChime();
          break;
        case 6:
          audioFx.playNotification();
          break;
        default:
          break;
      }
    },
    [audioFx, soundEnabled]
  );

  // Efeito de avanço da timeline quando em Play
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const currentStepConfig = TIMELINE_STEPS[currentStepIndex];
    const durationMs = (currentStepConfig.durationSec * 1000) / playbackSpeed;

    timerRef.current = setTimeout(() => {
      if (currentStepIndex < TIMELINE_STEPS.length - 1) {
        const nextStep = currentStepIndex + 1;
        setCurrentStepIndex(nextStep);
        triggerAudioForStep(nextStep);
      } else {
        setIsPlaying(false);
      }
    }, durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, playbackSpeed, triggerAudioForStep]);

  const handleStepClick = (index: number) => {
    setCurrentStepIndex(index);
    triggerAudioForStep(index);
    if (index >= 6) {
      setShowProposalModal(true);
    } else {
      setShowProposalModal(false);
    }
  };

  const handleTogglePlay = () => {
    if (!isPlaying && currentStepIndex === TIMELINE_STEPS.length - 1) {
      setCurrentStepIndex(0);
      triggerAudioForStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setShowProposalModal(false);
    triggerAudioForStep(0);
  };

  const currentExpression = TIMELINE_STEPS[currentStepIndex]?.expression || "feliz";

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-900 select-none overflow-x-hidden font-plus-jakarta dark:bg-[#0B1120] dark:text-white transition-colors duration-300">
      {/* Luz Suave Arquitetônica Difusa de Estúdio (Sem Neon) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,38,80,0.06),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,209,255,0.04),transparent_70%)]" />

      {/* HEADER DO ESTÚDIO DE GRAVAÇÃO (Ocultável com modo Clean) */}
      <AnimatePresence>
        {!hideUi && (
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-50 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 shadow-xs"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between">
              {/* Identidade EnergivIA & BART */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E2650] text-white shadow-xs">
                  <Sun className="h-5 w-5 text-[#00D1FF]" />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold tracking-tight text-[#0E2650] dark:text-white flex items-center gap-1.5">
                    <span>EnergivIA BART</span>
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                      Player Gravador 60fps
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Demonstração de Proposta Solar no WhatsApp em &lt; 2 min
                  </p>
                </div>
              </div>

              {/* Controles do Estúdio */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Formato: 9:16 vs 16:9 */}
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setAspectRatio("16:9")}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      aspectRatio === "16:9"
                        ? "bg-white text-[#0E2650] shadow-xs dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    <Tv className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">16:9 Estúdio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio("9:16")}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      aspectRatio === "9:16"
                        ? "bg-white text-[#0E2650] shadow-xs dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">9:16 Mobile</span>
                  </button>
                </div>

                {/* Som Ativado / Mudo */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                    soundEnabled
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-800"
                  }`}
                  title={soundEnabled ? "Desativar Sons" : "Ativar Sons"}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>

                {/* Velocidade de Playback */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value={0.75}>0.75x (Lento)</option>
                  <option value={1}>1.0x (Normal)</option>
                  <option value={1.25}>1.25x (Rápido)</option>
                </select>

                {/* Modo Gravação Limpa (Oculta Header e Controles) */}
                <button
                  type="button"
                  onClick={() => setHideUi(true)}
                  className="flex items-center gap-1 rounded-xl bg-[#0E2650] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#14346b] transition-colors"
                  title="Ocultar interface para gravar a tela em alta resolução"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Gravação Limpa</span>
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Botão Flutuante de Restaurar UI quando em Modo Gravação Limpa */}
      {hideUi && (
        <button
          type="button"
          onClick={() => setHideUi(false)}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-[#0E2650] shadow-lg backdrop-blur-md hover:bg-white transition-all dark:border-slate-700 dark:bg-slate-900/90 dark:text-white"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Restaurar Painel</span>
        </button>
      )}

      {/* PALCO CENTRAL DE GRAVAÇÃO (STAGE) */}
      <main className="relative flex min-h-[calc(100vh-140px)] items-center justify-center p-4 sm:p-6 lg:p-8">
        {aspectRatio === "16:9" ? (
          /* MODO ESTÚDIO HORIZONTAL 16:9 */
          <div className="relative mx-auto flex w-full max-w-6xl items-center justify-center gap-8 lg:gap-14">
            {/* LADO ESQUERDO: BART MASCOTE 3D OFICIAL */}
            <div className="hidden md:flex flex-col items-center justify-center w-[300px] shrink-0">
              <div className="mb-4 text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0E2650]/5 px-3 py-1 text-[11px] font-bold text-[#0E2650] dark:bg-white/10 dark:text-cyan-400">
                  <Sparkles className="h-3.5 w-3.5 text-[#00D1FF]" />
                  Assistente de IA Oficial
                </span>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Expressão: <strong className="uppercase">{currentExpression}</strong>
                </p>
              </div>

              <BartMascotVisual
                expression={currentExpression}
                isProcessing={currentStepIndex === 1 || currentStepIndex === 3}
                showTelemetry={true}
                hsp="5.12"
                kwp="7.42"
              />
            </div>

            {/* CENTRO: MOCKUP SMARTPHONE WHATSAPP */}
            <div className="shrink-0">
              <WhatsappPhoneMockup
                currentStep={currentStepIndex}
                onOpenProposalPreview={() => setShowProposalModal(true)}
              />
            </div>

            {/* LADO DIREITO: PREVIEW DA PROPOSTA WEB OU PACKSHOT */}
            <div className="hidden lg:flex flex-col items-center justify-center w-[340px] shrink-0">
              <AnimatePresence mode="wait">
                {currentStepIndex >= 5 || showProposalModal ? (
                  <motion.div
                    key="proposal"
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="w-full"
                  >
                    <div className="mb-3 text-center">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        Visualização do Cliente Final 🔗
                      </span>
                    </div>
                    <ProposalInteractivePreview
                      clientName="Dr. Marcos Rocha"
                      kwp={7.42}
                      totalInvestmentBrl={26800}
                      showOpenAlert={currentStepIndex >= 6}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E2650]/5 text-[#0E2650] dark:bg-slate-800 dark:text-white">
                      <Zap className="h-6 w-6 text-[#00D1FF]" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                      Aguardando Proposta
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                      O BART gerará a proposta web editorial assim que o kit for selecionado no
                      chat.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* MODO VERTICAL 9:16 (FOCADO EM MOBILE/REELS) */
          <div className="relative flex flex-col items-center justify-center">
            {/* BART em miniatura no topo */}
            <div className="mb-2 scale-75 origin-bottom">
              <BartMascotVisual
                expression={currentExpression}
                isProcessing={currentStepIndex === 1 || currentStepIndex === 3}
                showTelemetry={false}
              />
            </div>

            <WhatsappPhoneMockup
              currentStep={currentStepIndex}
              onOpenProposalPreview={() => setShowProposalModal(true)}
            />

            {/* Modal flutuante se abrir proposta no mobile */}
            <AnimatePresence>
              {showProposalModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
                  onClick={() => setShowProposalModal(false)}
                >
                  <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
                    <ProposalInteractivePreview
                      clientName="Dr. Marcos Rocha"
                      kwp={7.42}
                      totalInvestmentBrl={26800}
                      showOpenAlert={true}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* BARRA DE TRANSPORTE E TIMELINE DO VÍDEO (Fixa na base) */}
      <AnimatePresence>
        {!hideUi && (
          <motion.footer
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-md shadow-lg dark:border-slate-800 dark:bg-slate-900/95"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-2.5">
              {/* Botões dos 8 Passos da Cena */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {TIMELINE_STEPS.map((stepItem, idx) => (
                  <button
                    key={stepItem.step}
                    type="button"
                    onClick={() => handleStepClick(idx)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      currentStepIndex === idx
                        ? "bg-[#0E2650] text-white shadow-xs dark:bg-[#00D1FF] dark:text-slate-950"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <span>{stepItem.label}</span>
                  </button>
                ))}
              </div>

              {/* Linha de Transporte (Play/Pause/Reset + Barra de Progresso) */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E2650] text-white shadow-md hover:bg-[#14346b] transition-all"
                    title={isPlaying ? "Pausar" : "Reproduzir Vídeo"}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 fill-white ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    title="Reiniciar Vídeo"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>

                {/* Informações da Cena Atual */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Cena {currentStepIndex + 1} de {TIMELINE_STEPS.length}:{" "}
                    <span className="text-[#0E2650] dark:text-[#00D1FF]">
                      {TIMELINE_STEPS[currentStepIndex]?.label}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {currentStepIndex === 0 && "Cliente com urgência pede orçamento pelo WhatsApp."}
                    {currentStepIndex === 1 && "Integrador aciona gravação de áudio de 5 segundos."}
                    {currentStepIndex === 2 &&
                      "Áudio é enviado e transcrito na conversa instantaneamente."}
                    {currentStepIndex === 3 &&
                      "BART calcula radiação HSP, dimensiona 7.42 kWp e kits em 3s."}
                    {currentStepIndex === 4 &&
                      "Integrador responde 1 e informa o nome do cliente final."}
                    {currentStepIndex === 5 &&
                      "BART gera proposta e monta texto pronto de encaminhamento."}
                    {currentStepIndex === 6 &&
                      "Cliente abre a proposta web e integrador recebe alerta em tempo real!"}
                    {currentStepIndex === 7 &&
                      "Chamada final: Teste 3 propostas gratuitas no WhatsApp."}
                  </p>
                </div>

                {/* Status de Duração */}
                <div className="hidden sm:block text-right">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    00:{String(currentStepIndex * 7).padStart(2, "0")} / 00:55
                  </span>
                  <p className="text-[10px] text-slate-400">Tempo de Proposta &lt; 2 min</p>
                </div>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
