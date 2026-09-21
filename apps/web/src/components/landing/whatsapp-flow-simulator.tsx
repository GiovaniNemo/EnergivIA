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
  { id: "m1", showAt: 600, type: "user", text: "Boa tarde", time: "16:53" },
  { id: "m2", showAt: 1700, type: "bot", kind: "welcome", time: "16:53" },
  { id: "m3", showAt: 3700, type: "user", text: "1", time: "16:54" },
  { id: "m4", showAt: 4700, type: "bot", kind: "ask_bill", time: "16:54" },

  // Passo 2
  {
    id: "m5",
    showAt: 6800,
    type: "user_doc",
    title: "Fatura_de_Energia.pdf",
    subtitle: "1 página • 480 kB • PDF",
    time: "16:54",
  },
  { id: "m6", showAt: 8400, type: "bot", kind: "ocr_result", time: "16:54" },
  { id: "m7", showAt: 10700, type: "user", text: "2", time: "16:54" },

  // Passo 3
  { id: "m8", showAt: 13200, type: "bot", kind: "kit_dynamis", time: "16:54" },
  { id: "m9", showAt: 15500, type: "user", text: "1", time: "16:55" },
  { id: "m10", showAt: 16500, type: "bot", kind: "ask_name", time: "16:55" },

  // Passo 4
  { id: "m11", showAt: 18400, type: "user", text: "Marcelo", time: "16:55" },
  { id: "m12", showAt: 19400, type: "bot", kind: "ask_phone", time: "16:55" },
  { id: "m13", showAt: 21600, type: "user", text: "(44) 99888-0000", time: "16:55" },
  { id: "m14", showAt: 22600, type: "bot", kind: "ask_template", time: "16:55" },
  { id: "m15", showAt: 24300, type: "user", text: "1", time: "16:55" },

  // Passo 5
  { id: "m16", showAt: 26800, type: "bot", kind: "final_proposal", time: "16:56" },
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
  const [glassGlare, setGlassGlare] = useState<{ x: number; y: number }>({ x: 45, y: 25 });

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
    // Only scrub if scrolling vertically
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

  const handlePhoneMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlassGlare({ x, y });
  };

  return (
    <div
      onWheel={handleWheel}
      className="relative flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-14 py-8 select-none"
    >
      {/* ------------------------------------------------------------- */}
      {/* REALISTIC TITANIUM SMARTPHONE                                 */}
      {/* ------------------------------------------------------------- */}
      <div
        onMouseMove={handlePhoneMouseMove}
        className="relative group w-full max-w-[370px] sm:max-w-[410px] shrink-0"
      >
        {/* PHYSICAL HARDWARE SIDE BUTTONS */}
        {/* Left: Action Button & Volume Rockers */}
        <div className="absolute -left-[14px] top-[115px] h-[30px] w-[5px] rounded-l-md bg-gradient-to-r from-[#2c323c] to-[#1a1e24] shadow-md border-l border-white/20" />
        <div className="absolute -left-[14px] top-[160px] h-[50px] w-[5px] rounded-l-md bg-gradient-to-r from-[#2c323c] to-[#1a1e24] shadow-md border-l border-white/20" />
        <div className="absolute -left-[14px] top-[220px] h-[50px] w-[5px] rounded-l-md bg-gradient-to-r from-[#2c323c] to-[#1a1e24] shadow-md border-l border-white/20" />
        {/* Right: Power / Side Button */}
        <div className="absolute -right-[14px] top-[165px] h-[75px] w-[5px] rounded-r-md bg-gradient-to-l from-[#2c323c] to-[#1a1e24] shadow-md border-r border-white/20" />

        {/* TITANIUM BEZEL CHASSIS */}
        <div className="relative rounded-[52px] border-[10px] border-[#1d2229] bg-[#0d1117] p-2 shadow-[0_20px_50px_rgba(15,23,42,0.2)] ring-1 ring-slate-800/20">
          {/* Subtle antenna band micro-notches */}
          <div className="absolute -top-[10px] left-[55px] h-[2px] w-[4px] bg-slate-600" />
          <div className="absolute -top-[10px] right-[55px] h-[2px] w-[4px] bg-slate-600" />
          <div className="absolute -bottom-[10px] left-[55px] h-[2px] w-[4px] bg-slate-600" />
          <div className="absolute -bottom-[10px] right-[55px] h-[2px] w-[4px] bg-slate-600" />

          {/* INNER SCREEN DISPLAY (OLED Black) */}
          <div className="relative flex h-[620px] sm:h-[660px] w-full flex-col overflow-hidden rounded-[40px] bg-[#060b0e] text-slate-100 font-sans shadow-inner">
            {/* REALISTIC GLASS SPECULAR GLARE (Moves with mouse) */}
            <div
              className="pointer-events-none absolute inset-0 z-40 transition-opacity duration-300 opacity-60"
              style={{
                background: `linear-gradient(${115 + (glassGlare.x - 50) * 0.15}deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 28%, transparent 48%, rgba(255,255,255,0.03) 75%, transparent 100%)`,
              }}
            />

            {/* DYNAMIC ISLAND & STATUS BAR */}
            <div className="relative z-30 flex items-center justify-between bg-[#1f2c34] px-7 pt-2.5 pb-1.5 text-[11px] text-slate-300 font-medium">
              <span>16:56</span>

              {/* Dynamic Island with Camera Optics */}
              <div className="relative flex h-5 w-24 items-center justify-center rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]">
                {/* Micro Earphone Speaker Slit */}
                <div className="absolute left-3 h-1 w-5 rounded-full bg-[#1c1c1e]" />
                {/* Front Camera Lens with antireflection purple/blue ring */}
                <div className="absolute right-3.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#08080a] ring-1 ring-white/10">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0a1829]" />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="font-semibold">5G</span>
                <div className="h-2 w-4 rounded-sm border border-slate-300 p-[1px]">
                  <div className="h-full w-3/4 rounded-[1px] bg-emerald-400" />
                </div>
              </div>
            </div>

            {/* WhatsApp Header (Solid Obsidian Clean, No Gradient) */}
            <div className="relative z-20 flex items-center justify-between border-b border-white/[0.08] bg-[#1f2c34] px-3.5 py-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 text-slate-300 hover:text-white transition cursor-pointer" />
                <div className="relative">
                  {/* Clean avatar with emerald active ring */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 p-0.5 border border-emerald-400/40 shadow-sm overflow-hidden">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#111827] text-emerald-400 font-bold text-xs">
                      ⚡
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#1f2c34] bg-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">EnergivIA</span>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-medium">online agora</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-300 pr-1">
                <Video className="h-4 w-4 hover:text-white transition cursor-pointer" />
                <Phone className="h-4 w-4 hover:text-white transition cursor-pointer" />
                <MoreVertical className="h-4 w-4 hover:text-white transition cursor-pointer" />
              </div>
            </div>

            {/* Chat Messages Flow */}
            <div
              ref={chatContainerRef}
              className="relative flex-1 space-y-2.5 overflow-y-auto p-3 text-[11.5px] sm:text-xs scroll-smooth scrollbar-thin scrollbar-thumb-slate-800"
              style={{
                backgroundImage: `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: "16px 16px",
              }}
            >
              {/* Date Pill */}
              <div className="flex justify-center my-1">
                <span className="rounded-md bg-[#182229] px-2.5 py-0.5 text-[10px] text-slate-400 border border-white/5 shadow-sm">
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
                      <div className="max-w-[85%] rounded-xl rounded-tr-none bg-[#005c4b] px-3 py-1.5 text-slate-100 shadow-md">
                        <p className="leading-snug">{msg.text}</p>
                        <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                          <span>{msg.time}</span>
                          <CheckCheck className="h-3 w-3 text-sky-300" />
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
                      <div className="max-w-[85%] rounded-xl rounded-tr-none bg-[#005c4b] p-2 text-slate-100 shadow-md">
                        <div className="flex items-center gap-2 rounded-lg bg-slate-950/80 p-2 border border-emerald-500/20">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 font-bold text-[10px]">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-white text-[11px]">
                              {msg.title}
                            </p>
                            <p className="text-[9px] text-slate-300">{msg.subtitle}</p>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                          <span>{msg.time}</span>
                          <CheckCheck className="h-3 w-3 text-sky-300" />
                        </div>
                      </div>
                    </div>
                  );
                }

                // BOT MESSAGES (Clean solid dark surface, no gradient)
                return (
                  <div
                    key={msg.id}
                    className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out"
                  >
                    <div className="max-w-[92%] rounded-xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow border border-white/5">
                      {msg.kind === "welcome" && (
                        <div>
                          <p className="leading-snug">
                            Boa tarde Giovani! Tudo bem? ☀️
                            <br />
                            Sou seu assistente de vendas e dimensionamento da <b>EnergivIA</b>.
                          </p>
                          <p className="mt-1.5 leading-snug">
                            Como posso ajudar você a gerar orçamentos e propostas para seus clientes
                            hoje?
                          </p>
                          <div className="mt-2 space-y-0.5 text-[10.5px] text-slate-300">
                            <p className="font-semibold text-white">
                              Escolha uma opção digitando o número:
                            </p>
                            <p>1️⃣ Enviar fatura de energia (PDF ou foto)</p>
                            <p>2️⃣ Simular por consumo mensal (ex: 450 kWh)</p>
                            <p>3️⃣ Simular por potência de pico (ex: 5 kWp)</p>
                            <p>4️⃣ Simular por quantidade de placas (ex: 10 módulos)</p>
                            <p>5️⃣ Dúvidas sobre equipamentos e preços</p>
                          </div>
                          <p className="mt-1.5 text-[10px] italic text-slate-400">
                            (Ou me envie diretamente a conta de luz em PDF/foto ou sua dúvida)
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_bill" && (
                        <div>
                          <p className="leading-snug">
                            Perfeito! 📄 Envie o arquivo em <b>PDF</b> ou a{" "}
                            <b>foto da conta de luz</b> do seu cliente por aqui mesmo.
                          </p>
                          <p className="mt-1 text-[10.5px] text-slate-300">
                            Nossa inteligência artificial vai extrair automaticamente todos os dados
                            de consumo e histórico!
                          </p>
                        </div>
                      )}

                      {msg.kind === "ocr_result" && (
                        <div>
                          <p className="text-emerald-400 font-semibold">
                            Legal, dados extraídos com precisão!
                          </p>
                          <div className="mt-1.5 space-y-1 rounded-lg bg-slate-950/70 p-2 text-[10.5px] border border-white/5">
                            <p className="flex justify-between">
                              <span className="text-slate-400">Concessionária:</span>
                              <span className="font-bold text-white">COPEL</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Consumo Médio:</span>
                              <span className="font-bold text-emerald-400">257 kWh/mês</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Tipo de Ligação:</span>
                              <span className="font-bold text-white">Bifásico</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Gasto Atual:</span>
                              <span className="font-bold text-rose-400">R$ 282,70/mês</span>
                            </p>
                          </div>
                          <p className="mt-1.5 leading-snug">
                            Qual é o tipo de estrutura de fixação do telhado?
                          </p>
                          <div className="mt-1 space-y-0.5 text-[10.5px] text-slate-300">
                            <p>1️⃣ Telha Cerâmica / Fibrocimento</p>
                            <p>2️⃣ Telha Metálica / Trapezoidal</p>
                            <p>3️⃣ Solo / Laje plana</p>
                          </div>
                        </div>
                      )}

                      {msg.kind === "kit_dynamis" && (
                        <div>
                          <p className="text-emerald-400 font-semibold">
                            Encontrei o kit ideal para atender 100% do consumo:
                          </p>
                          <div className="mt-1.5 rounded-lg bg-slate-950/70 p-2 text-[10.5px] border border-emerald-500/20">
                            <p className="font-bold text-white">Kit Dynamis 3,15 kWp</p>
                            <p className="text-[9.5px] text-slate-400">
                              6x Módulos 580W N-Type + Inversor 3kW Híbrido
                            </p>
                            <div className="mt-1.5 flex items-center justify-between border-t border-white/10 pt-1">
                              <span className="text-slate-400">Geração estimada:</span>
                              <span className="font-bold text-emerald-400">315 kWh/mês</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Custo do Kit:</span>
                              <span className="font-bold text-white">R$ 6.840,00</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Valor Sugerido Venda:</span>
                              <span className="font-bold text-emerald-400">R$ 11.900,00</span>
                            </div>
                          </div>
                          <p className="mt-2 leading-snug">
                            Deseja gerar a proposta com esse kit Dynamis?
                          </p>
                          <div className="mt-1 space-y-0.5 text-[10.5px] text-slate-300">
                            <p>1️⃣ Sim, usar este kit</p>
                            <p>2️⃣ Ver outra opção de distribuidor</p>
                            <p>3️⃣ Ajustar margem de lucro</p>
                          </div>
                        </div>
                      )}

                      {msg.kind === "ask_name" && (
                        <div>
                          <p className="leading-snug">
                            Excelente! Qual o <b>nome do cliente</b> para inserirmos na capa da
                            proposta?
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_phone" && (
                        <div>
                          <p className="leading-snug">
                            Obrigado! Qual o <b>WhatsApp do cliente</b> para envio e acompanhamento
                            no CRM?
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_template" && (
                        <div>
                          <p className="leading-snug">
                            Qual modelo de proposta deseja gerar para o <b>Marcelo</b>?
                          </p>
                          <div className="mt-1.5 space-y-0.5 text-[10.5px] text-slate-300">
                            <p>1️⃣ Modelo Comercial Padrão (6 páginas)</p>
                            <p>2️⃣ Modelo Executivo Resumido (2 páginas)</p>
                            <p>3️⃣ Modelo Completo com Financiamento</p>
                          </div>
                        </div>
                      )}

                      {msg.kind === "final_proposal" && (
                        <div className="space-y-2">
                          <p className="font-bold text-emerald-400">
                            Prontinho! Proposta gerada com sucesso em 42 segundos! 🚀
                          </p>

                          {/* Proposal Card in WhatsApp */}
                          <div className="rounded-xl border border-emerald-500/40 bg-slate-950 p-2.5 shadow-md">
                            <div className="flex items-center gap-2">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-white text-[11px]">
                                  Proposta_Solar_Marcelo_Santana.pdf
                                </p>
                                <p className="text-[9.5px] text-slate-400">
                                  3,15 kWp • Economia de R$ 74.800 em 25 anos
                                </p>
                              </div>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[10px]">
                              <span className="text-slate-400">Payback: 2,7 anos</span>
                              <span className="flex items-center gap-1 font-bold text-emerald-400">
                                Abrir Proposta <ExternalLink className="h-3 w-3" />
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-300">
                            O cliente também já recebeu o link interativo no WhatsApp dele e a
                            oportunidade foi criada no seu CRM!
                          </p>
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-end text-[9px] text-slate-400">
                        <span>{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* LIVE TYPING INDICATOR */}
              {activeBotTyping && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1 animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out">
                  <div className="flex gap-1 rounded-full bg-[#202c33] px-3 py-2 border border-slate-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-[10.5px] text-slate-400 animate-pulse">
                    {activeBotTyping}
                  </span>
                </div>
              )}
            </div>

            {/* Simulated WhatsApp Chat Input Bar */}
            <div className="relative z-20 flex items-center gap-2 bg-[#1f2c34] px-3.5 py-2.5 border-t border-white/[0.08] text-slate-400">
              <div className="flex-1 min-h-[36px] flex items-center rounded-full bg-[#2a3942] px-3.5 py-1 text-xs">
                {activeInputDraft ? (
                  <span className="text-white font-medium flex items-center gap-0.5">
                    {activeInputDraft}
                    <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-pulse" />
                  </span>
                ) : (
                  <span className="text-slate-400">Mensagem...</span>
                )}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 transition shadow-sm">
                {activeInputDraft ? (
                  <Send className="h-4 w-4 fill-slate-950 animate-in scale-90" />
                ) : (
                  <Zap className="h-4 w-4 fill-slate-950" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Player Controls with Interactive Wheel Cue */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 transition"
              title="Reiniciar do começo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-slate-500 font-mono">
              {isPlaying ? "Simulação ao vivo" : "Pausado (Scroll ativo)"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Velocidade:</span>
            {[1, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded px-2 py-0.5 font-medium transition ${
                  speed === s
                    ? "bg-emerald-600 text-white font-bold"
                    : "text-slate-600 hover:text-slate-900"
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
      <div className="w-full max-w-lg space-y-5 z-10">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Conversa em Tempo Real
            </span>

            {/* Mouse Scroll Interactive Cue */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-[11px] font-mono text-emerald-700 shadow-sm">
              <Mouse className="h-3.5 w-3.5 animate-bounce" />
              <span>Role o mouse para avançar</span>
            </div>
          </div>

          <h3 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Veja a troca de mensagens na prática
          </h3>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Role o mouse para navegar no diálogo ou acompanhe em tempo real: o cliente chama, a IA
            extrai a fatura e entrega a proposta pronta em poucos segundos.
          </p>
        </div>

        {/* Clean Solid Progress Bars (No generic gradients) */}
        <div className="grid grid-cols-5 gap-2 pt-1">
          {MILESTONES.map((m, idx) => {
            const isCurrent = activeMilestoneIndex === idx;
            const pct = milestoneProgresses[idx];
            return (
              <div key={m.id} className="space-y-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-emerald-600 will-change-[width] transition-all duration-75"
                    style={{
                      width: `${pct}%`,
                    }}
                  />
                </div>
                <p
                  className={`text-[10.5px] font-mono text-center truncate transition-colors duration-200 ${
                    isCurrent ? "text-emerald-700 font-bold" : "text-slate-400"
                  }`}
                >
                  {m.tag}
                </p>
              </div>
            );
          })}
        </div>

        {/* Clickable Step Cards (Clean modern style, no rainbow gradients) */}
        <div className="space-y-2.5">
          {MILESTONES.map((m, idx) => {
            const isCurrent = activeMilestoneIndex === idx;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMilestone(idx)}
                className={`w-full text-left rounded-2xl border p-3.5 transition-all duration-200 ${
                  isCurrent
                    ? "border-emerald-300 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-200/80"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-900 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        isCurrent
                          ? "bg-emerald-600 text-white font-bold"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`text-sm font-semibold transition-colors ${
                        isCurrent ? "text-slate-900 font-bold" : "text-slate-700"
                      }`}
                    >
                      {m.title}
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-mono text-emerald-700 border border-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                      Ao vivo
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1.5 text-xs pl-8 leading-relaxed ${isCurrent ? "text-slate-700" : "text-slate-500"}`}
                >
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
