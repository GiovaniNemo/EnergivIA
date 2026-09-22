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
      {/* ELEGANT PHOTOREALISTIC IPHONE (MATCHING USER REFERENCE IMAGE) */}
      {/* ------------------------------------------------------------- */}
      <div className="relative group w-full max-w-[420px] sm:max-w-[440px] shrink-0">
        {/* Soft, Diffused Realistic Shadow casting to bottom-right */}
        <div className="pointer-events-none absolute -inset-2 rounded-[56px] shadow-[24px_30px_70px_rgba(0,0,0,0.85),8px_12px_24px_rgba(0,0,0,0.6)]" />

        {/* PRECISION DARK TITANIUM CHASSIS FRAME */}
        <div className="relative rounded-[52px] border-[4px] border-[#1e232c] bg-[#12161f] p-2 ring-1 ring-white/20">
          {/* Subtle flush physical button contours */}
          {/* Left Buttons: Action + Volume Up / Down */}
          <div className="absolute -left-[5.5px] top-[115px] h-[26px] w-[2.5px] rounded-l-sm bg-[#2b323e]" />
          <div className="absolute -left-[5.5px] top-[155px] h-[48px] w-[2.5px] rounded-l-sm bg-[#2b323e]" />
          <div className="absolute -left-[5.5px] top-[215px] h-[48px] w-[2.5px] rounded-l-sm bg-[#2b323e]" />
          {/* Right Button: Power */}
          <div className="absolute -right-[5.5px] top-[165px] h-[72px] w-[2.5px] rounded-r-sm bg-[#2b323e]" />

          {/* INNER DISPLAY - PURE WHITE BACKGROUND (AS REQUESTED) */}
          <div className="relative flex h-[640px] sm:h-[680px] w-full flex-col overflow-hidden rounded-[42px] bg-white text-slate-900 font-sans shadow-inner border border-slate-200/60">
            {/* TOP STATUS BAR (MATCHING REFERENCE IMAGE: 9:41, Dynamic Island, Signals) */}
            <div className="relative z-30 flex items-center justify-between bg-white px-7 pt-3.5 pb-2 text-[14px] text-slate-900 font-semibold select-none">
              <span>9:41</span>

              {/* Dynamic Island Pill with Camera Optics */}
              <div className="relative flex h-6 w-28 items-center justify-between rounded-full bg-black px-3 shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
                <div className="h-[3.5px] w-7 rounded-full bg-[#1c1c1e]" />
                <div className="flex h-3 w-3 items-center justify-center rounded-full bg-[#08080a] ring-1 ring-white/10">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0a1829]" />
                </div>
              </div>

              {/* Cellular Signal, Wifi, Battery (Matching iOS status layout) */}
              <div className="flex items-center gap-1.5 text-slate-900">
                {/* 4 Cellular Signal Bars */}
                <div className="flex items-end gap-[1.5px] h-3">
                  <span className="w-[2.5px] h-1.5 bg-slate-900 rounded-[0.5px]" />
                  <span className="w-[2.5px] h-2 bg-slate-900 rounded-[0.5px]" />
                  <span className="w-[2.5px] h-2.5 bg-slate-900 rounded-[0.5px]" />
                  <span className="w-[2.5px] h-3 bg-slate-900 rounded-[0.5px]" />
                </div>
                {/* Wifi Icon */}
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9.47 2.02-12.73 5.27l1.41 1.41C3.32 6.94 7.42 5.08 12 5.08s8.68 1.86 11.32 4.6l1.41-1.41C21.47 5.02 16.97 3 12 3zm0 4.17c-3.82 0-7.28 1.55-9.79 4.06l1.41 1.41C5.83 10.43 8.73 9.25 12 9.25s6.17 1.18 8.38 3.39l1.41-1.41C19.28 8.72 15.82 7.17 12 7.17zm0 4.16c-2.67 0-5.09 1.08-6.85 2.84l1.41 1.41C7.8 14.34 9.77 13.5 12 13.5s4.2 0.84 5.44 2.08l1.41-1.41C17.09 12.41 14.67 11.33 12 11.33zm0 4.17c-1.52 0-2.9.62-3.9 1.62L12 21.04l3.9-3.92c-1-1-2.38-1.62-3.9-1.62z" />
                </svg>
                {/* Battery with Full Charge Indicator */}
                <div className="h-2.5 w-5 rounded-[3px] border border-slate-900 p-[1px] flex items-center">
                  <div className="h-full w-4/5 rounded-[1.5px] bg-slate-900" />
                </div>
              </div>
            </div>

            {/* WhatsApp Clean iOS Header */}
            <div className="relative z-20 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-2.5 shadow-xs">
              <div className="flex items-center gap-2.5">
                <ArrowLeft className="h-5 w-5 text-slate-700 hover:text-slate-900 transition cursor-pointer" />
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 shadow-sm overflow-hidden ring-1 ring-slate-200">
                    <div className="flex h-full w-full items-center justify-center bg-[#070b14] text-cyan-400 font-bold text-xs">
                      ⚡
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div>
                  <span className="text-[15px] font-bold text-slate-900 block leading-tight">
                    EnergivIA
                  </span>
                  <p className="text-xs text-emerald-600 font-medium">online agora</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 text-slate-600 pr-1">
                <Video className="h-5 w-5 hover:text-slate-900 transition cursor-pointer" />
                <Phone className="h-4 w-4 hover:text-slate-900 transition cursor-pointer" />
                <MoreVertical className="h-5 w-5 hover:text-slate-900 transition cursor-pointer" />
              </div>
            </div>

            {/* Chat Messages Flow (Light Background with maximum contrast) */}
            <div
              ref={chatContainerRef}
              className="relative flex-1 space-y-3 overflow-y-auto p-3.5 text-sm scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 bg-white"
            >
              {/* Date Pill */}
              <div className="flex justify-center my-1">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 font-medium shadow-2xs">
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
                      <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#d9fdd3] border border-emerald-200/50 px-3.5 py-2 text-slate-900 shadow-xs">
                        <p className="text-[14.5px] leading-relaxed font-normal">{msg.text}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                          <span>{msg.time}</span>
                          <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
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
                      <div className="max-w-[88%] rounded-2xl rounded-tr-xs bg-[#d9fdd3] border border-emerald-200/50 p-2.5 text-slate-900 shadow-xs">
                        <div className="flex items-center gap-3 rounded-xl bg-white p-2.5 border border-emerald-200/60 shadow-2xs">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 font-bold">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900 text-sm">
                              {msg.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{msg.subtitle}</p>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                          <span>{msg.time}</span>
                          <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                        </div>
                      </div>
                    </div>
                  );
                }

                // BOT MESSAGES (Crisp, High Contrast Cards)
                return (
                  <div
                    key={msg.id}
                    className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out"
                  >
                    <div className="max-w-[94%] rounded-2xl rounded-tl-xs bg-[#f0f2f5] border border-slate-200/70 p-3.5 text-slate-900 shadow-xs space-y-2.5">
                      {msg.kind === "welcome" && (
                        <div className="text-[14px] leading-relaxed space-y-2 text-slate-800">
                          <p>
                            Boa tarde Giovani! Tudo bem?
                            <br />
                            Sou seu assistente de vendas e dimensionamento da <b>EnergivIA</b>.
                          </p>
                          <p>
                            Como posso ajudar você a gerar orçamentos e propostas para seus clientes
                            hoje?
                          </p>
                          <div className="mt-2 space-y-1.5 rounded-xl bg-white p-3 border border-slate-200/80 text-[13px] text-slate-700 shadow-2xs">
                            <p className="font-bold text-slate-900">
                              Escolha uma opção digitando o número:
                            </p>
                            <p>[1] Enviar fatura de energia (PDF ou foto)</p>
                            <p>[2] Simular por consumo mensal (ex: 450 kWh)</p>
                            <p>[3] Simular por potência de pico (ex: 5 kWp)</p>
                            <p>[4] Simular por quantidade de placas (ex: 10 módulos)</p>
                            <p>[5] Dúvidas sobre equipamentos e preços</p>
                          </div>
                          <p className="text-xs text-slate-500 italic">
                            (Ou me envie diretamente a conta de luz em PDF/foto)
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_bill" && (
                        <div className="text-[14px] leading-relaxed space-y-1 text-slate-800">
                          <p>
                            Perfeito! Envie o arquivo em <b>PDF</b> ou a <b>foto da conta de luz</b>{" "}
                            do seu cliente por aqui mesmo.
                          </p>
                          <p className="text-xs text-slate-600">
                            Nossa inteligência artificial vai extrair automaticamente todos os dados
                            de consumo e histórico!
                          </p>
                        </div>
                      )}

                      {msg.kind === "ocr_result" && (
                        <div className="text-[14px] leading-relaxed space-y-2 text-slate-800">
                          <p className="text-emerald-700 font-bold">
                            Legal, dados extraídos com precisão!
                          </p>
                          <div className="space-y-1.5 rounded-xl bg-white p-3 border border-slate-200 text-[13px] shadow-2xs">
                            <p className="flex justify-between">
                              <span className="text-slate-500">Concessionária:</span>
                              <span className="font-bold text-slate-900">COPEL</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-500">Consumo Médio:</span>
                              <span className="font-bold text-emerald-600">257 kWh/mês</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-500">Tipo de Ligação:</span>
                              <span className="font-bold text-slate-900">Bifásico</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-500">Gasto Atual:</span>
                              <span className="font-bold text-rose-600">R$ 282,70/mês</span>
                            </p>
                          </div>
                          <p className="font-medium text-slate-900">
                            Qual é o tipo de estrutura de fixação do telhado?
                          </p>
                          <div className="space-y-1 text-[13px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <p>[1] Telha Cerâmica / Fibrocimento</p>
                            <p>[2] Telha Metálica / Trapezoidal</p>
                            <p>[3] Solo / Laje plana</p>
                          </div>
                        </div>
                      )}

                      {msg.kind === "kit_dynamis" && (
                        <div className="text-[14px] leading-relaxed space-y-2 text-slate-800">
                          <p className="text-emerald-700 font-bold">
                            Encontrei o kit ideal para atender 100% do consumo:
                          </p>
                          <div className="rounded-xl bg-white p-3.5 border border-emerald-300 shadow-2xs space-y-1.5 text-[13px]">
                            <p className="font-bold text-slate-900 text-[15px]">
                              Kit Dynamis 3,15 kWp
                            </p>
                            <p className="text-xs text-slate-500">
                              6x Módulos 580W N-Type + Inversor 3kW Híbrido
                            </p>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 mt-1.5">
                              <span className="text-slate-500">Geração estimada:</span>
                              <span className="font-bold text-emerald-600">315 kWh/mês</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Custo do Kit:</span>
                              <span className="font-bold text-slate-900">R$ 6.840,00</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Valor Sugerido Venda:</span>
                              <span className="font-extrabold text-emerald-700 text-sm">
                                R$ 11.900,00
                              </span>
                            </div>
                          </div>
                          <p className="font-medium text-slate-900">
                            Deseja gerar a proposta com esse kit Dynamis?
                          </p>
                          <div className="space-y-1 text-[13px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <p>[1] Sim, usar este kit</p>
                            <p>[2] Ver outra opção de distribuidor</p>
                            <p>[3] Ajustar margem de lucro</p>
                          </div>
                        </div>
                      )}

                      {msg.kind === "ask_name" && (
                        <div className="text-[14px] leading-relaxed text-slate-800">
                          <p>
                            Excelente! Qual o <b>nome do cliente</b> para inserirmos na capa da
                            proposta?
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_phone" && (
                        <div className="text-[14px] leading-relaxed text-slate-800">
                          <p>
                            Obrigado! Qual o <b>WhatsApp do cliente</b> para envio e acompanhamento
                            no CRM?
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_template" && (
                        <div className="text-[14px] leading-relaxed space-y-2 text-slate-800">
                          <p>
                            Qual modelo de proposta deseja gerar para o <b>Marcelo</b>?
                          </p>
                          <div className="space-y-1 text-[13px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <p>[1] Modelo Comercial Padrão (6 páginas)</p>
                            <p>[2] Modelo Executivo Resumido (2 páginas)</p>
                            <p>[3] Modelo Completo com Financiamento</p>
                          </div>
                        </div>
                      )}

                      {msg.kind === "final_proposal" && (
                        <div className="space-y-2.5">
                          <p className="font-bold text-emerald-700 text-[14.5px]">
                            Prontinho! Proposta gerada com sucesso em 42 segundos!
                          </p>

                          {/* Proposal Card in WhatsApp */}
                          <div className="rounded-xl border border-emerald-300 bg-white p-3.5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-slate-900 text-sm">
                                  Proposta_Solar_Marcelo_Santana.pdf
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  3,15 kWp • Economia de R$ 74.800 em 25 anos
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                              <span className="text-slate-500 font-medium">Payback: 2,7 anos</span>
                              <span className="flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700">
                                Abrir Proposta <ExternalLink className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            O cliente também já recebeu o link interativo no WhatsApp dele e a
                            oportunidade foi criada no seu CRM!
                          </p>
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-end text-[11px] text-slate-400">
                        <span>{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* LIVE TYPING INDICATOR */}
              {activeBotTyping && (
                <div className="flex items-center gap-2.5 text-slate-500 text-xs py-1 animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out">
                  <div className="flex gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 border border-slate-200 shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-slate-600 animate-pulse font-medium">
                    {activeBotTyping}
                  </span>
                </div>
              )}
            </div>

            {/* Simulated WhatsApp iOS Chat Input Bar */}
            <div className="relative z-20 flex items-center gap-2.5 bg-white px-4 py-2.5 border-t border-slate-100 text-slate-400 shadow-xs">
              <div className="flex-1 min-h-[40px] flex items-center rounded-full bg-slate-100 px-4 py-1.5 text-sm text-slate-900 border border-slate-200/50">
                {activeInputDraft ? (
                  <span className="text-slate-900 font-medium flex items-center gap-0.5">
                    {activeInputDraft}
                    <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse" />
                  </span>
                ) : (
                  <span className="text-slate-400">Mensagem...</span>
                )}
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition shadow-sm hover:bg-emerald-600">
                {activeInputDraft ? (
                  <Send className="h-4 w-4 fill-white animate-in scale-90" />
                ) : (
                  <Zap className="h-4 w-4 fill-white" />
                )}
              </div>
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="bg-white pb-2 pt-1 flex justify-center">
              <div className="w-32 h-1 bg-slate-300 rounded-full" />
            </div>
          </div>
        </div>

        {/* Minimalist Floating Player Controls Below Phone */}
        <div className="mt-5 flex items-center justify-between rounded-full border border-white/10 bg-[#070b14]/90 px-5 py-2.5 text-xs text-slate-300 backdrop-blur-md shadow-xl">
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
