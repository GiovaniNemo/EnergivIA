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

type MessageItem =
  | {
      id: string;
      type: "user";
      text: string;
      time: string;
    }
  | {
      id: string;
      type: "user_doc";
      title: string;
      subtitle: string;
      time: string;
    }
  | {
      id: string;
      type: "bot";
      kind:
        | "welcome"
        | "ask_bill"
        | "ocr_result"
        | "kit_dynamis"
        | "ask_name"
        | "ask_phone"
        | "ask_template"
        | "final_proposal";
      time: string;
    };

type Action =
  | { type: "typing_input"; text: string; duration: number }
  | { type: "send_user"; text: string; time: string }
  | { type: "send_user_doc"; title: string; subtitle: string; time: string; duration: number }
  | { type: "bot_typing"; label: string; duration: number }
  | {
      type: "send_bot";
      kind: MessageItem["type"] extends "bot" ? MessageItem["kind"] : never;
      time: string;
    }
  | { type: "pause"; duration: number };

interface Milestone {
  id: number;
  title: string;
  tag: string;
  description: string;
  actionIndex: number;
}

const SCRIPT_ACTIONS: Action[] = [
  // 0: Passo 1 - Início
  { type: "typing_input", text: "Boa tarde", duration: 700 },
  { type: "send_user", text: "Boa tarde", time: "16:53" },
  { type: "bot_typing", label: "EnergivIA está digitando...", duration: 1100 },
  { type: "send_bot", kind: "welcome", time: "16:53" },
  { type: "pause", duration: 1200 },
  { type: "typing_input", text: "1", duration: 500 },
  { type: "send_user", text: "1", time: "16:54" },
  { type: "bot_typing", label: "EnergivIA está digitando...", duration: 1000 },
  { type: "send_bot", kind: "ask_bill", time: "16:54" },
  { type: "pause", duration: 1200 },

  // 10: Passo 2 - Envio da Fatura & OCR
  {
    type: "send_user_doc",
    title: "SegundaViaCopel.pdf",
    subtitle: "1 página • 524 kB • PDF",
    duration: 800,
    time: "16:54",
  },
  { type: "bot_typing", label: "EnergivIA analisando fatura com IA...", duration: 1600 },
  { type: "send_bot", kind: "ocr_result", time: "16:54" },
  { type: "pause", duration: 1400 },
  { type: "typing_input", text: "2", duration: 500 },
  { type: "send_user", text: "2", time: "16:54" },

  // 16: Passo 3 - Dimensionamento & Kit Dynamis
  { type: "bot_typing", label: "EnergivIA calculando melhor kit solar...", duration: 1400 },
  { type: "send_bot", kind: "kit_dynamis", time: "16:54" },
  { type: "pause", duration: 1400 },
  { type: "typing_input", text: "1", duration: 500 },
  { type: "send_user", text: "1", time: "16:55" },
  { type: "bot_typing", label: "EnergivIA está digitando...", duration: 900 },
  { type: "send_bot", kind: "ask_name", time: "16:55" },
  { type: "pause", duration: 1000 },

  // 24: Passo 4 - Registro do Cliente (Marcelo)
  { type: "typing_input", text: "Marcelo", duration: 700 },
  { type: "send_user", text: "Marcelo", time: "16:55" },
  { type: "bot_typing", label: "EnergivIA está digitando...", duration: 900 },
  { type: "send_bot", kind: "ask_phone", time: "16:55" },
  { type: "pause", duration: 1000 },
  { type: "typing_input", text: "(44) 99888-0000", duration: 900 },
  { type: "send_user", text: "(44) 99888-0000", time: "16:55" },
  { type: "bot_typing", label: "EnergivIA está digitando...", duration: 900 },
  { type: "send_bot", kind: "ask_template", time: "16:55" },
  { type: "pause", duration: 1000 },
  { type: "typing_input", text: "1", duration: 500 },
  { type: "send_user", text: "1", time: "16:55" },

  // 36: Passo 5 - Proposta Comercial Pronta
  { type: "bot_typing", label: "EnergivIA gerando proposta em PDF...", duration: 1600 },
  { type: "send_bot", kind: "final_proposal", time: "16:56" },
  { type: "pause", duration: 8000 },
];

const MILESTONES: Milestone[] = [
  {
    id: 0,
    title: "Início & Menu Interativo",
    tag: "Passo 1",
    description: "O cliente manda 'Boa tarde' e o bot apresenta as opções comerciais.",
    actionIndex: 0,
  },
  {
    id: 1,
    title: "Leitura da Fatura Copel",
    tag: "Passo 2",
    description: "Envio do PDF da fatura e extração por IA do consumo (257 kWh/mês) e telhado.",
    actionIndex: 10,
  },
  {
    id: 2,
    title: "Seleção do Kit Dynamis",
    tag: "Passo 3",
    description: "Cálculo da potência (3,15 kWp), preço do kit Dynamis e escolha do integrador.",
    actionIndex: 16,
  },
  {
    id: 3,
    title: "Dados do Cliente no CRM",
    tag: "Passo 4",
    description: "Coleta do nome (Marcelo), WhatsApp fictício e template desejado.",
    actionIndex: 24,
  },
  {
    id: 4,
    title: "Proposta Pronta com Link",
    tag: "Passo 5",
    description: "Entrega do link elegante da proposta pronto para enviar ao cliente.",
    actionIndex: 36,
  },
];

export function WhatsappFlowSimulator(): JSX.Element {
  const [actionIndex, setActionIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [inputDraft, setInputDraft] = useState<string>("");
  const [typingIndicator, setTypingIndicator] = useState<string | null>(null);

  // Computed messages based on the current actionIndex
  const messages = useMemo(() => {
    const list: MessageItem[] = [];
    for (let i = 0; i < actionIndex; i++) {
      const act = SCRIPT_ACTIONS[i];
      if (act.type === "send_user") {
        list.push({
          id: `u-${i}`,
          type: "user",
          text: act.text,
          time: act.time,
        });
      } else if (act.type === "send_user_doc") {
        list.push({
          id: `udoc-${i}`,
          type: "user_doc",
          title: act.title,
          subtitle: act.subtitle,
          time: act.time,
        });
      } else if (act.type === "send_bot") {
        list.push({
          id: `b-${i}`,
          type: "bot",
          kind: act.kind,
          time: act.time,
        });
      }
    }
    return list;
  }, [actionIndex]);

  // Determine current active milestone
  const activeMilestoneIndex = useMemo(() => {
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (actionIndex >= MILESTONES[i].actionIndex) {
        return i;
      }
    }
    return 0;
  }, [actionIndex]);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingIndicator]);

  // Main execution loop
  useEffect(() => {
    if (!isPlaying) return;

    if (actionIndex >= SCRIPT_ACTIONS.length) {
      // Loop back to start
      const loopTimeout = setTimeout(() => {
        setActionIndex(0);
        setInputDraft("");
        setTypingIndicator(null);
      }, 5000 / speed);
      return () => clearTimeout(loopTimeout);
    }

    const currentAction = SCRIPT_ACTIONS[actionIndex];

    if (currentAction.type === "typing_input") {
      setInputDraft(currentAction.text);
      const timer = setTimeout(() => {
        setActionIndex((prev) => prev + 1);
      }, currentAction.duration / speed);
      return () => clearTimeout(timer);
    }

    if (currentAction.type === "send_user") {
      setInputDraft("");
      // Advance immediately
      setActionIndex((prev) => prev + 1);
      return;
    }

    if (currentAction.type === "send_user_doc") {
      const timer = setTimeout(() => {
        setActionIndex((prev) => prev + 1);
      }, currentAction.duration / speed);
      return () => clearTimeout(timer);
    }

    if (currentAction.type === "bot_typing") {
      setTypingIndicator(currentAction.label);
      const timer = setTimeout(() => {
        setTypingIndicator(null);
        setActionIndex((prev) => prev + 1);
      }, currentAction.duration / speed);
      return () => clearTimeout(timer);
    }

    if (currentAction.type === "send_bot") {
      setTypingIndicator(null);
      setActionIndex((prev) => prev + 1);
      return;
    }

    if (currentAction.type === "pause") {
      const timer = setTimeout(() => {
        setActionIndex((prev) => prev + 1);
      }, currentAction.duration / speed);
      return () => clearTimeout(timer);
    }
  }, [actionIndex, isPlaying, speed]);

  const handleSelectMilestone = (milestoneIndex: number) => {
    const targetAction = MILESTONES[milestoneIndex].actionIndex;
    setActionIndex(targetAction);
    setInputDraft("");
    setTypingIndicator(null);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setActionIndex(0);
    setInputDraft("");
    setTypingIndicator(null);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 py-4">
      {/* SMARTPHONE MOCKUP */}
      <div className="relative w-full max-w-[360px] sm:max-w-[400px] select-none">
        {/* Ambient Glow */}
        <div className="absolute -inset-2 rounded-[52px] bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-sky-500/20 blur-xl -z-10 opacity-70 animate-pulse" />

        {/* Device Frame */}
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
              ref={chatScrollRef}
              className="relative flex-1 space-y-2.5 overflow-y-auto p-2.5 text-[11.5px] sm:text-xs scrollbar-thin scrollbar-thumb-slate-800"
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
              {messages.map((msg) => {
                if (msg.type === "user") {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300"
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
                      className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300"
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
                    className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300"
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
              {typingIndicator && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1 animate-in fade-in duration-200">
                  <div className="flex gap-1 rounded-full bg-[#202c33] px-3 py-2 border border-slate-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-[10.5px] text-slate-400 animate-pulse">
                    {typingIndicator}
                  </span>
                </div>
              )}
            </div>

            {/* Simulated WhatsApp Chat Input Bar */}
            <div className="relative z-20 flex items-center gap-2 bg-[#1f2c34] px-3 py-2 border-t border-slate-800 text-slate-400">
              <div className="flex-1 min-h-[34px] flex items-center rounded-full bg-[#2a3942] px-3.5 py-1 text-xs">
                {inputDraft ? (
                  <span className="text-white font-medium flex items-center gap-0.5">
                    {inputDraft}
                    <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-pulse" />
                  </span>
                ) : (
                  <span className="text-slate-400">Mensagem...</span>
                )}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 transition">
                {inputDraft ? (
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

        {/* Stories-like Progress Bars */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {MILESTONES.map((m, idx) => {
            const isCurrent = activeMilestoneIndex === idx;
            const isCompleted = activeMilestoneIndex > idx;
            return (
              <div key={m.id} className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-300"
                    style={{
                      width: isCompleted ? "100%" : isCurrent ? "60%" : "0%",
                    }}
                  />
                </div>
                <p
                  className={`text-[10px] font-semibold text-center truncate transition ${
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
                className={`w-full text-left rounded-2xl border p-3 transition-all ${
                  isCurrent
                    ? "border-emerald-500/50 bg-gradient-to-r from-slate-900 to-slate-800/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                        isCurrent
                          ? "bg-emerald-400 text-slate-950 shadow-sm"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-semibold ${
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
