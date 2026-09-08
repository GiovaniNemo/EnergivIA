"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  ExternalLink,
  FileText,
  MoreVertical,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Send,
  Sparkles,
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

  const bottomAnchorRef = useRef<HTMLDivElement>(null);
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
            return 0; // Seamless loop back to beginning
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

  // Continuous fluid progress for each milestone (0% to 100%)
  const milestoneProgresses = useMemo(() => {
    return MILESTONES.map((m) => {
      if (timeMs <= m.startTime) return 0;
      if (timeMs >= m.endTime) return 100;
      return ((timeMs - m.startTime) / (m.endTime - m.startTime)) * 100;
    });
  }, [timeMs]);

  // Smooth scroll to bottom whenever visible message count changes or typing starts/stops
  const prevMsgCountRef = useRef(0);
  const prevTypingRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      visibleMessages.length !== prevMsgCountRef.current ||
      activeBotTyping !== prevTypingRef.current
    ) {
      prevMsgCountRef.current = visibleMessages.length;
      prevTypingRef.current = activeBotTyping;

      bottomAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [visibleMessages.length, activeBotTyping]);

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
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 py-4">
      {/* SMARTPHONE MOCKUP */}
      <div className="relative w-full max-w-[360px] sm:max-w-[400px] select-none">
        {/* Ambient Glow */}
        <div className="absolute -inset-2 rounded-[52px] bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-sky-500/20 blur-xl -z-10 opacity-70 animate-pulse" />

        {/* Device Shell */}
        <div className="relative rounded-[46px] border-[7px] border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-black/80 ring-1 ring-slate-700/50">
          {/* Inner Screen */}
          <div className="relative flex h-[600px] sm:h-[640px] w-full flex-col overflow-hidden rounded-[36px] bg-[#0b141a] text-slate-100 font-sans">
            {/* Top Status Bar */}
            <div className="relative z-30 flex items-center justify-between bg-[#1f2c34] px-6 pt-2 pb-1 text-[11px] text-slate-300 font-medium">
              <span>16:56</span>
              <div className="h-4 w-20 rounded-full bg-black/60 shadow-inner" />
              <div className="flex items-center gap-1.5 text-[10px]">
                <span>5G</span>
                <div className="h-2 w-4 rounded-sm border border-slate-400 p-[1px]">
                  <div className="h-full w-3/4 rounded-[1px] bg-emerald-400" />
                </div>
              </div>
            </div>

            {/* WhatsApp Header */}
            <div className="relative z-20 flex items-center justify-between border-b border-slate-800 bg-[#1f2c34] px-3 py-2.5 shadow-md">
              <div className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 text-slate-300 cursor-pointer" />
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-sky-400 via-cyan-500 to-emerald-500 p-0.5 shadow-md overflow-hidden">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-cyan-400">
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <circle cx="12" cy="5" r="2" />
                        <path d="M12 7v4" />
                        <line x1="8" y1="16" x2="8" y2="16" />
                        <line x1="16" y1="16" x2="16" y2="16" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#1f2c34] bg-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white">EnergivIA</span>
                  </div>
                  <p className="text-[10px] text-emerald-400">online</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-300 pr-1">
                <Video className="h-4 w-4 hover:text-white cursor-pointer" />
                <Phone className="h-4 w-4 hover:text-white cursor-pointer" />
                <MoreVertical className="h-4 w-4 hover:text-white cursor-pointer" />
              </div>
            </div>

            {/* Chat Messages Flow */}
            <div
              className="relative flex-1 space-y-2.5 overflow-y-auto p-2.5 text-[11.5px] sm:text-xs scroll-smooth scrollbar-thin scrollbar-thumb-slate-800"
              style={{
                backgroundImage: `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: "16px 16px",
              }}
            >
              {/* Date Pill */}
              <div className="flex justify-center my-1">
                <span className="rounded-md bg-[#182229] px-2.5 py-0.5 text-[10px] text-slate-400 shadow-sm">
                  Hoje
                </span>
              </div>

              {/* RENDER DYNAMIC MESSAGES */}
              {visibleMessages.map((msg) => {
                if (msg.type === "user") {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
                    >
                      <div className="max-w-[85%] rounded-xl rounded-tr-none bg-[#005c4b] px-3 py-1.5 text-slate-100 shadow">
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
                      className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
                    >
                      <div className="max-w-[85%] rounded-xl rounded-tr-none bg-[#005c4b] p-2 text-slate-100 shadow">
                        <div className="flex items-center gap-2 rounded-lg bg-slate-950/70 p-1.5 border border-emerald-500/30">
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

                // BOT MESSAGES
                return (
                  <div
                    key={msg.id}
                    className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
                  >
                    <div className="max-w-[92%] rounded-xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow border border-slate-800">
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
                          <p className="text-emerald-400 font-medium">
                            Legal, dados extraídos com precisão!
                          </p>
                          <p className="mt-1 text-[11px] leading-snug">
                            Consumo médio de <b>257 kWh/mês</b> em <b>Maringá/PR</b> (baseado no
                            histórico de 5 meses da fatura).
                            <br />
                            Padrão de rede identificado: <b>Trifásico</b>
                          </p>

                          <div className="mt-2 space-y-0.5 text-[10.5px]">
                            <p className="font-semibold text-white">Qual a estrutura do telhado?</p>
                            <p>1️⃣ Cerâmica (Colonial)</p>
                            <p>2️⃣ Fibrocimento</p>
                            <p>3️⃣ Metálico</p>
                            <p>4️⃣ Solo</p>
                            <p>5️⃣ Laje</p>
                            <p>6️⃣ Fibrometal</p>
                            <p>7️⃣ Sem estrutura</p>
                          </div>
                          <p className="mt-1.5 text-[9.5px] italic text-slate-400">
                            (Responda com o número da opção)
                          </p>
                        </div>
                      )}

                      {msg.kind === "kit_dynamis" && (
                        <div>
                          <p className="leading-snug">
                            Excelente! Seguem as melhores opções de kits dimensionados para o
                            consumo de <b>257 kWh/mês</b>:
                          </p>

                          {/* Clean Kit Card - Dynamis & Price */}
                          <div className="mt-2 rounded-xl bg-slate-950/70 p-2.5 border border-emerald-500/30">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">
                                1️⃣ Distribuidor: Dynamis
                              </span>
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                                R$ 5.159,23
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-slate-300">
                              <div className="rounded bg-slate-900 p-1.5">
                                <span className="text-slate-400 block text-[9px]">Potência:</span>
                                <span className="font-semibold text-white">3,15 kWp</span>
                              </div>
                              <div className="rounded bg-slate-900 p-1.5">
                                <span className="text-slate-400 block text-[9px]">
                                  Geração Média:
                                </span>
                                <span className="font-semibold text-emerald-400">332 kWh/mês</span>
                              </div>
                            </div>
                          </div>

                          <p className="mt-2 text-[10.5px] text-slate-300">
                            Qual opção você prefere para o seu cliente?{" "}
                            <span className="text-[9.5px] italic text-slate-400">
                              (Responda com o número)
                            </span>
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_name" && (
                        <div>
                          <p className="leading-snug">
                            Ótima escolha! Kit selecionado com sucesso. ☀️
                          </p>
                          <p className="mt-1 text-[11px] text-slate-300">
                            Qual o nome do cliente final para registrarmos no seu CRM?
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_phone" && (
                        <div>
                          <p className="leading-snug">
                            Certo, vou registrar o cliente Marcelo. E qual o WhatsApp dele com DDD?
                          </p>
                        </div>
                      )}

                      {msg.kind === "ask_template" && (
                        <div>
                          <p className="leading-snug">Cliente Marcelo anotado com sucesso! 👤✨</p>
                          <p className="mt-1.5 font-semibold text-white">
                            Qual modelo de proposta comercial você deseja usar para o seu cliente?
                          </p>
                          <p className="mt-1 text-[11px] text-emerald-300">
                            1️⃣ Template de Proposta Padrão EnergivIA
                          </p>
                          <p className="mt-1 text-[9.5px] italic text-slate-400">
                            (Responda com o número da opção desejada)
                          </p>
                        </div>
                      )}

                      {msg.kind === "final_proposal" && (
                        <div>
                          <p className="leading-snug">
                            Perfeito! Proposta comercial gerada com sucesso para o cliente{" "}
                            <b>Marcelo</b>! 📋✅
                          </p>

                          <div className="mt-2 space-y-1 rounded-lg bg-slate-950/70 p-2 text-[11px] text-slate-300 border border-slate-800">
                            <div className="flex justify-between">
                              <span>☀️ Potência:</span>
                              <span className="font-semibold text-white">3,15 kWp</span>
                            </div>
                            <div className="flex justify-between">
                              <span>🏢 Distribuidor:</span>
                              <span className="font-semibold text-emerald-400">Dynamis</span>
                            </div>
                            <div className="flex justify-between">
                              <span>🎨 Modelo:</span>
                              <span className="font-medium text-slate-300">Padrão EnergivIA</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-800 pt-1 text-emerald-400 font-bold">
                              <span>💰 Valor Total:</span>
                              <span>R$ 8.324,04</span>
                            </div>
                          </div>

                          {/* Proposal Card with Pretty Link */}
                          <div className="mt-2 rounded-xl bg-gradient-to-r from-emerald-950/90 to-slate-900 p-2.5 border border-emerald-500/50 shadow-md">
                            <p className="text-[10px] text-slate-400">
                              📄 Acesse a Proposta Pronta no link:
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] font-bold text-emerald-300 truncate">
                              app.energivias.com.br/proposta/marcelo-solar
                            </p>

                            <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-1.5 text-slate-950 font-bold text-xs shadow hover:bg-emerald-400 transition">
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Visualizar Proposta Comercial</span>
                            </div>
                          </div>

                          <p className="mt-2 text-[10px] text-slate-300">
                            Ela já está disponível no seu painel CRM da EnergivIA. Posso te ajudar
                            com mais algum orçamento hoje?
                          </p>
                        </div>
                      )}

                      <div className="mt-1 flex justify-end text-[9px] text-slate-400">
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

              {/* Scroll Anchor */}
              <div ref={bottomAnchorRef} className="h-2 shrink-0" />
            </div>

            {/* Simulated WhatsApp Chat Input Bar */}
            <div className="relative z-20 flex items-center gap-2 bg-[#1f2c34] px-3 py-2 border-t border-slate-800 text-slate-400">
              <div className="flex-1 min-h-[34px] flex items-center rounded-full bg-[#2a3942] px-3.5 py-1 text-xs">
                {activeInputDraft ? (
                  <span className="text-white font-medium flex items-center gap-0.5">
                    {activeInputDraft}
                    <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-pulse" />
                  </span>
                ) : (
                  <span className="text-slate-400">Mensagem...</span>
                )}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 transition">
                {activeInputDraft ? (
                  <Send className="h-4 w-4 fill-slate-950 animate-in scale-90" />
                ) : (
                  <Zap className="h-4 w-4 fill-slate-950" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Player Controls */}
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-xs text-slate-300 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 transition"
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
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
              title="Reiniciar do começo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-slate-400">
              {isPlaying ? "Simulação ao vivo" : "Pausado"}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400">Velocidade:</span>
            {[1, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded px-1.5 py-0.5 font-medium transition ${
                  speed === s
                    ? "bg-emerald-400 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* INTERACTIVE CONTROLS & EXPLANATION PANEL */}
      <div className="w-full max-w-lg space-y-4">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3 w-3" /> Conversa em Tempo Real
          </span>
          <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
            Veja a troca de mensagens na prática
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Acompanhe o diálogo dinâmico: o cliente chama, a IA responde instantaneamente, analisa a
            fatura e monta a proposta completa em poucos segundos.
          </p>
        </div>

        {/* Stories-like 60fps Continuous Fluid Progress Bars */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {MILESTONES.map((m, idx) => {
            const isCurrent = activeMilestoneIndex === idx;
            const pct = milestoneProgresses[idx];
            return (
              <div key={m.id} className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 will-change-[width]"
                    style={{
                      width: `${pct}%`,
                    }}
                  />
                </div>
                <p
                  className={`text-[10px] font-semibold text-center truncate transition-colors duration-200 ${
                    isCurrent ? "text-emerald-400 font-bold" : "text-slate-500"
                  }`}
                >
                  {m.tag}
                </p>
              </div>
            );
          })}
        </div>

        {/* Clickable Step Cards */}
        <div className="space-y-2">
          {MILESTONES.map((m, idx) => {
            const isCurrent = activeMilestoneIndex === idx;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMilestone(idx)}
                className={`w-full text-left rounded-2xl border p-3 transition-all duration-200 ${
                  isCurrent
                    ? "border-emerald-500/50 bg-gradient-to-r from-slate-900 to-slate-800/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        isCurrent
                          ? "bg-emerald-400 text-slate-950 shadow-sm"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-semibold transition-colors ${
                        isCurrent ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {m.title}
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ao vivo
                    </span>
                  )}
                </div>

                <p className="mt-1 pl-7 text-[11px] text-slate-400 leading-relaxed">
                  {m.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Key Highlights */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-center">
          <div>
            <p className="text-lg font-bold text-white">100%</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Automatizado</p>
          </div>
          <div className="border-x border-slate-800">
            <p className="text-lg font-bold text-emerald-400">Dynamis</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Kits Integrados</p>
          </div>
          <div>
            <p className="text-lg font-bold text-sky-400">&lt; 1 min</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">PDF Gerado</p>
          </div>
        </div>
      </div>
    </div>
  );
}
