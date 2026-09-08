"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCheck,
  Download,
  ExternalLink,
  FileText,
  MoreVertical,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Video,
  Zap,
} from "lucide-react";

interface Step {
  id: number;
  title: string;
  tag: string;
  durationMs: number;
  description: string;
}

const STEPS: Step[] = [
  {
    id: 0,
    title: "Envio da Fatura",
    tag: "Passo 1",
    durationMs: 3800,
    description:
      "O integrador ou cliente envia o PDF ou foto da conta de luz direto pelo WhatsApp.",
  },
  {
    id: 1,
    title: "Leitura por IA",
    tag: "Passo 2",
    durationMs: 4000,
    description:
      "A IA da EnergivIA faz o OCR e extrai cliente, concessionária, consumo e tarifas em segundos.",
  },
  {
    id: 2,
    title: "Dimensionamento",
    tag: "Passo 3",
    durationMs: 4500,
    description:
      "Cálculo solar automático: potência ideal, módulos, inversor, economia e payback estimado.",
  },
  {
    id: 3,
    title: "Proposta Pronta",
    tag: "Passo 4",
    durationMs: 4800,
    description:
      "O PDF completo da proposta comercial é gerado e entregue no chat, pronto para fechar.",
  },
];

export function WhatsappFlowSimulator(): JSX.Element {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-advance steps
  useEffect(() => {
    if (!isPlaying) return;

    const currentDuration = STEPS[currentStep].durationMs / speed;
    const intervalMs = 40;
    const stepIncrement = (intervalMs / currentDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentStep((curr) => (curr + 1) % STEPS.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentStep, speed]);

  // Smooth scroll chat to bottom when step changes
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [currentStep]);

  const handleSelectStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setProgress(0);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 py-4">
      {/* PHONE MOCKUP CONTAINER */}
      <div className="relative w-full max-w-[340px] sm:max-w-[380px] select-none">
        {/* Ambient Glow */}
        <div className="absolute -inset-2 rounded-[52px] bg-gradient-to-r from-emerald-500/25 via-teal-500/15 to-sky-500/25 blur-xl -z-10 opacity-70 animate-pulse" />

        {/* Smartphone Shell */}
        <div className="relative rounded-[46px] border-[7px] border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-black/80 ring-1 ring-slate-700/50">
          {/* Inner Screen */}
          <div className="relative flex h-[580px] sm:h-[620px] w-full flex-col overflow-hidden rounded-[36px] bg-[#0b141a] text-slate-100 font-sans">
            {/* Top Speaker / Dynamic Island */}
            <div className="relative z-30 flex items-center justify-between bg-[#202c33] px-6 pt-2 pb-1.5 text-[11px] text-slate-300 font-medium">
              <span>09:41</span>
              <div className="h-4 w-20 rounded-full bg-black/60 shadow-inner" />
              <div className="flex items-center gap-1.5 text-[10px]">
                <span>5G</span>
                <div className="h-2 w-4 rounded-sm border border-slate-400 p-[1px]">
                  <div className="h-full w-3/4 rounded-[1px] bg-emerald-400" />
                </div>
              </div>
            </div>

            {/* WhatsApp Header */}
            <div className="relative z-20 flex items-center justify-between border-b border-slate-800 bg-[#202c33] px-3 py-2.5 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 font-bold text-slate-950 shadow-md">
                    <Zap className="h-5 w-5 fill-slate-950 text-slate-950" />
                  </div>
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#202c33] bg-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-100">EnergivIA Bot</span>
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-slate-950">
                      ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    online • IA Ativa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400 pr-1">
                <Video className="h-4 w-4 hover:text-slate-200 cursor-pointer" />
                <Phone className="h-4 w-4 hover:text-slate-200 cursor-pointer" />
                <MoreVertical className="h-4 w-4 hover:text-slate-200 cursor-pointer" />
              </div>
            </div>

            {/* Chat Area with WhatsApp Pattern Texture */}
            <div
              ref={chatScrollRef}
              className="relative flex-1 space-y-3 overflow-y-auto p-3 text-xs sm:text-[13px] scrollbar-thin scrollbar-thumb-slate-800"
              style={{
                backgroundImage: `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: "16px 16px",
              }}
            >
              {/* Encryption Notice */}
              <div className="mx-auto my-1 max-w-[260px] rounded-lg bg-[#182229] px-2.5 py-1.5 text-center text-[10px] text-amber-300/80 shadow-sm border border-amber-500/10">
                🔒 As mensagens e propostas desta conversa são processadas com IA segura.
              </div>

              {/* MESSAGE 1: Customer / Integrator sends Electricity Bill */}
              <div className="flex justify-end transition-all duration-300">
                <div className="relative max-w-[85%] rounded-2xl rounded-tr-none bg-[#005c4b] p-2.5 text-slate-100 shadow-md">
                  {/* Bill Attachment Preview */}
                  <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-slate-900/60 p-2 border border-emerald-500/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-xs text-white">
                        Fatura_Copel_Carlos.pdf
                      </p>
                      <p className="text-[10px] text-slate-300">1 página • 385 KB</p>
                    </div>
                  </div>

                  <p className="leading-snug">
                    Olá! Dá uma olhada nessa conta para o cliente <b>Carlos Eduardo</b> e gera uma
                    simulação solar pra mim? ⚡
                  </p>

                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-200/80">
                    <span>14:20</span>
                    <CheckCheck className="h-3.5 w-3.5 text-sky-300" />
                  </div>
                </div>
              </div>

              {/* TYPING INDICATOR OR STEP 2+ */}
              {currentStep === 0 && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                  <div className="flex gap-1 rounded-full bg-[#202c33] px-3 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-[11px] text-slate-400 animate-pulse">
                    EnergivIA lendo fatura...
                  </span>
                </div>
              )}

              {/* MESSAGE 2: AI OCR Recognition (Step 1+) */}
              {currentStep >= 1 && (
                <div className="flex justify-start transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                  <div className="relative max-w-[88%] rounded-2xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow-md border border-slate-700/60">
                    <div className="mb-1.5 flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Fatura analisada com sucesso!</span>
                    </div>

                    <div className="space-y-1 rounded-lg bg-slate-950/60 p-2 text-[11px] text-slate-300 border border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cliente:</span>
                        <span className="font-semibold text-white">Carlos Eduardo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Distribuidora:</span>
                        <span className="font-semibold text-white">COPEL (PR)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Consumo Médio:</span>
                        <span className="font-bold text-amber-300">680 kWh/mês</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gasto Atual:</span>
                        <span className="font-semibold text-rose-300">R$ 678,50/mês</span>
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center justify-end text-[10px] text-slate-400">
                      <span>14:20</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MESSAGE 3: Solar Simulation & Kit (Step 2+) */}
              {currentStep >= 2 && (
                <div className="flex justify-start transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                  <div className="relative max-w-[88%] rounded-2xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow-md border border-slate-700/60">
                    <div className="mb-1.5 flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                      <Sun className="h-3.5 w-3.5" />
                      <span>Dimensionamento Fotovoltaico</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2">
                      <div className="rounded-lg bg-slate-900/80 p-1.5 border border-slate-800">
                        <p className="text-slate-400">Potência Recomendada</p>
                        <p className="text-sm font-bold text-emerald-400">5,45 kWp</p>
                        <p className="text-[9px] text-slate-500">9 módulos de 605W</p>
                      </div>
                      <div className="rounded-lg bg-slate-900/80 p-1.5 border border-slate-800">
                        <p className="text-slate-400">Geração Média</p>
                        <p className="text-sm font-bold text-sky-400">720 kWh</p>
                        <p className="text-[9px] text-slate-500">Sobram ~40 kWh/mês</p>
                      </div>
                      <div className="rounded-lg bg-slate-900/80 p-1.5 border border-slate-800">
                        <p className="text-slate-400">Economia Anual</p>
                        <p className="text-xs font-bold text-emerald-300">R$ 7.200,00</p>
                      </div>
                      <div className="rounded-lg bg-slate-900/80 p-1.5 border border-slate-800">
                        <p className="text-slate-400">Payback Estimado</p>
                        <p className="text-xs font-bold text-teal-300">3,2 anos</p>
                      </div>
                    </div>

                    {/* WhatsApp Action Buttons */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 py-1.5 text-emerald-300 font-medium text-[11px] border border-emerald-500/40">
                        <Zap className="h-3 w-3" />
                        <span>Kit Edeltec Selecionado</span>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-end text-[10px] text-slate-400">
                      <span>14:21</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MESSAGE 4: Finished PDF Proposal Delivered (Step 3) */}
              {currentStep >= 3 && (
                <div className="flex justify-start transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                  <div className="relative max-w-[88%] rounded-2xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow-md border border-emerald-500/40">
                    <p className="text-[11px] text-slate-200 mb-2 font-medium">
                      Aqui está sua proposta pronta com sua logo, dados técnicos e simulação
                      financeira! 📄✨
                    </p>

                    {/* Proposal Download Card */}
                    <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 p-2.5 border border-emerald-500/40 shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-bold">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">
                          Proposta_Carlos_Eduardo.pdf
                        </p>
                        <p className="text-[10px] text-emerald-400">
                          8 páginas • Pronta para envio
                        </p>
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <Download className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* Interactive Button */}
                    <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-1.5 text-slate-950 font-bold text-xs shadow-md">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Visualizar Proposta</span>
                    </div>

                    <div className="mt-1 flex items-center justify-end text-[10px] text-slate-400">
                      <span>14:21 • Tempo total: 48s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Fake Input Footer */}
            <div className="relative z-20 flex items-center gap-2 bg-[#202c33] px-3 py-2 border-t border-slate-800 text-slate-400">
              <div className="flex-1 rounded-full bg-[#2a3942] px-3.5 py-1.5 text-xs text-slate-400">
                Mensagem...
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                <Zap className="h-4 w-4 fill-slate-950" />
              </div>
            </div>
          </div>
        </div>

        {/* Video Player Floating Controls */}
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
              title="Reiniciar animação"
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
            <Sparkles className="h-3 w-3" /> Demonstração Interativa
          </span>
          <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
            Do envio da fatura à proposta em menos de 1 minuto
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Veja como seus vendedores e integradores usam o WhatsApp no dia a dia sem precisar abrir
            planilhas complexas ou softwares pesados.
          </p>
        </div>

        {/* Stories-like Progress Bars */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {STEPS.map((step, idx) => {
            const isCurrent = currentStep === idx;
            const isCompleted = currentStep > idx;
            return (
              <div key={step.id} className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all"
                    style={{
                      width: isCompleted ? "100%" : isCurrent ? `${progress}%` : "0%",
                      transitionDuration: isCurrent ? "40ms" : "200ms",
                    }}
                  />
                </div>
                <p
                  className={`text-[11px] font-semibold text-center transition ${
                    isCurrent ? "text-emerald-400 font-bold" : "text-slate-400"
                  }`}
                >
                  {step.tag}
                </p>
              </div>
            );
          })}
        </div>

        {/* Clickable Step Cards */}
        <div className="space-y-2.5">
          {STEPS.map((step, idx) => {
            const isCurrent = currentStep === idx;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleSelectStep(idx)}
                className={`w-full text-left rounded-2xl border p-3.5 transition-all ${
                  isCurrent
                    ? "border-emerald-500/50 bg-gradient-to-r from-slate-900 to-slate-800/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isCurrent
                          ? "bg-emerald-400 text-slate-950 shadow-sm"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        isCurrent ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Em execução
                    </span>
                  )}
                </div>

                <p className="mt-1.5 pl-8 text-xs text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Key Metrics / Highlights */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-center">
          <div>
            <p className="text-lg font-bold text-white">48s</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tempo Médio</p>
          </div>
          <div className="border-x border-slate-800">
            <p className="text-lg font-bold text-emerald-400">100%</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Via WhatsApp</p>
          </div>
          <div>
            <p className="text-lg font-bold text-sky-400">+3x</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Mais Vendas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
