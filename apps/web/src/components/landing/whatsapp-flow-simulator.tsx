"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  ExternalLink,
  FileText,
  MoreVertical,
  Mouse,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Send,
  Video,
  Zap,
} from "lucide-react";

interface Milestone {
  id: number;
  title: string;
  tag: string;
  description: string;
  stepStartIndex: number;
  stepEndIndex: number;
}

const MILESTONES: Milestone[] = [
  {
    id: 0,
    title: "Início & Menu Interativo",
    tag: "Passo 1",
    description: "O cliente manda 'Boa tarde' e o bot apresenta o menu com opções comerciais.",
    stepStartIndex: 0,
    stepEndIndex: 3,
  },
  {
    id: 1,
    title: "Leitura da Fatura & Estrutura",
    tag: "Passo 2",
    description:
      "Envio do PDF da fatura, extração automática com IA (257 kWh/mês em Maringá/PR) e escolha do telhado.",
    stepStartIndex: 4,
    stepEndIndex: 6,
  },
  {
    id: 2,
    title: "Dimensionamento & Kits",
    tag: "Passo 3",
    description:
      "Cálculo da potência (3,15 kWp), taxa padrão e cotação dos kits Standard, Elite e Premium.",
    stepStartIndex: 7,
    stepEndIndex: 10,
  },
  {
    id: 3,
    title: "Dados do Cliente no CRM",
    tag: "Passo 4",
    description:
      "Registro de Marcelo Santana, WhatsApp com DDD e seleção do modelo de proposta executivo.",
    stepStartIndex: 11,
    stepEndIndex: 16,
  },
  {
    id: 4,
    title: "Proposta Pronta com Link",
    tag: "Passo 5",
    description:
      "Geração instantânea da proposta oficial com link interativo e registro automático no CRM.",
    stepStartIndex: 17,
    stepEndIndex: 17,
  },
];

interface ChatMessage {
  id: string;
  type: "user" | "user_doc" | "bot";
  text?: string;
  title?: string;
  subtitle?: string;
  kind?:
    | "welcome"
    | "ask_bill"
    | "ocr_result"
    | "tax_rate"
    | "kit_distribuidor"
    | "ask_name"
    | "ask_phone"
    | "ask_template"
    | "final_proposal";
  time: string;
}

interface StepConfig {
  milestoneId: number;
  message: ChatMessage;
  userDraft?: string;
  draftDurationMs?: number;
  botTypingLabel?: string;
  botTypingDurationMs?: number;
  readPauseMs: number;
}

// Pacing calibrated for natural, comfortable human reading
const FLOW_STEPS: StepConfig[] = [
  // Passo 1: Início & Menu Interativo
  {
    milestoneId: 0,
    userDraft: "Boa tarde",
    draftDurationMs: 650,
    message: { id: "m1", type: "user", text: "Boa tarde", time: "09:41" },
    readPauseMs: 1200,
  },
  {
    milestoneId: 0,
    botTypingLabel: "EnergivIA está digitando...",
    botTypingDurationMs: 1500,
    message: { id: "m2", type: "bot", kind: "welcome", time: "09:41" },
    readPauseMs: 4600,
  },
  {
    milestoneId: 0,
    userDraft: "1",
    draftDurationMs: 450,
    message: { id: "m3", type: "user", text: "1", time: "09:41" },
    readPauseMs: 1000,
  },
  {
    milestoneId: 0,
    botTypingLabel: "EnergivIA está digitando...",
    botTypingDurationMs: 1200,
    message: { id: "m4", type: "bot", kind: "ask_bill", time: "09:41" },
    readPauseMs: 3200,
  },

  // Passo 2: Leitura da Fatura & Estrutura
  {
    milestoneId: 1,
    message: {
      id: "m5",
      type: "user_doc",
      title: "Fatura_de_Energia.pdf",
      subtitle: "1 página • 480 kB • PDF",
      time: "09:42",
    },
    readPauseMs: 1400,
  },
  {
    milestoneId: 1,
    botTypingLabel: "EnergivIA analisando fatura com IA...",
    botTypingDurationMs: 2400,
    message: { id: "m6", type: "bot", kind: "ocr_result", time: "09:42" },
    readPauseMs: 5200,
  },
  {
    milestoneId: 1,
    userDraft: "1",
    draftDurationMs: 450,
    message: { id: "m7", type: "user", text: "1", time: "09:42" },
    readPauseMs: 1000,
  },

  // Passo 3: Dimensionamento & Kits Solares
  {
    milestoneId: 2,
    botTypingLabel: "EnergivIA calculando dimensionamento...",
    botTypingDurationMs: 1800,
    message: { id: "m8", type: "bot", kind: "tax_rate", time: "09:42" },
    readPauseMs: 4600,
  },
  {
    milestoneId: 2,
    userDraft: "1",
    draftDurationMs: 450,
    message: { id: "m9", type: "user", text: "1", time: "09:43" },
    readPauseMs: 1000,
  },
  {
    milestoneId: 2,
    botTypingLabel: "EnergivIA cotando kits em distribuidores...",
    botTypingDurationMs: 2400,
    message: { id: "m10", type: "bot", kind: "kit_distribuidor", time: "09:43" },
    readPauseMs: 6500,
  },
  {
    milestoneId: 2,
    userDraft: "1",
    draftDurationMs: 450,
    message: { id: "m11", type: "user", text: "1", time: "09:43" },
    readPauseMs: 1000,
  },

  // Passo 4: Dados do Cliente no CRM
  {
    milestoneId: 3,
    botTypingLabel: "EnergivIA está digitando...",
    botTypingDurationMs: 1200,
    message: { id: "m12", type: "bot", kind: "ask_name", time: "09:43" },
    readPauseMs: 2600,
  },
  {
    milestoneId: 3,
    userDraft: "Marcelo Santana",
    draftDurationMs: 800,
    message: { id: "m13", type: "user", text: "Marcelo Santana", time: "09:43" },
    readPauseMs: 1100,
  },
  {
    milestoneId: 3,
    botTypingLabel: "EnergivIA está digitando...",
    botTypingDurationMs: 1200,
    message: { id: "m14", type: "bot", kind: "ask_phone", time: "09:44" },
    readPauseMs: 2600,
  },
  {
    milestoneId: 3,
    userDraft: "(44) 99888-0000",
    draftDurationMs: 850,
    message: { id: "m15", type: "user", text: "(44) 99888-0000", time: "09:44" },
    readPauseMs: 1200,
  },
  {
    milestoneId: 3,
    botTypingLabel: "EnergivIA está digitando...",
    botTypingDurationMs: 1200,
    message: { id: "m16", type: "bot", kind: "ask_template", time: "09:44" },
    readPauseMs: 3800,
  },
  {
    milestoneId: 3,
    userDraft: "1",
    draftDurationMs: 450,
    message: { id: "m17", type: "user", text: "1", time: "09:44" },
    readPauseMs: 1000,
  },

  // Passo 5: Proposta Pronta com Link
  {
    milestoneId: 4,
    botTypingLabel: "EnergivIA gerando proposta oficial...",
    botTypingDurationMs: 2600,
    message: { id: "m18", type: "bot", kind: "final_proposal", time: "09:45" },
    readPauseMs: 8500,
  },
];

export function WhatsappFlowSimulator(): JSX.Element {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);

  const [activeInputDraft, setActiveInputDraft] = useState<string>("");
  const [activeBotTyping, setActiveBotTyping] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef<boolean>(false);

  // Visible messages up to current step
  const visibleMessages = useMemo(() => {
    return FLOW_STEPS.slice(0, stepIndex + 1).map((s) => s.message);
  }, [stepIndex]);

  // Current milestone
  const activeMilestoneIndex = useMemo(() => {
    return FLOW_STEPS[stepIndex]?.milestoneId ?? 0;
  }, [stepIndex]);

  // Milestone Progresses (0 to 100)
  const milestoneProgresses = useMemo(() => {
    return MILESTONES.map((m) => {
      if (stepIndex > m.stepEndIndex) return 100;
      if (stepIndex < m.stepStartIndex) return 0;
      const count = m.stepEndIndex - m.stepStartIndex + 1;
      const progressInM = stepIndex - m.stepStartIndex + 1;
      return Math.round((progressInM / count) * 100);
    });
  }, [stepIndex]);

  // Smooth scroll into view when messages change (defensive against environments without Element.scrollTo)
  const scrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    if (typeof el.scrollTo === "function") {
      try {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth",
        });
        return;
      } catch {
        // Fallback para navegadores antigos que aceitam apenas scrollTo(x, y)
        try {
          el.scrollTo(0, el.scrollHeight);
          return;
        } catch {
          // Continua para os próximos fallbacks
        }
      }
    }

    if (scrollAnchorRef.current && typeof scrollAnchorRef.current.scrollIntoView === "function") {
      try {
        scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" });
        return;
      } catch {
        // Continua para o fallback de scrollTop
      }
    }

    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 70);
    return () => clearTimeout(timer);
  }, [visibleMessages.length, activeBotTyping, scrollToBottom]);

  // Execution engine: Drives the flow with natural human reading pauses
  useEffect(() => {
    if (!isPlaying) return;

    let isCancelled = false;
    const currentStep = FLOW_STEPS[stepIndex];
    if (!currentStep) return;

    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const runStep = async () => {
      // 1. If step has user draft, simulate user typing in input field
      if (currentStep.userDraft) {
        const text = currentStep.userDraft;
        const totalDuration = (currentStep.draftDurationMs || 600) / speed;
        const charInterval = Math.max(40, totalDuration / text.length);

        for (let i = 1; i <= text.length; i++) {
          await new Promise<void>((resolve) => {
            const id = setTimeout(() => {
              if (!isCancelled) {
                setActiveInputDraft(text.slice(0, i));
              }
              resolve();
            }, charInterval);
            timeoutIds.push(id);
          });
          if (isCancelled) return;
        }

        // Slight natural pause before pressing send
        await new Promise<void>((resolve) => {
          const id = setTimeout(() => {
            if (!isCancelled) {
              setActiveInputDraft("");
            }
            resolve();
          }, 250 / speed);
          timeoutIds.push(id);
        });
        if (isCancelled) return;
      }

      // 2. Wait for generous reading pause of the current message
      const pauseDuration = currentStep.readPauseMs / speed;

      await new Promise<void>((resolve) => {
        const id = setTimeout(resolve, pauseDuration);
        timeoutIds.push(id);
      });
      if (isCancelled) return;

      // 3. Move to next step or loop back to start
      const nextIndex = stepIndex + 1;
      if (nextIndex >= FLOW_STEPS.length) {
        setActiveInputDraft("");
        setActiveBotTyping(null);
        setStepIndex(0);
        return;
      }

      const nextStep = FLOW_STEPS[nextIndex];

      // 4. If next step has bot typing, display typing indicator before revealing message
      if (nextStep.botTypingLabel) {
        setActiveBotTyping(nextStep.botTypingLabel);
        const typingDuration = (nextStep.botTypingDurationMs || 1500) / speed;

        await new Promise<void>((resolve) => {
          const id = setTimeout(() => {
            if (!isCancelled) {
              setActiveBotTyping(null);
              setStepIndex(nextIndex);
            }
            resolve();
          }, typingDuration);
          timeoutIds.push(id);
        });
      } else {
        setStepIndex(nextIndex);
      }
    };

    runStep();

    return () => {
      isCancelled = true;
      timeoutIds.forEach(clearTimeout);
    };
  }, [stepIndex, isPlaying, speed]);

  // Scrubbing via mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) > 15 && !isTransitioningRef.current) {
      isTransitioningRef.current = true;
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 250);

      if (e.deltaY > 0) {
        setStepIndex((prev) => Math.min(FLOW_STEPS.length - 1, prev + 1));
      } else {
        setStepIndex((prev) => Math.max(0, prev - 1));
      }
      setActiveInputDraft("");
      setActiveBotTyping(null);
    }
  };

  const handleSelectMilestone = (idx: number) => {
    const targetMilestone = MILESTONES[idx];
    if (targetMilestone) {
      setActiveInputDraft("");
      setActiveBotTyping(null);
      setStepIndex(targetMilestone.stepStartIndex);
      setIsPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setActiveInputDraft("");
    setActiveBotTyping(null);
    setStepIndex(0);
    setIsPlaying(true);
  };

  return (
    <div
      onWheel={handleWheel}
      className="relative flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 py-6 select-none"
    >
      {/* ------------------------------------------------------------- */}
      {/* ELEGANT PHOTOREALISTIC IPHONE WITH AUTHENTIC WHATSAPP DESIGN  */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex flex-col items-center w-full max-w-[360px] sm:max-w-[380px] shrink-0">
        {/* PHYSICAL PHONE SHELL CONTAINER */}
        <div className="relative group w-full aspect-[350/708] shrink-0 select-none">
          {/* Soft, Diffused Realistic Shadow casting below the iPhone */}
          <div className="pointer-events-none absolute inset-x-5 bottom-2 top-8 rounded-[48px] shadow-[0_28px_60px_-15px_rgba(0,0,0,0.85),0_12px_28px_-8px_rgba(0,0,0,0.6)]" />

          {/* SCREEN LAYER: AUTHENTIC WHATSAPP iOS DOODLE WALLPAPER */}
          <div
            className="absolute inset-y-[2.4%] left-[5.43%] right-[6.0%] rounded-[36px] overflow-hidden flex flex-col z-10 font-sans shadow-inner select-none"
            style={{
              backgroundColor: "#efeae2",
              backgroundImage: "url('/landing/whatsapp-bg.svg')",
              backgroundRepeat: "repeat",
              backgroundSize: "360px 600px",
            }}
          >
            {/* iOS Status Bar */}
            <div className="relative z-20 flex items-center justify-between bg-[#f6f6f6]/95 backdrop-blur-sm px-5 pt-2.5 pb-1 text-[13px] text-black font-semibold select-none">
              {/* Left of notch: Time */}
              <span className="tracking-tight pl-0.5">9:41</span>

              {/* Center: Notch spacing placeholder (notch is on overlay mockup at z-30) */}
              <div className="w-28 h-4 pointer-events-none" />

              {/* Right of notch: Cellular Signal, Wifi, Battery */}
              <div className="flex items-center gap-1.5 text-black pr-0.5">
                <div className="flex items-end gap-[1.5px] h-2.5">
                  <span className="w-[2px] h-1 bg-black rounded-[0.5px]" />
                  <span className="w-[2px] h-1.5 bg-black rounded-[0.5px]" />
                  <span className="w-[2px] h-2 bg-black rounded-[0.5px]" />
                  <span className="w-[2px] h-2.5 bg-black rounded-[0.5px]" />
                </div>
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9.47 2.02-12.73 5.27l1.41 1.41C3.32 6.94 7.42 5.08 12 5.08s8.68 1.86 11.32 4.6l1.41-1.41C21.47 5.02 16.97 3 12 3zm0 4.17c-3.82 0-7.28 1.55-9.79 4.06l1.41 1.41C5.83 10.43 8.73 9.25 12 9.25s6.17 1.18 8.38 3.39l1.41-1.41C19.28 8.72 15.82 7.17 12 7.17zm0 4.16c-2.67 0-5.09 1.08-6.85 2.84l1.41 1.41C7.8 14.34 9.77 13.5 12 13.5s4.2 0.84 5.44 2.08l1.41-1.41C17.09 12.41 14.67 11.33 12 11.33zm0 4.17c-1.52 0-2.9.62-3.9 1.62L12 21.04l3.9-3.92c-1-1-2.38-1.62-3.9-1.62z" />
                </svg>
                <div className="h-2.5 w-5 rounded-[3px] border border-black p-[1px] flex items-center">
                  <div className="h-full w-4/5 rounded-[1.5px] bg-black" />
                </div>
              </div>
            </div>

            {/* WhatsApp iOS Header (matching reference image) */}
            <div className="relative z-20 flex items-center justify-between border-b border-[#e5e5ea] bg-[#f6f6f6]/95 backdrop-blur-sm px-3.5 py-2 shadow-xs">
              <div className="flex items-center gap-2">
                <ArrowLeft className="h-5 w-5 text-[#007aff] hover:opacity-75 transition cursor-pointer" />
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#070b14] ring-1 ring-slate-200 overflow-hidden shadow-xs">
                    <span className="text-emerald-400 font-bold text-xs">⚡</span>
                  </div>
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#25d366]" />
                </div>
                <div className="leading-tight">
                  <span className="text-[15.5px] font-semibold text-black block tracking-tight">
                    EnergivIA
                  </span>
                  <p className="text-[11px] text-[#8696a0] font-normal">online agora</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[#007aff] pr-1">
                <Video className="h-5 w-5 cursor-pointer hover:opacity-75 transition" />
                <Phone className="h-4.5 w-4.5 cursor-pointer hover:opacity-75 transition" />
                <MoreVertical className="h-4 w-4 text-[#8696a0] cursor-pointer hover:opacity-75 transition" />
              </div>
            </div>

            {/* Chat Messages Flow with authentic WhatsApp doodle background & exact bubble colors */}
            <div
              ref={chatContainerRef}
              className="relative flex-1 space-y-2.5 overflow-y-auto p-3 text-sm scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {/* Date Pill */}
              <div className="flex justify-center my-0.5">
                <span className="rounded-lg bg-[#ffffff]/90 backdrop-blur-xs px-2.5 py-0.5 text-[11px] text-[#8696a0] font-medium shadow-2xs border border-black/[0.04]">
                  Hoje
                </span>
              </div>

              {/* RENDER DYNAMIC MESSAGES WITH FRAMER MOTION SPRINGS */}
              <AnimatePresence initial={false}>
                {visibleMessages.map((msg) => {
                  if (msg.type === "user") {
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 16, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 26,
                        }}
                        className="flex justify-end"
                      >
                        {/* OUTGOING GREEN BUBBLE (#dcf8c6 - exact color from reference) */}
                        <div className="relative max-w-[85%] rounded-[16px] rounded-tr-[4px] bg-[#dcf8c6] px-3.5 py-2 text-black shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
                          <p className="text-[15px] leading-[21px] font-normal text-black pr-14">
                            {msg.text}
                          </p>
                          <div className="absolute bottom-1.5 right-2.5 flex items-center gap-1 text-[11px] text-[#8696a0] font-normal">
                            <span>{msg.time}</span>
                            <CheckCheck className="h-3.5 w-3.5 text-[#34b7f1]" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  if (msg.type === "user_doc") {
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 16, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 26,
                        }}
                        className="flex justify-end"
                      >
                        <div className="relative max-w-[88%] rounded-[16px] rounded-tr-[4px] bg-[#dcf8c6] p-2.5 text-black shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
                          <div className="flex items-center gap-2.5 rounded-xl bg-white/90 p-2.5 border border-[#dcf8c6] shadow-2xs">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-bold border border-rose-200">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-black text-[14px]">
                                {msg.title}
                              </p>
                              <p className="text-[11.5px] text-[#8696a0] font-normal mt-0.5">
                                {msg.subtitle}
                              </p>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#8696a0] font-normal pr-1">
                            <span>{msg.time}</span>
                            <CheckCheck className="h-3.5 w-3.5 text-[#34b7f1]" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  // INCOMING WHITE BUBBLE (#ffffff - exact from reference)
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 18, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                      className="flex justify-start"
                    >
                      <div className="relative max-w-[92%] rounded-[16px] rounded-tl-[4px] bg-white p-3.5 text-black shadow-[0_1px_1px_rgba(0,0,0,0.08)] space-y-2">
                        {msg.kind === "welcome" && (
                          <div className="text-[14.5px] leading-[20px] space-y-2 text-black font-normal">
                            <p>
                              Olá Giovani! Tudo bem?
                              <br />
                              Sou seu assistente de vendas e dimensionamento da{" "}
                              <b>EnergivIA Solar</b>.
                            </p>
                            <p className="font-semibold text-black">
                              Como posso ajudar você a gerar orçamentos hoje?
                            </p>
                            <div className="space-y-1.5 rounded-xl bg-[#f8f9fa] p-2.5 border border-slate-200/80 text-[13px] text-black">
                              <p className="border-l-2 border-emerald-500 pl-2">
                                <span className="font-bold text-slate-800">[1]</span>{" "}
                                <b>Enviar fatura de energia</b> (PDF ou foto)
                              </p>
                              <p className="border-l-2 border-slate-300 pl-2 text-slate-600">
                                <span className="font-bold text-slate-700">[2]</span> Simular por
                                consumo mensal (ex: 450 kWh)
                              </p>
                              <p className="border-l-2 border-slate-300 pl-2 text-slate-600">
                                <span className="font-bold text-slate-700">[3]</span> Simular por
                                potência de pico (ex: 5 kWp)
                              </p>
                              <p className="border-l-2 border-slate-300 pl-2 text-slate-600">
                                <span className="font-bold text-slate-700">[4]</span> Simular por
                                quantidade de placas (ex: 10 módulos)
                              </p>
                              <p className="border-l-2 border-slate-300 pl-2 text-slate-600">
                                <span className="font-bold text-slate-700">[5]</span> Dúvidas sobre
                                equipamentos e preços de catálogo
                              </p>
                            </div>
                            <p className="text-[11.5px] text-[#8696a0] italic">
                              (Responda com o número da opção ou envie a conta de luz diretamente)
                            </p>
                            <p className="text-[12px] font-semibold text-slate-700">
                              Equipe <i>EnergivIA Solar</i>
                            </p>
                          </div>
                        )}

                        {msg.kind === "ask_bill" && (
                          <div className="text-[14.5px] leading-[20px] space-y-1.5 text-black font-normal">
                            <p className="font-bold text-black">Envio de Fatura de Energia</p>
                            <p>
                              Envie o arquivo em <b>PDF</b> ou a <b>foto da conta de luz</b> do seu
                              cliente por aqui mesmo.
                            </p>
                            <div className="rounded-lg bg-emerald-50/70 border-l-2 border-emerald-500 p-2 text-[12.5px] text-emerald-900 leading-snug">
                              Nossa inteligência artificial vai extrair automaticamente todos os
                              dados de consumo, histórico e padrão de rede!
                            </div>
                          </div>
                        )}

                        {msg.kind === "ocr_result" && (
                          <div className="text-[14.5px] leading-[20px] space-y-2 text-black font-normal">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-black">Fatura Analisada com Precisão!</p>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                IA Concluída
                              </span>
                            </div>
                            <div className="space-y-1 rounded-xl bg-[#f8f9fa] p-2.5 border border-slate-200/80 text-[13px]">
                              <p className="flex justify-between">
                                <span className="text-slate-600">Consumo Médio:</span>
                                <span className="font-semibold text-black">257 kWh/mês</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-600">Localização:</span>
                                <span className="font-semibold text-black">Maringá / PR</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-600">Histórico Fatura:</span>
                                <span className="font-medium text-slate-800">
                                  12 meses conferidos
                                </span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-600">Padrão de Rede:</span>
                                <span className="font-semibold text-black">Monofásico 220V</span>
                              </p>
                            </div>
                            <p className="text-[13.5px] font-semibold text-black">
                              Qual a estrutura do telhado?
                            </p>
                            <div className="space-y-1 rounded-xl bg-[#f8f9fa] p-2 border border-slate-200/80 text-[12.5px]">
                              <p className="font-semibold text-black bg-emerald-100/90 border border-emerald-400 rounded-md px-2 py-0.5">
                                [1] Cerâmica (Colonial) (Telhas convencionais)
                              </p>
                              <p className="px-2 py-0.5 text-slate-600">
                                [2] Fibrocimento (Em madeira)
                              </p>
                              <p className="px-2 py-0.5 text-slate-600">
                                [3] Metálico (Trapezoidal / Zipada)
                              </p>
                              <p className="px-2 py-0.5 text-slate-600">[4] Solo (Usina de solo)</p>
                              <p className="px-2 py-0.5 text-slate-600">
                                [5] Laje (Plana com triângulos)
                              </p>
                              <p className="px-2 py-0.5 text-slate-600">
                                [6] Fibrometal (Vigas metálicas)
                              </p>
                              <p className="px-2 py-0.5 text-slate-600">
                                [7] Sem estrutura (Apenas equipamentos)
                              </p>
                            </div>
                          </div>
                        )}

                        {msg.kind === "tax_rate" && (
                          <div className="text-[14.5px] leading-[20px] space-y-2 text-black font-normal">
                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                              <span className="text-[12px] font-semibold text-slate-600">
                                Estrutura Registrada:
                              </span>
                              <span className="text-[12px] font-bold text-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                Cerâmica (Colonial)
                              </span>
                            </div>

                            <p className="font-bold text-black text-[13.5px]">
                              Dimensionamento Solar Calculado (257 kWh/mês):
                            </p>
                            <div className="space-y-1 rounded-xl bg-[#f8f9fa] p-2.5 border border-slate-200/80 text-[13px]">
                              <p className="flex justify-between">
                                <span className="text-slate-600">Potência Estimada:</span>
                                <span className="font-bold text-black">3,15 kWp (5x 630W)</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-600">Geração Estimada:</span>
                                <span className="font-semibold text-black">268 kWh/mês</span>
                              </p>
                              <p className="flex justify-between border-t border-slate-200 pt-1">
                                <span className="text-slate-600">Sua taxa padrão:</span>
                                <span className="font-bold text-emerald-700">R$ 2.850,00/kWp</span>
                              </p>
                              <p className="flex justify-between text-[12px]">
                                <span className="text-slate-500">Valor aprox. venda:</span>
                                <span className="font-semibold text-slate-800">R$ 8.977,50</span>
                              </p>
                            </div>

                            <p className="text-[13px] font-semibold text-black">
                              Como você deseja prosseguir para esta cotação?
                            </p>
                            <div className="space-y-1 rounded-xl bg-[#f8f9fa] p-2 border border-slate-200/80 text-[12.5px]">
                              <p className="font-semibold text-black bg-emerald-100/90 border border-emerald-400 rounded-md px-2 py-0.5">
                                [1] Seguir com a taxa padrão (R$ 2.850,00/kWp)
                              </p>
                              <p className="px-2 py-0.5 text-slate-600">
                                [2] Informar outro valor por kWp
                              </p>
                              <p className="px-2 py-0.5 text-slate-500">
                                [0] Voltar / Alterar estrutura
                              </p>
                            </div>
                          </div>
                        )}

                        {msg.kind === "kit_distribuidor" && (
                          <div className="text-[14.5px] leading-[20px] space-y-2 text-black font-normal">
                            <p className="text-[13.5px] font-semibold text-black">
                              Melhores opções dimensionadas (257 kWh/mês):
                            </p>
                            <p className="text-[11.5px] text-[#8696a0]">
                              Taxa aplicada: R$ 2.850,00/kWp em Maringá/PR
                            </p>

                            {/* Opção 1: Standard (Mais Recomendado) */}
                            <div className="rounded-xl border border-emerald-400/90 bg-emerald-50/50 p-2.5 space-y-1 text-[13px]">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-black text-xs uppercase tracking-wide">
                                  Opção 1 — Standard (Mais Recomendado)
                                </span>
                                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                                  R$ 8.977,50
                                </span>
                              </div>
                              <p className="text-[11.5px] text-slate-600 font-medium">
                                Potência: 3,15 kWp | Geração: 268 kWh/mês
                              </p>
                              <p className="text-[11.5px] text-slate-800 leading-snug">
                                • 5x Módulo Solar 630W N-Type TopCon
                                <br />• 1x Inversor String 3kW Monofásico 220V
                                <br />• Estrutura Cerâmica Completa + Cabos e Conectores
                              </p>
                            </div>

                            {/* Opção 2: Elite */}
                            <div className="rounded-xl border border-slate-200 bg-[#f8f9fa] p-2 space-y-0.5 text-[12.5px]">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800 text-xs">
                                  Opção 2 — Elite
                                </span>
                                <span className="font-bold text-slate-900 text-xs">
                                  R$ 9.450,00
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                3,15 kWp • 275 kWh/mês • 5x 630W Bifacial + Microinversor Hoymiles
                              </p>
                            </div>

                            {/* Opção 3: Premium */}
                            <div className="rounded-xl border border-slate-200 bg-[#f8f9fa] p-2 space-y-0.5 text-[12.5px]">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800 text-xs">
                                  Opção 3 — Premium
                                </span>
                                <span className="font-bold text-slate-900 text-xs">
                                  R$ 10.200,00
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                3,40 kWp • 290 kWh/mês • 5x 680W N-Type + Inversor Híbrido Bateria
                              </p>
                            </div>

                            <p className="text-[13px] font-semibold text-black pt-1">
                              Qual opção você prefere para o seu cliente?
                            </p>
                            <div className="space-y-1 rounded-xl bg-[#f8f9fa] p-2 border border-slate-200/80 text-[12.5px]">
                              <p className="font-semibold text-black bg-emerald-100/90 border border-emerald-400 rounded-md px-2 py-0.5">
                                [1] Standard (Mais Recomendado)
                              </p>
                              <p className="px-2 py-0.5 text-slate-600">[2] Elite</p>
                              <p className="px-2 py-0.5 text-slate-600">[3] Premium</p>
                            </div>
                          </div>
                        )}

                        {msg.kind === "ask_name" && (
                          <div className="text-[14.5px] leading-[20px] space-y-1.5 text-black font-normal">
                            <p className="font-semibold text-emerald-800">
                              Ótima escolha! Kit selecionado com sucesso.
                            </p>
                            <p>
                              Qual o <b>nome do cliente final</b> para registrarmos no seu CRM?
                            </p>
                            <p className="text-[11.5px] text-[#8696a0] italic">
                              (ou digite 0 para voltar às opções de kits)
                            </p>
                          </div>
                        )}

                        {msg.kind === "ask_phone" && (
                          <div className="text-[14.5px] leading-[20px] space-y-1.5 text-black font-normal">
                            <p>
                              Certo, vou registrar o cliente <b>Marcelo Santana</b>.
                            </p>
                            <p>
                              E qual o <b>WhatsApp dele com DDD</b>?
                            </p>
                            <p className="text-[11.5px] text-[#8696a0] italic">
                              (ou digite 0 para voltar)
                            </p>
                          </div>
                        )}

                        {msg.kind === "ask_template" && (
                          <div className="text-[14.5px] leading-[20px] space-y-2 text-black font-normal">
                            <div className="rounded-lg bg-emerald-50 border-l-2 border-emerald-500 p-2 text-[12.5px] text-emerald-950 font-medium">
                              Cliente <b>Marcelo Santana</b> e WhatsApp <b>(44) 99888-0000</b>{" "}
                              registrados com sucesso!
                            </div>
                            <p className="text-[13.5px] font-semibold text-black">
                              Qual modelo de proposta comercial você deseja usar para o seu cliente?
                            </p>
                            <div className="space-y-1 rounded-xl bg-[#f8f9fa] p-2 border border-slate-200/80 text-[12.5px]">
                              <p className="font-semibold text-black bg-emerald-100/90 border border-emerald-400 rounded-md px-2 py-0.5">
                                [1] Modelo Premium Executivo
                              </p>
                              <p className="px-2 py-0.5 text-slate-600">
                                [2] Modelo Express Comercial
                              </p>
                              <p className="px-2 py-0.5 text-slate-600">
                                [3] Modelo Técnico Detalhado
                              </p>
                              <p className="px-2 py-0.5 text-slate-500">[0] Voltar / Rever dados</p>
                            </div>
                          </div>
                        )}

                        {msg.kind === "final_proposal" && (
                          <div className="text-[14.5px] leading-[20px] space-y-2.5 text-black font-normal">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-black text-[14px]">
                                Proposta Comercial Gerada com Sucesso!
                              </span>
                              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                                Pronta
                              </span>
                            </div>

                            {/* Summary specs from real bot text */}
                            <div className="space-y-1 rounded-xl bg-[#f8f9fa] p-2.5 border border-slate-200/80 text-[12.5px]">
                              <p className="flex justify-between">
                                <span className="text-slate-600">Cliente:</span>
                                <span className="font-semibold text-black">Marcelo Santana</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-600">Potência:</span>
                                <span className="font-bold text-black">3,15 kWp</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-600">Estrutura:</span>
                                <span className="font-medium text-slate-800">
                                  Cerâmica (Colonial)
                                </span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-600">Modelo:</span>
                                <span className="font-medium text-slate-800">
                                  Modelo Premium Executivo
                                </span>
                              </p>
                              <p className="flex justify-between border-t border-slate-200 pt-1 text-[13px]">
                                <span className="font-bold text-slate-800">Valor Total:</span>
                                <span className="font-extrabold text-emerald-700">R$ 8.977,50</span>
                              </p>
                            </div>

                            {/* Interactive Proposal Card in WhatsApp */}
                            <div className="rounded-xl border border-emerald-300 bg-white p-2.5 shadow-2xs space-y-2">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-semibold text-black text-[13.5px]">
                                    Proposta_Solar_Marcelo_Santana.pdf
                                  </p>
                                  <p className="text-[11.5px] text-[#8696a0] font-normal mt-0.5">
                                    3,15 kWp • Payback de 2,7 anos • Economia R$ 74.800
                                  </p>
                                </div>
                              </div>

                              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-[12px]">
                                <span className="font-mono text-emerald-700 text-[11px] truncate max-w-[150px]">
                                  energivia.com.br/p/8921a9f
                                </span>
                                <span className="flex items-center gap-1 font-semibold bg-emerald-600 text-white px-2.5 py-1 rounded-md text-[11.5px] shadow-xs cursor-pointer hover:bg-emerald-700 transition">
                                  Abrir Proposta <ExternalLink className="h-3 w-3" />
                                </span>
                              </div>
                            </div>

                            <p className="text-[11.5px] text-[#8696a0] leading-snug">
                              Ela também já está disponível no seu painel CRM da EnergivIA.
                            </p>
                            <p className="text-[12px] font-semibold text-slate-700">
                              Equipe <i>EnergivIA Solar</i>
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-end text-[11px] text-[#8696a0] font-normal pt-0.5">
                          <span>{msg.time}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* LIVE TYPING INDICATOR */}
              <AnimatePresence>
                {activeBotTyping && (
                  <motion.div
                    key="typing-pill"
                    initial={{ opacity: 0, y: 12, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.92 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 text-black text-xs py-1"
                  >
                    <div className="flex gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.08)] border border-black/[0.04]">
                      <span className="h-2 w-2 rounded-full bg-[#00a884] animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-[#00a884] animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-[#00a884] animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-[12px] text-[#8696a0] font-medium animate-pulse">
                      {activeBotTyping}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Invisible anchor for smooth scrolling */}
              <div ref={scrollAnchorRef} className="h-1 w-full" />
            </div>

            {/* WhatsApp iOS Input Bar (matching reference image) */}
            <div className="relative z-20 flex items-center gap-2 bg-[#f6f6f6] px-3 py-2 border-t border-[#e5e5ea] text-slate-400">
              <button type="button" className="text-[#007aff] hover:opacity-75 transition px-1">
                <span className="text-2xl font-light leading-none">+</span>
              </button>
              <div className="flex-1 min-h-[34px] flex items-center rounded-full bg-white px-3.5 py-1 text-[15px] text-black border border-[#e5e5ea] shadow-2xs">
                {activeInputDraft ? (
                  <span className="text-black font-normal flex items-center gap-0.5">
                    {activeInputDraft}
                    <span className="inline-block w-1.5 h-3.5 bg-[#00a884] animate-pulse" />
                  </span>
                ) : (
                  <span className="text-[#8696a0] font-normal">Mensagem</span>
                )}
              </div>
              <motion.div
                animate={
                  activeInputDraft ? { scale: [1, 1.15, 1], rotate: [0, 5, 0] } : { scale: 1 }
                }
                transition={{ duration: 0.3 }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-xs hover:bg-[#008069] transition"
              >
                {activeInputDraft ? (
                  <Send className="h-3.5 w-3.5 fill-white" />
                ) : (
                  <Zap className="h-3.5 w-3.5 fill-white" />
                )}
              </motion.div>
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="bg-[#f6f6f6] pb-1.5 pt-0.5 flex justify-center">
              <div className="w-28 h-1 bg-black/25 rounded-full" />
            </div>
          </div>

          {/* PHOTOREALISTIC IPHONE 13 OVERLAY FRAME (From the user's PNG) */}
          <img
            src="/landing/iphone-mockup.png"
            alt="iPhone 13 Mockup"
            className="pointer-events-none absolute inset-0 h-full w-full object-fill z-30 select-none drop-shadow-md"
            loading="eager"
          />
        </div>

        {/* Minimalist Floating Player Controls Below Phone */}
        <div className="mt-5 w-full flex items-center justify-between rounded-full border border-white/10 bg-[#070b14]/90 px-4 py-2 text-xs text-slate-300 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-100 hover:bg-white/10 hover:border-emerald-500/30 transition"
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current text-emerald-400" />
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-emerald-500/30 transition"
              title="Reiniciar do começo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-slate-400 font-mono">
              {isPlaying ? "Simulação ao vivo" : "Pausado (Scroll ativo)"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Velocidade:</span>
            {[1, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded-full px-2.5 py-0.5 font-medium transition ${
                  speed === s
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE CONTROLS & EXPLANATION PANEL                      */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full max-w-lg space-y-6 z-10">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-semibold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Conversa em Tempo Real
            </span>

            {/* Mouse Scroll Interactive Cue */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-3 py-1 text-xs font-mono text-emerald-400 shadow-sm">
              <Mouse className="h-3.5 w-3.5 animate-bounce text-emerald-400" />
              <span>Role o mouse para avançar</span>
            </div>
          </div>

          <h3 className="mt-4 text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Veja a troca de mensagens na prática
          </h3>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed font-light">
            Role o mouse para navegar no diálogo ou acompanhe em tempo real: o cliente chama, a IA
            extrai a fatura e entrega a proposta pronta em poucos segundos.
          </p>
        </div>

        {/* Clean Modern Progress Bars */}
        <div className="grid grid-cols-5 gap-2.5 pt-1">
          {MILESTONES.map((m, idx) => {
            const isCurrent = activeMilestoneIndex === idx;
            const pct = milestoneProgresses[idx];
            return (
              <div key={m.id} className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80 border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 will-change-[width] transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{
                      width: `${pct}%`,
                    }}
                  />
                </div>
                <p
                  className={`text-xs font-mono text-center truncate transition-colors duration-200 ${
                    isCurrent ? "text-emerald-400 font-bold" : "text-slate-500"
                  }`}
                >
                  {m.tag}
                </p>
              </div>
            );
          })}
        </div>

        {/* Clickable Step Cards (Sleek Glass Style with comfortable, legible text) */}
        <div className="space-y-3">
          {MILESTONES.map((m, idx) => {
            const isCurrent = activeMilestoneIndex === idx;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMilestone(idx)}
                className={`w-full text-left rounded-2xl border p-4 transition-all duration-300 ${
                  isCurrent
                    ? "border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-[#071914] to-[#070b14] shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-400/30"
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`text-sm sm:text-base font-semibold transition-colors ${
                        isCurrent ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {m.title}
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-xs font-mono text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Ao vivo
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs sm:text-sm text-slate-300/90 pl-10 leading-relaxed font-light">
                  {m.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
