"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/components/providers/organization-provider";
import { createOrganization, uploadOrganizationLogo } from "@/lib/organizations-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Step,
  StepConnector,
  stepConnectorClasses,
  StepLabel,
  Stepper,
  styled,
} from "@mui/material";
import type { StepIconProps } from "@mui/material/StepIcon";
import {
  Building2,
  FileText,
  Zap,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  CreditCard,
  House,
  Building,
  Factory,
  Leaf,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

const steps = ["Empresa", "Propostas Inteligentes"];
const businessSegmentOptions = [
  {
    id: "residencial",
    label: "Residencial",
    description: "Clientes de casas e pequeno consumo.",
    icon: House,
  },
  {
    id: "comercial",
    label: "Comercial",
    description: "Empresas, lojas e escritórios.",
    icon: Building,
  },
  {
    id: "industrial",
    label: "Industrial",
    description: "Projetos de alta demanda e maior ticket.",
    icon: Factory,
  },
  {
    id: "rural",
    label: "Rural",
    description: "Fazendas e propriedades rurais.",
    icon: Leaf,
  },
] as const;

function segmentIdToLabel(segmentId: string): string {
  const opt = businessSegmentOptions.find((o) => o.id === segmentId);
  return opt?.label ?? segmentId;
}

const communicationToneOptions = [
  {
    id: "comercial",
    label: "Comercial",
    description: "Focado em economia e decisão rápida",
    icon: Building2,
  },
  {
    id: "consultivo",
    label: "Consultivo",
    description: "Explica melhor os benefícios e aumenta a confiança",
    icon: Sparkles,
  },
  {
    id: "tecnico",
    label: "Técnico",
    description: "Mais detalhado para clientes exigentes",
    icon: FileText,
  },
] as const;

const OnboardingConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 15,
    left: "calc(-50% + 20px)",
    right: "calc(50% + 20px)",
  },
  [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: {
    borderColor: "#0f4966",
    background: "linear-gradient(90deg, #0f4966 0%, #0f6b86 55%, #22c7b2 100%)",
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: {
    borderColor: "#0f4966",
    background: "linear-gradient(90deg, #0f4966 0%, #0f6b86 55%, #22c7b2 100%)",
  },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: theme.palette.mode === "dark" ? "#334155" : "#d4d4d8",
    borderTopWidth: 0,
    background: theme.palette.mode === "dark" ? "#334155" : "#d4d4d8",
    height: 3,
    borderRadius: 999,
  },
}));

function OnboardingStepIcon(props: StepIconProps): JSX.Element {
  const { active, className, icon } = props;
  const map: Record<string, JSX.Element> = {
    "1": <Building2 className="h-3.5 w-3.5" />,
    "2": <FileText className="h-3.5 w-3.5" />,
  };
  const isOnPath = active || Number(icon) < 2;
  return (
    <div
      className={[
        "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
        isOnPath
          ? "bg-[linear-gradient(135deg,#1b5e7c_0%,#1f7f9b_55%,#39d3bf_100%)] text-white shadow-[0_6px_16px_rgba(31,127,155,0.2)]"
          : "bg-white text-zinc-500 shadow-[inset_0_0_0_2px_#d4d4d8]",
        className ?? "",
      ].join(" ")}
    >
      {map[String(icon)] ?? <Building2 className="h-4 w-4" />}
    </div>
  );
}

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { setCurrentOrganizationId, refetch, loading: ctxLoading } = useOrganization();
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [templateValueProposition, setTemplateValueProposition] = useState("");
  const [templateTone, setTemplateTone] = useState("Comercial");
  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const segmentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const previousColorScheme = root.style.colorScheme;
    if (hadDark) {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    root.style.colorScheme = "light";
    return () => {
      if (hadDark) {
        root.classList.remove("light");
        root.classList.add("dark");
      }
      root.style.colorScheme = previousColorScheme;
    };
  }, []);

  useEffect(() => {
    if (step === 1) {
      nameRef.current?.focus();
      return;
    }
    segmentRef.current?.focus();
  }, [step]);

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const finalizeOnboarding = async (skipTemplateStep: boolean) => {
    const selectedSegmentsSnapshot = [...selectedSegments];
    if (!skipTemplateStep && selectedSegmentsSnapshot.length === 0) {
      setError("Selecione pelo menos um segmento para gerar suas propostas.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const organization = await createOrganization({
        name: name.trim(),
        logoUrl: logoUrl || undefined,
        cnpj: cnpj.trim() || undefined,
        ...(skipTemplateStep
          ? {}
          : {
              templateBusinessSegment:
                selectedSegmentsSnapshot.length > 0
                  ? selectedSegmentsSnapshot.map(segmentIdToLabel).join(", ")
                  : undefined,
              templateValueProposition: templateValueProposition.trim() || undefined,
              templateTone: templateTone.trim() || undefined,
            }),
      });
      setCurrentOrganizationId(organization.id);
      await refetch();
      router.replace("/painel");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar empresa");
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (!name.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }
    if (cnpj.replace(/\D/g, "").length !== 14) {
      setError("Informe um CNPJ válido com 14 dígitos.");
      return;
    }
    setError(null);
    setDirection(1);
    setStep(2);
  };

  const goBack = () => {
    setError(null);
    setDirection(-1);
    setStep(1);
  };

  const handleLogoUpload = async (file: File) => {
    setError(null);
    setLogoError(null);
    setIsUploadingLogo(true);
    try {
      const uploadedLogoUrl = await uploadOrganizationLogo(file);
      setLogoUrl(uploadedLogoUrl);
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Falha ao enviar logo da empresa");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (ctxLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <LoadingState label="Carregando contexto da empresa" compact />
      </div>
    );
  }

  return (
    <section className="relative flex h-screen flex-col overflow-hidden bg-[var(--color-background)]">
      <div className="relative flex h-full w-full flex-1 flex-col lg:flex-row">
        <aside className="hidden h-full w-[420px] flex-col border-r border-white/10 bg-[linear-gradient(135deg,#08324F_0%,#0A4A63_45%,#0FD3B4_115%)] px-8 py-10 lg:flex">
          <div className="flex-1 flex flex-col justify-center">
            <Image
              src="/logo-dark.png"
              alt="EnergivIA"
              width={300}
              height={62}
              className="h-auto w-[300px]"
              priority
            />
            <h2 className="mt-6 text-[30px] font-semibold leading-[1.12] tracking-tight text-white">
              Você está a poucos passos de automatizar suas propostas
            </h2>
            <p className="mt-3 max-w-[330px] text-[15px] italic font-normal leading-relaxed text-white/90">
              Comece com o básico e personalize templates de proposta para acelerar suas
              negociações.
            </p>

            <ul className="mt-8 space-y-5">
              <li className="flex items-center gap-4 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <Zap className="relative z-10 h-4 w-4 text-white" />
                </span>
                <p className="text-sm font-medium text-white/90">
                  Gere propostas completas a partir da conta de luz.
                </p>
              </li>
              <li className="flex items-center gap-4 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <Sparkles className="relative z-10 h-4 w-4 text-white" />
                </span>
                <p className="text-sm font-medium text-white/90">
                  Templates prontos para fechar mais vendas.
                </p>
              </li>
              <li className="flex items-center gap-4 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <ShieldCheck className="relative z-10 h-4 w-4 text-white" />
                </span>
                <p className="text-sm font-medium text-white/90">
                  Simulação automática de ROI e payback.
                </p>
              </li>
              <li className="flex items-center gap-4 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <CreditCard className="relative z-10 h-4 w-4 text-white" />
                </span>
                <p className="text-sm font-medium text-white/90">
                  Financiamento facilitado com poucos cliques.
                </p>
              </li>
              <li className="flex items-center gap-4 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <FaWhatsapp className="relative z-10 h-4 w-4 text-white" />
                </span>
                <p className="text-sm font-medium text-white/90">
                  Gerencie suas propostas e leads direto pelo WhatsApp com IA.
                </p>
              </li>
            </ul>
          </div>

          <div className="relative mt-auto overflow-hidden rounded-2xl border border-white/15 bg-white/12 px-4 py-3">
            <span className="pointer-events-none absolute inset-0 bg-white/10" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex items-center">
                {["RK", "MT", "EK", "RT"].map((letter, idx) => (
                  <span
                    key={`${letter}-${idx}`}
                    className={`relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-sky-200/28 bg-sky-900/30 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(8,50,79,0.25)] ${
                      idx > 0 ? "-ml-1.5" : ""
                    }`}
                  >
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.24),transparent_58%)]" />
                    <span className="relative z-10">{letter}</span>
                  </span>
                ))}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-medium text-white/90">
                  +500 integradores solares já usam a EnergivIA para fechar mais projetos
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex h-full w-full items-start justify-center overflow-y-auto px-4 py-5 sm:px-6 lg:flex-1 lg:justify-center lg:px-12 lg:py-5">
          <div className="w-full max-w-md lg:max-w-[640px]">
            <div className="mb-6 text-center lg:hidden">
              <h2 className="text-2xl font-semibold tracking-tight">
                Configure sua empresa em poucos passos
              </h2>
              <p className="mt-2 text-sm font-medium text-[var(--color-muted-foreground)]">
                Você pode pular a segunda etapa e concluir agora.
              </p>
            </div>

            <div className="mb-5 px-2">
              <Stepper alternativeLabel activeStep={step - 1} connector={<OnboardingConnector />}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel
                      slots={{ stepIcon: OnboardingStepIcon }}
                      sx={{
                        "& .MuiStepLabel-label": {
                          marginTop: "8px",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          color: "#777777",
                        },
                        "& .MuiStepLabel-label.Mui-active": {
                          color: "#777777",
                          fontWeight: 600,
                        },
                        "& .MuiStepLabel-label.Mui-completed": {
                          color: "#777777",
                          fontWeight: 600,
                        },
                      }}
                    >
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </div>

            <div className="space-y-1.5 px-2 pb-3 text-center">
              <h1 className="text-[23px] font-bold tracking-tight text-[#0A4A63] lg:text-[24px]">
                Deixe suas propostas prontas para fechar mais vendas
              </h1>
              <p className="mx-auto max-w-[560px] text-[13px] font-medium leading-relaxed text-[var(--color-muted-foreground)]">
                {step === 1
                  ? "Leva menos de 1 minuto. Depois disso, já criamos seus primeiros templates automaticamente."
                  : "Agora vamos personalizar suas propostas para o seu tipo de cliente."}
              </p>
            </div>

            <div className="px-2">
              <div className="relative min-h-[460px] overflow-x-hidden overflow-y-visible lg:min-h-[420px]">
                <div
                  className={`transition-all duration-300 ${
                    step === 1
                      ? "relative pointer-events-auto visible translate-x-0 opacity-100"
                      : direction > 0
                        ? "absolute inset-0 pointer-events-none invisible -translate-x-6 opacity-0"
                        : "absolute inset-0 pointer-events-none invisible translate-x-6 opacity-0"
                  }`}
                  aria-hidden={step !== 1}
                >
                  <div className="space-y-2.5 pt-1.5">
                    <Input
                      ref={nameRef}
                      label="Nome da empresa *"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Integradora Solar Prime"
                      required
                      className="w-full"
                      startAdornment={
                        <Building2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      }
                      endAdornment={
                        name.trim() ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null
                      }
                    />
                    <Input
                      label="CNPJ *"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      className="w-full font-mono text-sm"
                      required
                      startAdornment={
                        <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      }
                      endAdornment={
                        cnpj.replace(/\D/g, "").length === 14 ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : null
                      }
                    />
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/70 p-3">
                      <p className="text-xs font-semibold text-[var(--color-foreground)]">
                        Dica rápida
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        Adicionar seu logo agora deixa suas propostas mais profissionais e aumenta a
                        confiança do cliente.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <ImageDropzone
                        label="Logo da empresa"
                        size="large"
                        value={logoUrl}
                        onSelectFile={handleLogoUpload}
                        onClear={() => setLogoUrl("")}
                        isUploading={isUploadingLogo}
                        disabled={loading || isUploadingLogo}
                        accept="image/jpeg,image/png,image/webp"
                        emptyPlaceholder="Arraste ou clique para adicionar sua logo"
                        emptyDescription={
                          <>
                            <span className="font-semibold text-[var(--color-foreground)]">
                              Suas propostas já sairão com a identidade da sua empresa.
                            </span>{" "}
                            <br />
                            Formatos aceitos: JPG, PNG, WEBP.
                          </>
                        }
                        errorMessage={logoError}
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full bg-[linear-gradient(90deg,#1b5e7c_0%,#1f7f9b_55%,#39d3bf_100%)] text-white shadow-[0_8px_18px_rgba(31,127,155,0.22)] hover:opacity-95"
                      disabled={loading || isUploadingLogo}
                      onClick={goNext}
                    >
                      Continuar
                    </Button>

                    <p className="text-center text-sm font-medium text-[var(--color-muted-foreground)]">
                      <span className="inline-block whitespace-nowrap">
                        Precisa de ajuda?{" "}
                        <a
                          href="https://wa.me/554388437202"
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#0A4A63] hover:underline"
                        >
                          Entre em contato
                        </a>
                      </span>
                    </p>
                  </div>
                </div>

                <div
                  className={`transition-all duration-300 ${
                    step === 2
                      ? "relative pointer-events-auto visible translate-x-0 opacity-100"
                      : direction > 0
                        ? "absolute inset-0 pointer-events-none invisible translate-x-6 opacity-0"
                        : "absolute inset-0 pointer-events-none invisible -translate-x-6 opacity-0"
                  }`}
                  aria-hidden={step !== 2}
                >
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white p-3">
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        Segmentos de atuação
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {businessSegmentOptions.map((option, index) => {
                          const Icon = option.icon;
                          const isSelected = selectedSegments.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              ref={index === 0 ? segmentRef : undefined}
                              type="button"
                              onClick={() =>
                                setSelectedSegments((prev) =>
                                  prev.includes(option.id)
                                    ? prev.filter((item) => item !== option.id)
                                    : [...prev, option.id]
                                )
                              }
                              className={`group flex min-h-[92px] w-full flex-col rounded-xl border p-3.5 text-left transition ${
                                isSelected
                                  ? "border-[#1f7f9b] bg-[#1f7f9b]/10 shadow-[0_8px_18px_rgba(31,127,155,0.14)]"
                                  : "border-zinc-200 bg-white hover:border-zinc-300"
                              }`}
                              aria-pressed={isSelected}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                  <span
                                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                      isSelected
                                        ? "bg-[linear-gradient(135deg,#1b5e7c_0%,#1f7f9b_55%,#39d3bf_100%)] text-white"
                                        : "bg-zinc-100 text-zinc-600"
                                    }`}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-zinc-800">
                                      {option.label}
                                    </p>
                                    <p className="mt-0.5 text-xs text-zinc-600">
                                      {option.description}
                                    </p>
                                  </div>
                                </div>
                                {isSelected ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1f7f9b]" />
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Selecione uma ou mais opções para personalizar seus templates.
                      </p>
                      <p className="rounded-md bg-[#1f7f9b]/10 px-2 py-1 text-xs font-semibold text-[#0A4A63]">
                        Vamos usar essas informações para sugerir templates para esses clientes.
                      </p>
                    </div>
                    <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white p-3">
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        Tom de comunicação
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Define como sua proposta vai conversar com o cliente
                      </p>
                      <div
                        role="radiogroup"
                        aria-label="Tom de comunicação"
                        className="flex gap-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-muted)] p-1"
                      >
                        {communicationToneOptions.map((option) => {
                          const Icon = option.icon;
                          const isSelected = templateTone === option.label;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => setTemplateTone(option.label)}
                              className={`flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                                isSelected
                                  ? "bg-[#1f7f9b]/10 text-[#0A4A63] shadow-sm"
                                  : "text-zinc-600 hover:text-zinc-800"
                              }`}
                            >
                              <Icon
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isSelected ? "text-[#1f7f9b]" : "text-zinc-500"
                                }`}
                                aria-hidden
                              />
                              <span className="truncate">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs font-semibold text-[#0A4A63]">
                        {
                          communicationToneOptions.find((option) => option.label === templateTone)
                            ?.description
                        }
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-border)] bg-white p-3">
                      <Input
                        label="Diferenciais da sua empresa (opcional)"
                        value={templateValueProposition}
                        onChange={(e) => setTemplateValueProposition(e.target.value)}
                        placeholder="Ex: atendimento rápido, preço competitivo, mais de 200 projetos entregues"
                        multiline
                        minRows={2}
                        className="w-full [&_.MuiInputBase-inputMultiline]:text-xs [&_.MuiInputBase-inputMultiline]:leading-5"
                        helperText="Inclua diferenciais, número de projetos e pontos fortes da sua operação para personalizar suas propostas."
                      />
                    </div>
                    <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3 sm:flex-row">
                      <Button type="button" variant="outline" className="w-full" onClick={goBack}>
                        Voltar
                      </Button>
                      <Button
                        type="button"
                        className="w-full bg-[linear-gradient(90deg,#1b5e7c_0%,#1f7f9b_55%,#39d3bf_100%)] text-white shadow-[0_8px_18px_rgba(31,127,155,0.22)] hover:opacity-95"
                        disabled={loading}
                        onClick={() => void finalizeOnboarding(false)}
                      >
                        {loading ? (
                          "Criando conta…"
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Começar a vender agora
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              {error && <p className="mt-3 text-sm text-[var(--color-destructive)]">{error}</p>}
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}
