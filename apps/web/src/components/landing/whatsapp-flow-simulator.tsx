"use client";

import { useEffect, useRef, useState } from "react";
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
  Sparkles,
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
    title: "Início & Envio da Conta",
    tag: "Passo 1",
    durationMs: 4200,
    description: "O integrador inicia a conversa e envia a fatura em PDF direto pelo WhatsApp.",
  },
  {
    id: 1,
    title: "Leitura OCR & Telhado",
    tag: "Passo 2",
    durationMs: 4400,
    description:
      "A IA extrai o consumo (257 kWh/mês), tensão e pergunta o tipo de estrutura do telhado.",
  },
  {
    id: 2,
    title: "Seleção do Kit Dynamis",
    tag: "Passo 3",
    durationMs: 4200,
    description:
      "Apresenta o kit ideal do distribuidor Dynamis com potência de 3,15 kWp e preço final.",
  },
  {
    id: 3,
    title: "Registro no CRM",
    tag: "Passo 4",
    durationMs: 4000,
    description:
      "Registra os dados do cliente (Marcelo) e seleciona o modelo de proposta desejado.",
  },
  {
    id: 4,
    title: "Proposta Pronta com Link",
    tag: "Passo 5",
    durationMs: 4800,
    description: "Gera a proposta comercial com link limpo e exclusivo, integrada ao painel CRM.",
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
      <div className="relative w-full max-w-[360px] sm:max-w-[400px] select-none">
        {/* Ambient Glow */}
        <div className="absolute -inset-2 rounded-[52px] bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-sky-500/20 blur-xl -z-10 opacity-70 animate-pulse" />

        {/* Smartphone Shell */}
        <div className="relative rounded-[46px] border-[7px] border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-black/80 ring-1 ring-slate-700/50">
          {/* Inner Screen */}
          <div className="relative flex h-[600px] sm:h-[640px] w-full flex-col overflow-hidden rounded-[36px] bg-[#0b141a] text-slate-100 font-sans">
            {/* Top Speaker / Status Bar */}
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

            {/* WhatsApp Header matching real screenshot */}
            <div className="relative z-20 flex items-center justify-between border-b border-slate-800 bg-[#1f2c34] px-3 py-2.5 shadow-md">
              <div className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 text-slate-300 cursor-pointer" />
                <div className="relative">
                  {/* Robot Avatar from real app */}
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

            {/* Chat Messages Container */}
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

              {/* STEP 0: Initial Greeting & Menu */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-tr-none bg-[#005c4b] p-2 text-slate-100 shadow">
                  <p>Boa tarde</p>
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                    <span>16:53</span>
                    <CheckCheck className="h-3 w-3 text-sky-300" />
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[92%] rounded-xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow border border-slate-800">
                  <p className="leading-snug">
                    Boa tarde Giovani! Tudo bem? ☀️
                    <br />
                    Sou seu assistente de vendas e dimensionamento da <b>EnergivIA</b>.
                  </p>
                  <p className="mt-1.5 leading-snug">
                    Como posso ajudar você a gerar orçamentos e propostas para seus clientes hoje?
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
                  <div className="mt-1 flex justify-end text-[9px] text-slate-400">
                    <span>16:53</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="rounded-xl rounded-tr-none bg-[#005c4b] px-3 py-1.5 text-slate-100 shadow">
                  <span>1</span>
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                    <span>16:54</span>
                    <CheckCheck className="h-3 w-3 text-sky-300" />
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-xl rounded-tl-none bg-[#202c33] p-2 text-slate-200 shadow border border-slate-800">
                  <p className="leading-snug">
                    Perfeito! 📄 Envie o arquivo em <b>PDF</b> ou a <b>foto da conta de luz</b> do
                    seu cliente por aqui mesmo.
                  </p>
                  <p className="mt-1 text-[10.5px] text-slate-300">
                    Nossa inteligência artificial vai extrair automaticamente todos os dados de
                    consumo e histórico!
                  </p>
                  <div className="mt-1 flex justify-end text-[9px] text-slate-400">
                    <span>16:54</span>
                  </div>
                </div>
              </div>

              {/* STEP 1+: User sends Copel bill & AI extracts */}
              {currentStep >= 1 && (
                <>
                  <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="max-w-[85%] rounded-xl rounded-tr-none bg-[#005c4b] p-2 text-slate-100 shadow">
                      {/* Document Card */}
                      <div className="flex items-center gap-2 rounded-lg bg-slate-950/70 p-1.5 border border-emerald-500/30">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 font-bold text-[10px]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-white text-[11px]">
                            SegundaViaCopel.pdf
                          </p>
                          <p className="text-[9px] text-slate-300">1 página • 524 kB • PDF</p>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                        <span>16:54</span>
                        <CheckCheck className="h-3 w-3 text-sky-300" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="max-w-[92%] rounded-xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow border border-slate-800">
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
                      <div className="mt-1 flex justify-end text-[9px] text-slate-400">
                        <span>16:54</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-xl rounded-tr-none bg-[#005c4b] px-3 py-1 text-slate-100 shadow">
                      <span>2</span>
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                        <span>16:54</span>
                        <CheckCheck className="h-3 w-3 text-sky-300" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2+: Kit Dynamis Display (Cleaned & Polished as requested) */}
              {currentStep >= 2 && (
                <>
                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="max-w-[92%] rounded-xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow border border-slate-800">
                      <p className="leading-snug">
                        Excelente! Seguem as melhores opções de kits dimensionados para o consumo de{" "}
                        <b>257 kWh/mês</b>:
                      </p>

                      {/* Clean Kit Card - Distributor, Final Price & Consumption */}
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
                            <span className="text-slate-400 block text-[9px]">Geração Média:</span>
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

                      <div className="mt-1 flex justify-end text-[9px] text-slate-400">
                        <span>16:54</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-xl rounded-tr-none bg-[#005c4b] px-3 py-1 text-slate-100 shadow">
                      <span>1</span>
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                        <span>16:55</span>
                        <CheckCheck className="h-3 w-3 text-sky-300" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="max-w-[90%] rounded-xl rounded-tl-none bg-[#202c33] p-2 text-slate-200 shadow border border-slate-800">
                      <p className="leading-snug">Ótima escolha! Kit selecionado com sucesso. ☀️</p>
                      <p className="mt-1 text-[11px] text-slate-300">
                        Qual o nome do cliente final para registrarmos no seu CRM?
                      </p>
                      <div className="mt-1 flex justify-end text-[9px] text-slate-400">
                        <span>16:55</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-xl rounded-tr-none bg-[#005c4b] px-2.5 py-1 text-slate-100 shadow">
                      <span>Marcelo</span>
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                        <span>16:55</span>
                        <CheckCheck className="h-3 w-3 text-sky-300" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 3+: Phone number (fake number) & Template selection */}
              {currentStep >= 3 && (
                <>
                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="max-w-[90%] rounded-xl rounded-tl-none bg-[#202c33] p-2 text-slate-200 shadow border border-slate-800">
                      <p className="leading-snug">
                        Certo, vou registrar o cliente Marcelo. E qual o WhatsApp dele com DDD?
                      </p>
                      <div className="mt-1 flex justify-end text-[9px] text-slate-400">
                        <span>16:55</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-xl rounded-tr-none bg-[#005c4b] px-2.5 py-1 text-slate-100 shadow">
                      <span>(44) 99888-0000</span>
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                        <span>16:55</span>
                        <CheckCheck className="h-3 w-3 text-sky-300" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="max-w-[92%] rounded-xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow border border-slate-800">
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
                      <div className="mt-1 flex justify-end text-[9px] text-slate-400">
                        <span>16:55</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-xl rounded-tr-none bg-[#005c4b] px-3 py-1 text-slate-100 shadow">
                      <span>1</span>
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                        <span>16:55</span>
                        <CheckCheck className="h-3 w-3 text-sky-300" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 4: Finished Proposal with Clean & Beautiful Link */}
              {currentStep >= 4 && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="max-w-[95%] rounded-xl rounded-tl-none bg-[#202c33] p-2.5 text-slate-200 shadow border border-emerald-500/40">
                    <p className="leading-snug">
                      Perfeito! Proposta comercial gerada com sucesso para o cliente <b>Marcelo</b>!
                      📋✅
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

                    {/* Proposal Elegant Link & Card */}
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
                      Ela já está disponível no seu painel CRM da EnergivIA. Posso te ajudar com
                      mais algum orçamento hoje?
                    </p>

                    <div className="mt-1.5 flex justify-end text-[9px] text-slate-400">
                      <span>16:56 • Concluído em 1 min</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fake WhatsApp Chat Input Bar */}
            <div className="relative z-20 flex items-center gap-2 bg-[#1f2c34] px-3 py-2 border-t border-slate-800 text-slate-400">
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
            <Sparkles className="h-3 w-3" /> Fluxo Real via WhatsApp
          </span>
          <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
            Veja a EnergivIA operando na prática
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Envie a conta de luz pelo chat do WhatsApp e deixe nossa inteligência artificial cuidar
            da extração, cálculo solar, seleção de distribuidor e envio da proposta.
          </p>
        </div>

        {/* Stories-like Progress Bars */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
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
                  className={`text-[10px] font-semibold text-center truncate transition ${
                    isCurrent ? "text-emerald-400 font-bold" : "text-slate-500"
                  }`}
                >
                  {step.tag}
                </p>
              </div>
            );
          })}
        </div>

        {/* Clickable Step Cards */}
        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const isCurrent = currentStep === idx;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleSelectStep(idx)}
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
                      {step.title}
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Em foco
                    </span>
                  )}
                </div>

                <p className="mt-1 pl-7 text-[11px] text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Key Metrics / Highlights */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-center">
          <div>
            <p className="text-lg font-bold text-white">~1 min</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tempo Médio</p>
          </div>
          <div className="border-x border-slate-800">
            <p className="text-lg font-bold text-emerald-400">100%</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">No WhatsApp</p>
          </div>
          <div>
            <p className="text-lg font-bold text-sky-400">Dynamis</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Kits Integrados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
