"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  startTime: number;
  endTime: number;
}

const MILESTONES: Milestone[] = [
  {
    id: 0,
    title: "Início & Menu Interativo",
    tag: "Passo 1",
    description: "O cliente manda 'Boa tarde' e o bot apresenta as opções comerciais.",
    startTime: 0,
    endTime: 6000,
  },
  {
    id: 1,
    title: "Leitura da Fatura de Energia",
    tag: "Passo 2",
    description: "Envio do PDF da fatura e extração por IA do consumo (257 kWh/mês) e telhado.",
    startTime: 6000,
    endTime: 11800,
  },
  {
    id: 2,
    title: "Seleção do Kit Dynamis",
    tag: "Passo 3",
    description: "Cálculo da potência (3,15 kWp), preço do kit Dynamis e escolha do integrador.",
    startTime: 11800,
    endTime: 17800,
  },
  {
    id: 3,
    title: "Dados do Cliente no CRM",
    tag: "Passo 4",
    description: "Coleta do nome (Marcelo), WhatsApp fictício e template desejado.",
    startTime: 17800,
    endTime: 25200,
  },
  {
    id: 4,
    title: "Proposta Pronta com Link",
    tag: "Passo 5",
    description: "Entrega do link elegante da proposta pronto para enviar ao cliente.",
    startTime: 25200,
    endTime: 35000,
  },
];

const TOTAL_CYCLE_MS = 35000;

interface ScheduledMessage {
  id: string;
  showAt: number;
  type: "user" | "user_doc" | "bot";
  text?: string;
  title?: string;
  subtitle?: string;
  kind?:
    | "welcome"
    | "ask_bill"
    | "ocr_result"
    | "kit_dynamis"
    | "ask_name"
    | "ask_phone"
    | "ask_template"
    | "final_proposal";
  time: string;
}

const SCHEDULED_MESSAGES: ScheduledMessage[] = [
  // Passo 1
  { id: "m1", showAt: 600, type: "user", text: "Boa tarde", time: "09:41" },
  { id: "m2", showAt: 1700, type: "bot", kind: "welcome", time: "09:41" },
  { id: "m3", showAt: 3700, type: "user", text: "1", time: "09:42" },
  { id: "m4", showAt: 4700, type: "bot", kind: "ask_bill", time: "09:42" },

  // Passo 2
  {
    id: "m5",
    showAt: 6800,
    type: "user_doc",
    title: "Fatura_de_Energia.pdf",
    subtitle: "1 página • 480 kB • PDF",
    time: "09:42",
  },
  { id: "m6", showAt: 8400, type: "bot", kind: "ocr_result", time: "09:42" },
  { id: "m7", showAt: 10700, type: "user", text: "2", time: "09:42" },

  // Passo 3
  { id: "m8", showAt: 13200, type: "bot", kind: "kit_dynamis", time: "09:43" },
  { id: "m9", showAt: 15500, type: "user", text: "1", time: "09:43" },
  { id: "m10", showAt: 16500, type: "bot", kind: "ask_name", time: "09:43" },

  // Passo 4
  { id: "m11", showAt: 18400, type: "user", text: "Marcelo", time: "09:43" },
  { id: "m12", showAt: 19400, type: "bot", kind: "ask_phone", time: "09:43" },
  { id: "m13", showAt: 21600, type: "user", text: "(44) 99888-0000", time: "09:44" },
  { id: "m14", showAt: 22600, type: "bot", kind: "ask_template", time: "09:44" },
  { id: "m15", showAt: 24300, type: "user", text: "1", time: "09:44" },

  // Passo 5
  { id: "m16", showAt: 26800, type: "bot", kind: "final_proposal", time: "09:45" },
];

interface TypingSpan {
  start: number;
  end: number;
  label: string;
}

const BOT_TYPING_SPANS: TypingSpan[] = [
  { start: 600, end: 1700, label: "EnergivIA está digitando..." },
  { start: 3700, end: 4700, label: "EnergivIA está digitando..." },
  { start: 6800, end: 8400, label: "EnergivIA analisando fatura com IA..." },
  { start: 11800, end: 13200, label: "EnergivIA calculando melhor kit solar..." },
  { start: 15500, end: 16500, label: "EnergivIA está digitando..." },
  { start: 18400, end: 19400, label: "EnergivIA está digitando..." },
  { start: 21600, end: 22600, label: "EnergivIA está digitando..." },
  { start: 25200, end: 26800, label: "EnergivIA gerando proposta em PDF..." },
];

interface InputDraftSpan {
  start: number;
  end: number;
  fullText: string;
}

const USER_INPUT_DRAFTS: InputDraftSpan[] = [
  { start: 0, end: 600, fullText: "Boa tarde" },
  { start: 3200, end: 3700, fullText: "1" },
  { start: 10200, end: 10700, fullText: "2" },
  { start: 15000, end: 15500, fullText: "1" },
  { start: 17800, end: 18400, fullText: "Marcelo" },
  { start: 20600, end: 21600, fullText: "(44) 99888-0000" },
  { start: 23800, end: 24300, fullText: "1" },
];

export function WhatsappFlowSimulator(): JSX.Element {
  const [timeMs, setTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number | null>(null);

  // High-precision smooth animation loop (60fps)
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    let animFrameId: number;

    const tick = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = now - lastTimeRef.current;
        setTimeMs((prev) => {
          const next = prev + delta * speed;
          if (next >= TOTAL_CYCLE_MS) {
            return 0; // Loop back
          }
          return next;
        });
      }
      lastTimeRef.current = now;
      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [isPlaying, speed]);

  // Messages visible at current time
  const visibleMessages = useMemo(() => {
    return SCHEDULED_MESSAGES.filter((m) => timeMs >= m.showAt);
  }, [timeMs]);

  // Active bot typing indicator
  const activeBotTyping = useMemo(() => {
    const span = BOT_TYPING_SPANS.find((s) => timeMs >= s.start && timeMs < s.end);
    return span ? span.label : null;
  }, [timeMs]);

  // Active user text in input draft bar
  const activeInputDraft = useMemo(() => {
    const span = USER_INPUT_DRAFTS.find((s) => timeMs >= s.start && timeMs < s.end);
    if (!span) return "";
    const progress = (timeMs - span.start) / (span.end - span.start);
    const charsToShow = Math.max(1, Math.floor(progress * span.fullText.length));
    return span.fullText.slice(0, charsToShow);
  }, [timeMs]);

  // Active milestone index
  const activeMilestoneIndex = useMemo(() => {
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (timeMs >= MILESTONES[i].startTime) {
        return i;
      }
    }
    return 0;
  }, [timeMs]);

  // Continuous progress for each milestone (0% to 100%)
  const milestoneProgresses = useMemo(() => {
    return MILESTONES.map((m) => {
      if (timeMs <= m.startTime) return 0;
      if (timeMs >= m.endTime) return 100;
      return ((timeMs - m.startTime) / (m.endTime - m.startTime)) * 100;
    });
  }, [timeMs]);

  // Smooth scroll to bottom on message updates
  const prevMsgCountRef = useRef(0);
  const prevTypingRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      visibleMessages.length !== prevMsgCountRef.current ||
      activeBotTyping !== prevTypingRef.current
    ) {
      prevMsgCountRef.current = visibleMessages.length;
      prevTypingRef.current = activeBotTyping;

      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [visibleMessages.length, activeBotTyping]);

  // Mouse wheel scrubber to scrub through the entire conversation
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) > 2) {
      e.preventDefault();
      const delta = e.deltaY * 5.5;
      setTimeMs((prev) => {
        const next = Math.max(0, Math.min(TOTAL_CYCLE_MS - 50, prev + delta));
        return next;
      });
    }
  };

  const handleSelectMilestone = (idx: number) => {
    setTimeMs(MILESTONES[idx].startTime);
    lastTimeRef.current = null;
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setTimeMs(0);
    lastTimeRef.current = null;
    setIsPlaying(true);
  };

  return (
    <div
      onWheel={handleWheel}
      className="relative flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 py-6 select-none"
    >
      {/* ------------------------------------------------------------- */}
      {/* ELEGANT PHOTOREALISTIC IPHONE (MATCHING USER PNG MOCKUP)      */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex flex-col items-center w-full max-w-[360px] sm:max-w-[380px] shrink-0">
        {/* PHYSICAL PHONE SHELL CONTAINER */}
        <div className="relative group w-full aspect-[350/708] shrink-0 select-none">
          {/* Soft, Diffused Realistic Shadow casting below the iPhone */}
          <div className="pointer-events-none absolute inset-x-5 bottom-2 top-8 rounded-[48px] shadow-[0_28px_60px_-15px_rgba(0,0,0,0.85),0_12px_28px_-8px_rgba(0,0,0,0.6)]" />

          {/* SCREEN LAYER (Precisely aligned within the transparent cutout of iphone-mockup.png) */}
          <div className="absolute inset-y-[2.4%] left-[5.43%] right-[6.0%] rounded-[36px] overflow-hidden bg-[#f0f2f5] flex flex-col z-10 font-sans shadow-inner select-none">
            {/* iOS Status Bar */}
            <div className="relative z-20 flex items-center justify-between bg-white px-5 pt-2.5 pb-1 text-[13px] text-[#111b21] font-semibold select-none">
              {/* Left of notch: Time */}
              <span className="tracking-tight pl-0.5">9:41</span>

              {/* Center: Notch spacing placeholder (notch is on overlay mockup at z-30) */}
              <div className="w-28 h-4 pointer-events-none" />

              {/* Right of notch: Cellular Signal, Wifi, Battery */}
              <div className="flex items-center gap-1.5 text-[#111b21] pr-0.5">
                <div className="flex items-end gap-[1.5px] h-2.5">
                  <span className="w-[2px] h-1 bg-[#111b21] rounded-[0.5px]" />
                  <span className="w-[2px] h-1.5 bg-[#111b21] rounded-[0.5px]" />
                  <span className="w-[2px] h-2 bg-[#111b21] rounded-[0.5px]" />
                  <span className="w-[2px] h-2.5 bg-[#111b21] rounded-[0.5px]" />
                </div>
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9.47 2.02-12.73 5.27l1.41 1.41C3.32 6.94 7.42 5.08 12 5.08s8.68 1.86 11.32 4.6l1.41-1.41C21.47 5.02 16.97 3 12 3zm0 4.17c-3.82 0-7.28 1.55-9.79 4.06l1.41 1.41C5.83 10.43 8.73 9.25 12 9.25s6.17 1.18 8.38 3.39l1.41-1.41C19.28 8.72 15.82 7.17 12 7.17zm0 4.16c-2.67 0-5.09 1.08-6.85 2.84l1.41 1.41C7.8 14.34 9.77 13.5 12 13.5s4.2 0.84 5.44 2.08l1.41-1.41C17.09 12.41 14.67 11.33 12 11.33zm0 4.17c-1.52 0-2.9.62-3.9 1.62L12 21.04l3.9-3.92c-1-1-2.38-1.62-3.9-1.62z" />
                </svg>
                <div className="h-2.5 w-5 rounded-[3px] border border-[#111b21] p-[1px] flex items-center">
                  <div className="h-full w-4/5 rounded-[1.5px] bg-[#111b21]" />
                </div>
              </div>
            </div>

            {/* WhatsApp iOS Header */}
            <div className="relative z-20 flex items-center justify-between border-b border-[#e5e5ea] bg-white px-3.5 py-2 shadow-xs">
              <div className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 text-[#007aff] hover:opacity-80 transition cursor-pointer" />
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#070b14] ring-1 ring-slate-200 overflow-hidden shadow-xs">
                    <span className="text-cyan-400 font-bold text-xs">⚡</span>
                  </div>
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#25d366]" />
                </div>
                <div className="leading-tight">
                  <span className="text-[14px] font-semibold text-[#111b21] block">EnergivIA</span>
                  <p className="text-[11px] text-[#008069] font-medium">online agora</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 text-[#007aff] pr-1">
                <Video className="h-4 w-4 cursor-pointer opacity-90 hover:opacity-100" />
                <Phone className="h-3.5 w-3.5 cursor-pointer opacity-90 hover:opacity-100" />
                <MoreVertical className="h-4 w-4 text-[#54656f] cursor-pointer" />
              </div>
            </div>

            {/* Chat Messages Flow (Authentic WhatsApp light wallpaper and colors) */}
            <div
              ref={chatContainerRef}
              className="relative flex-1 space-y-2.5 overflow-y-auto p-3 text-sm scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#efeae2]/50 bg-blend-multiply"
              style={{
                backgroundImage: `radial-gradient(#0000000a 1px, transparent 1px)`,
                backgroundSize: "16px 16px",
              }}
            >
              {/* Date Pill */}
              <div className="flex justify-center my-0.5">
                <span className="rounded-lg bg-white/95 px-2.5 py-0.5 text-[11px] text-[#54656f] font-medium shadow-2xs border border-black/[0.04]">
                  Hoje
                </span>
              </div>

              {/* RENDER DYNAMIC MESSAGES */}
              {visibleMessages.map((msg) => {
                if (msg.type === "user") {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out"
                    >
                      <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#d9fdd3] border border-emerald-200/40 px-3 py-1.5 text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                        <p className="text-[14px] leading-relaxed font-normal">{msg.text}</p>
                        <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-[#667781]">
                          <span>{msg.time}</span>
                          <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                        </div>
                      </div>
                    </div>
                  );
                }

                if (msg.type === "user_doc") {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out"
                    >
                      <div className="max-w-[88%] rounded-2xl rounded-tr-xs bg-[#d9fdd3] border border-emerald-200/40 p-2 text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                        <div className="flex items-center gap-2.5 rounded-xl bg-white p-2 border border-emerald-200/60 shadow-2xs">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 font-bold">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-[#111b21] text-[13px]">
                              {msg.title}
                            </p>
                            <p className="text-[11px] text-[#667781] mt-0.5">{msg.subtitle}</p>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#667781]">
                          <span>{msg.time}</span>
                          <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                        </div>
                      </div>
                    </div>
                  );
                }

                // BOT MESSAGES (WhatsApp received white bubble)
                return (
                  <div
                    key={msg.id}
                    className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out"
                  >
                    <div className="max-w-[94%] rounded-2xl rounded-tl-xs bg-white border border-black/[0.04] p-3 text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] space-y-2">
                      {msg.kind === "welcome" && (
                        <div className="text-[13.5px] leading-relaxed space-y-1.5 text-[#111b21]">
                          <p>
                            Boa tarde Giovani! Tudo bem?
                            <br />
                            Sou seu assistente de dimensionamento e vendas da <b>EnergivIA</b>.
                          </p>
                          <p>Como posso ajudar você a gerar orçamentos e propostas solares hoje?</p>
                          <div className="mt-1.5 space-y-1 rounded-xl bg-[#f7f8fa] p-2.5 border border-slate-200/70 text-[12.5px] text-[#111b21]">
                            <p className="font-semibold text-[#111b21]">
                              Escolha uma opção digitando o número:
                            </p>
                            <p>[1] Enviar fatura de energia (PDF ou foto)</p>
                            <p>[2] Simular por consumo mensal (ex: 450 kWh)</p>
                            <p>[3] Simular por potência de pico (ex: 5 kWp)</p>
                            <p>[4] Simular por quantidade de placas</p>
                            <p>[5] Dúvidas sobre kits e preços</p>
                          </div>
                          <p className="text-[11px] text-[#667781] italic">
                            (Ou me envie diretamente a conta de luz)
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_bill" && (
                        <div className="text-[13.5px] leading-relaxed space-y-1 text-[#111b21]">
                          <p>
                            Perfeito! Envie o arquivo em <b>PDF</b> ou a <b>foto da conta de luz</b>{" "}
                            do seu cliente por aqui mesmo.
                          </p>
                          <p className="text-[12px] text-[#667781]">
                            Nossa inteligência artificial vai extrair automaticamente todos os dados
                            de consumo e histórico!
                          </p>
                        </div>
                      )}

                      {msg.kind === "ocr_result" && (
                        <div className="text-[13.5px] leading-relaxed space-y-2 text-[#111b21]">
                          <p className="text-[#008069] font-bold text-[13px]">
                            Legal, dados extraídos com precisão!
                          </p>
                          <div className="space-y-1 rounded-xl bg-[#f7f8fa] p-2.5 border border-slate-200/70 text-[12.5px]">
                            <p className="flex justify-between">
                              <span className="text-[#667781]">Concessionária:</span>
                              <span className="font-semibold text-[#111b21]">Copel (PR)</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-[#667781]">Consumo Médio:</span>
                              <span className="font-semibold text-[#111b21]">257 kWh/mês</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-[#667781]">Tipo de Ligação:</span>
                              <span className="font-semibold text-[#111b21]">
                                Monofásico (127V)
                              </span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-[#667781]">Potência Estimada:</span>
                              <span className="font-semibold text-[#008069]">3,15 kWp</span>
                            </p>
                          </div>
                          <p className="text-[12px] text-[#667781]">
                            Qual o tipo de telhado para fixação dos módulos?
                          </p>
                          <div className="space-y-1 rounded-xl bg-[#f7f8fa] p-2 border border-slate-200/70 text-[12px]">
                            <p>[1] Fibrocimento / Metálico</p>
                            <p className="font-semibold text-[#008069]">[2] Cerâmico (Colonial)</p>
                            <p>[3] Solo / Carport</p>
                          </div>
                        </div>
                      )}

                      {msg.kind === "kit_dynamis" && (
                        <div className="text-[13.5px] leading-relaxed space-y-2 text-[#111b21]">
                          <p className="font-bold text-[#008069] text-[13px]">
                            Kit Dynamis Selecionado com Sucesso!
                          </p>
                          <div className="rounded-xl border border-emerald-300/80 bg-[#f7f8fa] p-2.5 space-y-1.5 text-[12.5px]">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#008069] uppercase tracking-wide">
                                Kit Solar Dynamis 3,15 kWp
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Em Estoque
                              </span>
                            </div>
                            <p className="text-xs text-[#111b21]">
                              • 5x Módulos 630W N-Type TopCon
                              <br />• 1x Inversor Micro/String 3kW Monofásico
                            </p>
                            <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-xs">
                              <span className="text-[#667781]">Custo Distribuidor:</span>
                              <span className="font-bold text-[#111b21]">R$ 4.290,00</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#667781]">Margem Sugerida (35%):</span>
                              <span className="font-bold text-[#008069]">R$ 6.600,00</span>
                            </div>
                          </div>
                          <p className="text-[12px] text-[#667781]">
                            Deseja aplicar essa margem de 35% na proposta comercial?
                          </p>
                          <div className="space-y-1 rounded-xl bg-[#f7f8fa] p-2 border border-slate-200/70 text-[12px]">
                            <p className="font-semibold text-[#008069]">[1] Sim, avançar com 35%</p>
                            <p>[2] Ajustar valor final manualmente</p>
                          </div>
                        </div>
                      )}

                      {msg.kind === "ask_name" && (
                        <div className="text-[13.5px] leading-relaxed space-y-1 text-[#111b21]">
                          <p>Excelente margem definida!</p>
                          <p>
                            Qual o <b>nome do cliente</b> para personalizar a proposta?
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_phone" && (
                        <div className="text-[13.5px] leading-relaxed space-y-1 text-[#111b21]">
                          <p>
                            Prazer, Marcelo! Qual o <b>WhatsApp com DDD</b> dele para registro no
                            CRM?
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_template" && (
                        <div className="text-[13.5px] leading-relaxed space-y-2 text-[#111b21]">
                          <p>Contato cadastrado no CRM!</p>
                          <p>
                            Qual <b>modelo de proposta</b> você deseja gerar?
                          </p>
                          <div className="space-y-1 rounded-xl bg-[#f7f8fa] p-2.5 border border-slate-200/70 text-[12.5px]">
                            <p className="font-semibold text-[#008069]">
                              [1] Modelo Premium Executivo (Gráficos + Payback)
                            </p>
                            <p>[2] Modelo Express Resumido (1 Página)</p>
                            <p>[3] Modelo Técnico Detalhado</p>
                          </div>
                        </div>
                      )}

                      {msg.kind === "final_proposal" && (
                        <div className="text-[13.5px] leading-relaxed space-y-2 text-[#111b21]">
                          <p className="font-bold text-[#008069] text-[13px]">
                            Proposta Gerada com Sucesso em 12 Segundos!
                          </p>

                          {/* Proposal Card in WhatsApp */}
                          <div className="rounded-xl border border-emerald-300 bg-[#f7f8fa] p-2.5 shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-[#111b21] text-[13px]">
                                  Proposta_Solar_Marcelo_Santana.pdf
                                </p>
                                <p className="text-[11px] text-[#667781] mt-0.5">
                                  3,15 kWp • Economia de R$ 74.800 em 25 anos
                                </p>
                              </div>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11.5px]">
                              <span className="text-[#667781] font-medium">Payback: 2,7 anos</span>
                              <span className="flex items-center gap-1 font-bold text-[#008069] hover:underline">
                                Abrir Proposta <ExternalLink className="h-3 w-3" />
                              </span>
                            </div>
                          </div>

                          <p className="text-[11.5px] text-[#667781] leading-relaxed">
                            O cliente também já recebeu o link interativo no WhatsApp dele e a
                            oportunidade foi criada no seu CRM!
                          </p>
                        </div>
                      )}

                      <div className="mt-0.5 flex items-center justify-end text-[11px] text-[#667781]">
                        <span>{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* LIVE TYPING INDICATOR */}
              {activeBotTyping && (
                <div className="flex items-center gap-2 text-[#54656f] text-xs py-0.5 animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out">
                  <div className="flex gap-1.5 rounded-full bg-white px-2.5 py-1.5 border border-black/[0.04] shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00a884] animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-[11.5px] text-[#008069] animate-pulse font-medium">
                    {activeBotTyping}
                  </span>
                </div>
              )}
            </div>

            {/* WhatsApp iOS Input Bar */}
            <div className="relative z-20 flex items-center gap-2 bg-[#f0f2f5] px-3 py-2 border-t border-[#e5e5ea] text-slate-400">
              <button type="button" className="text-[#007aff] hover:opacity-80 transition px-1">
                <span className="text-xl font-light leading-none">+</span>
              </button>
              <div className="flex-1 min-h-[34px] flex items-center rounded-full bg-white px-3.5 py-1 text-[13px] text-[#111b21] border border-[#e5e5ea] shadow-2xs">
                {activeInputDraft ? (
                  <span className="text-[#111b21] font-normal flex items-center gap-0.5">
                    {activeInputDraft}
                    <span className="inline-block w-1.5 h-3.5 bg-[#00a884] animate-pulse" />
                  </span>
                ) : (
                  <span className="text-[#8696a0]">Mensagem</span>
                )}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-xs hover:bg-[#008069] transition">
                {activeInputDraft ? (
                  <Send className="h-3.5 w-3.5 fill-white" />
                ) : (
                  <Zap className="h-3.5 w-3.5 fill-white" />
                )}
              </div>
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="bg-[#f0f2f5] pb-1.5 pt-0.5 flex justify-center">
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
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-100 hover:bg-white/10 hover:border-cyan-500/30 transition"
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current text-cyan-400" />
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/30 transition"
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
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.2)] font-bold"
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
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Conversa em Tempo Real
            </span>

            {/* Mouse Scroll Interactive Cue */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-3 py-1 text-xs font-mono text-cyan-400 shadow-sm">
              <Mouse className="h-3.5 w-3.5 animate-bounce text-cyan-400" />
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
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 will-change-[width] transition-all duration-75 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                    style={{
                      width: `${pct}%`,
                    }}
                  />
                </div>
                <p
                  className={`text-xs font-mono text-center truncate transition-colors duration-200 ${
                    isCurrent ? "text-cyan-400 font-bold" : "text-slate-500"
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
                    ? "border-cyan-500/50 bg-gradient-to-r from-cyan-950/40 via-[#0a1424] to-[#070b14] shadow-[0_0_25px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400/30"
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.4)]"
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
                    <span className="flex items-center gap-1.5 rounded-full bg-cyan-950/60 px-2.5 py-0.5 text-xs font-mono text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
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
