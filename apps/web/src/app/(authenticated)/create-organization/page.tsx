"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/components/providers/organization-provider";
import { createOrganization, uploadOrganizationLogo } from "@/lib/organizations-api";
import { triggerWelcomeIntroSplash } from "@/components/layout/welcome-intro-splash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  Building2,
  FileText,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  CreditCard,
  House,
  Building,
  Factory,
  Leaf,
  Megaphone,
  UserCheck,
  LogOut,
  Loader2,
  MapPin,
  Scale,
  ExternalLink,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

interface ReferralSourceOption {
  id: string;
  label: string;
  requiresDetails: boolean;
  detailsPlaceholder?: string;
  active: boolean;
}

const DEFAULT_REFERRAL_SOURCES: ReferralSourceOption[] = [
  {
    id: "indicacao-amigo",
    label: "Indicação de Amigo ou Integrador",
    requiresDetails: true,
    detailsPlaceholder: "Nome de quem recomendou a EnergivIA",
    active: true,
  },
  {
    id: "instagram",
    label: "Instagram",
    requiresDetails: false,
    active: true,
  },
  {
    id: "google-busca",
    label: "Google / Pesquisa na Web",
    requiresDetails: false,
    active: true,
  },
  {
    id: "youtube",
    label: "YouTube / Vídeo",
    requiresDetails: false,
    active: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    requiresDetails: false,
    active: true,
  },
  {
    id: "distribuidor-solar",
    label: "Distribuidor Solar (Edeltec, Fortlev, etc.)",
    requiresDetails: true,
    detailsPlaceholder: "Qual distribuidor / representante?",
    active: true,
  },
  {
    id: "evento-feira",
    label: "Evento / Feira Solar (Intersolar, etc.)",
    requiresDetails: true,
    detailsPlaceholder: "Qual evento ou feira?",
    active: true,
  },
  {
    id: "parceiro-comercial",
    label: "Parceiro Comercial",
    requiresDetails: true,
    detailsPlaceholder: "Nome do parceiro",
    active: true,
  },
  {
    id: "outros",
    label: "Outros",
    requiresDetails: true,
    detailsPlaceholder: "Como conheceu?",
    active: true,
  },
];

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
    borderColor: theme?.palette?.mode === "dark" ? "#334155" : "#d4d4d8",
    borderTopWidth: 0,
    background: theme?.palette?.mode === "dark" ? "#334155" : "#d4d4d8",
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
  const [cep, setCep] = useState("");
  const [cityState, setCityState] = useState("");
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cnpjLookupSuccess, setCnpjLookupSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [referralSources, setReferralSources] =
    useState<ReferralSourceOption[]>(DEFAULT_REFERRAL_SOURCES);
  const [selectedReferralSource, setSelectedReferralSource] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [templateValueProposition, setTemplateValueProposition] = useState("");
  const [templateTone, setTemplateTone] = useState("Comercial");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const cnpjRef = useRef<HTMLInputElement | null>(null);
  const segmentRef = useRef<HTMLButtonElement | null>(null);
  const lastSearchedCnpj = useRef<string>("");
  const lastSearchedCep = useRef<string>("");

  useEffect(() => {
    fetch("/api/system/referral-sources")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.sources && Array.isArray(data.sources) && data.sources.length > 0) {
          setReferralSources(data.sources);
        }
      })
      .catch(() => {});
  }, []);

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
      cnpjRef.current?.focus();
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

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/^(\d{5})(\d)/, "$1-$2");
  };

  const handleCnpjChange = async (rawValue: string) => {
    const formatted = formatCnpj(rawValue);
    setCnpj(formatted);
    const clean = rawValue.replace(/\D/g, "");

    if (clean.length === 14 && clean !== lastSearchedCnpj.current) {
      lastSearchedCnpj.current = clean;
      setIsSearchingCnpj(true);
      setCnpjLookupSuccess(false);
      try {
        const res = await fetch(`https://minhareceita.org/${clean}`);
        if (res.ok) {
          const data = await res.json();
          const companyName = data.nome_fantasia || data.razao_social || "";
          if (companyName) {
            setName(companyName);
          }
          if (data.cep) {
            setCep(formatCep(data.cep));
          }
          if (data.municipio && data.uf) {
            setCityState(`${data.municipio} - ${data.uf}`);
          }
          setCnpjLookupSuccess(true);
        }
      } catch {
        // Falha silenciosa para permitir preenchimento manual
      } finally {
        setIsSearchingCnpj(false);
      }
    }
  };

  const handleCepChange = async (rawValue: string) => {
    const formatted = formatCep(rawValue);
    setCep(formatted);
    const clean = rawValue.replace(/\D/g, "");

    if (clean.length === 8 && clean !== lastSearchedCep.current) {
      lastSearchedCep.current = clean;
      setIsSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro && data.localidade && data.uf) {
            setCityState(`${data.localidade} - ${data.uf}`);
          }
        }
      } catch {
        // Falha silenciosa para permitir preenchimento manual
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const selectedSourceOption = referralSources.find((s) => s.id === selectedReferralSource);

  const finalizeOnboarding = async (skipTemplateStep: boolean) => {
    const selectedSegmentsSnapshot = [...selectedSegments];
    if (!skipTemplateStep && selectedSegmentsSnapshot.length === 0) {
      setError("Selecione pelo menos um segmento para gerar suas propostas.");
      return;
    }
    if (!termsAccepted) {
      setError("Você precisa aceitar os Termos de Uso e Isenção Técnica para continuar.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const organization = await createOrganization({
        name: name.trim(),
        logoUrl: logoUrl || undefined,
        cnpj: cnpj.trim() || undefined,
        templateRegion: cityState.trim() || undefined,
        referralSource: (selectedSourceOption?.label ?? selectedReferralSource.trim()) || undefined,
        referredBy: referredBy.trim() || undefined,
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
      triggerWelcomeIntroSplash();
      router.replace("/painel");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar empresa");
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (cnpj.replace(/\D/g, "").length !== 14) {
      setError("Informe um CNPJ válido com 14 dígitos.");
      return;
    }
    if (!name.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }
    if (!selectedReferralSource) {
      setError("Selecione como você conheceu a EnergivIA.");
      return;
    }
    if (selectedSourceOption?.requiresDetails && !referredBy.trim()) {
      setError(
        selectedSourceOption.id === "indicacao-amigo"
          ? "Informe quem recomendou a EnergivIA para você."
          : "Por favor, preencha os detalhes da indicação/origem."
      );
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
    <section className="relative flex min-h-screen flex-col bg-[var(--color-background)]">
      <div className="relative flex min-h-screen w-full flex-1 flex-col lg:flex-row">
        <aside className="hidden w-[380px] shrink-0 flex-col justify-between border-r border-white/10 bg-[linear-gradient(135deg,#08324F_0%,#0A4A63_45%,#0FD3B4_115%)] px-7 py-8 lg:flex xl:w-[420px] xl:px-8 xl:py-10">
          <div className="flex flex-1 flex-col justify-center space-y-6">
            <Link
              href="/?landing=1"
              className="inline-block transition-opacity hover:opacity-90 w-fit"
            >
              <Image
                src="/logo-dark.png"
                alt="EnergivIA"
                width={260}
                height={54}
                className="h-auto w-[220px] xl:w-[260px]"
                priority
              />
            </Link>
            <div>
              <h2 className="text-[24px] font-semibold leading-[1.2] tracking-tight text-white xl:text-[28px]">
                Você está a poucos passos de automatizar suas propostas
              </h2>
              <p className="mt-2.5 max-w-[340px] text-[13px] italic font-normal leading-relaxed text-white/90 xl:text-[14px]">
                Comece com o básico e personalize templates de proposta para acelerar suas
                negociações.
              </p>
            </div>

            <ul className="space-y-3.5 xl:space-y-4">
              <li className="flex items-center gap-3.5 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <Zap className="relative z-10 h-3.5 w-3.5 text-white" />
                </span>
                <p className="text-xs font-medium text-white/90 xl:text-sm">
                  Gere propostas completas a partir da conta de luz.
                </p>
              </li>
              <li className="flex items-center gap-3.5 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <Sparkles className="relative z-10 h-3.5 w-3.5 text-white" />
                </span>
                <p className="text-xs font-medium text-white/90 xl:text-sm">
                  Templates prontos para fechar mais vendas.
                </p>
              </li>
              <li className="flex items-center gap-3.5 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <ShieldCheck className="relative z-10 h-3.5 w-3.5 text-white" />
                </span>
                <p className="text-xs font-medium text-white/90 xl:text-sm">
                  Simulação automática de ROI e payback.
                </p>
              </li>
              <li className="flex items-center gap-3.5 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <CreditCard className="relative z-10 h-3.5 w-3.5 text-white" />
                </span>
                <p className="text-xs font-medium text-white/90 xl:text-sm">
                  Financiamento facilitado com poucos cliques.
                </p>
              </li>
              <li className="flex items-center gap-3.5 rounded-xl bg-white/12 px-3 py-2">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/12">
                  <span className="pointer-events-none absolute inset-0 bg-white/10" />
                  <FaWhatsapp className="relative z-10 h-3.5 w-3.5 text-white" />
                </span>
                <p className="text-xs font-medium text-white/90 xl:text-sm">
                  Gerencie suas propostas e leads direto pelo WhatsApp com IA.
                </p>
              </li>
            </ul>
          </div>

          <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/15 bg-white/12 px-4 py-3">
            <span className="pointer-events-none absolute inset-0 bg-white/10" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex items-center">
                {["RK", "MT", "EK", "RT"].map((letter, idx) => (
                  <span
                    key={letter}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-[10px] font-semibold text-white backdrop-blur-sm xl:h-8 xl:w-8 xl:text-[11px]"
                    style={{ marginLeft: idx === 0 ? 0 : -8 }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">+120 empresas ativas</p>
                <p className="text-[11px] text-white/80">criando propostas solares todo dia</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="relative flex flex-1 flex-col overflow-y-auto bg-[var(--color-background)]">
          <div className="w-full border-b border-[var(--color-border)] bg-[var(--color-card)]/50 px-6 py-3">
            <div className="mx-auto flex max-w-[760px] items-center justify-end">
              <a
                href="/auth/logout"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-red-500"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </a>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-start px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 px-2">
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

            <div className="space-y-2 px-2 pb-4 text-center">
              <h1 className="text-[25px] font-bold tracking-tight text-[#0A4A63] lg:text-[27px]">
                {step === 1
                  ? "Configure o perfil da sua empresa"
                  : "Personalize suas propostas inteligentes"}
              </h1>
              <p className="mx-auto max-w-[620px] text-[14px] font-medium leading-relaxed text-[var(--color-muted-foreground)]">
                {step === 1
                  ? "Informe seu CNPJ para personalizarmos suas propostas comerciais em poucos segundos."
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
                  <div className="space-y-3.5 pt-1.5">
                    <Input
                      ref={cnpjRef}
                      label="CNPJ *"
                      value={cnpj}
                      onChange={(e) => void handleCnpjChange(e.target.value)}
                      placeholder="00.000.000/0000-00"
                      className="w-full font-mono text-sm"
                      required
                      startAdornment={
                        <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      }
                      endAdornment={
                        isSearchingCnpj ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[#1f7f9b]" />
                        ) : cnpj.replace(/\D/g, "").length === 14 ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : null
                      }
                      helperText={
                        isSearchingCnpj
                          ? "Buscando dados na Receita Federal..."
                          : cnpjLookupSuccess
                            ? "Dados da empresa localizados e preenchidos automaticamente!"
                            : undefined
                      }
                    />

                    <Input
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

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <Input
                        label="CEP da empresa"
                        value={cep}
                        onChange={(e) => void handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        className="w-full font-mono text-sm"
                        startAdornment={
                          <MapPin className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        }
                        endAdornment={
                          isSearchingCep ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[#1f7f9b]" />
                          ) : cep.replace(/\D/g, "").length === 8 ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : null
                        }
                      />
                      <Input
                        label="Cidade e UF"
                        value={cityState}
                        onChange={(e) => setCityState(e.target.value)}
                        placeholder="Ex: Londrina - PR"
                        className="w-full"
                        startAdornment={
                          <Building className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        }
                        endAdornment={
                          cityState.trim() ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : null
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)] flex items-center justify-between">
                        <span>Como conheceu a EnergivIA? *</span>
                        {selectedReferralSource ? (
                          <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Selecionado
                          </span>
                        ) : null}
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-muted-foreground)]">
                          <Megaphone className="h-4 w-4" />
                        </div>
                        <select
                          value={selectedReferralSource}
                          onChange={(e) => setSelectedReferralSource(e.target.value)}
                          className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] pl-9 pr-8 text-sm font-medium text-[var(--color-foreground)] focus:border-[#0f6b86] focus:outline-none focus:ring-2 focus:ring-[#0f6b86]/20 transition-colors cursor-pointer"
                          required
                        >
                          <option value="" disabled>
                            Selecione uma opção...
                          </option>
                          {referralSources
                            .filter((s) => s.active)
                            .map((source) => (
                              <option key={source.id} value={source.id}>
                                {source.label}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {selectedSourceOption?.requiresDetails ? (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <Input
                          label={
                            selectedSourceOption.id === "indicacao-amigo"
                              ? "Quem recomendou a EnergivIA? *"
                              : `${selectedSourceOption.label} - Detalhes *`
                          }
                          value={referredBy}
                          onChange={(e) => setReferredBy(e.target.value)}
                          placeholder={
                            selectedSourceOption.detailsPlaceholder ||
                            (selectedSourceOption.id === "indicacao-amigo"
                              ? "Nome da pessoa, amigo ou empresa que indicou"
                              : "Informe os detalhes...")
                          }
                          className="w-full"
                          required
                          startAdornment={
                            <UserCheck className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                          }
                          endAdornment={
                            referredBy.trim() ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : null
                          }
                        />
                      </div>
                    ) : null}

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

                    <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                      <Link
                        href="/?landing=1"
                        className="inline-flex items-center gap-1 font-medium text-zinc-500 hover:text-[#0A4A63] dark:hover:text-sky-400 transition-colors"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        Voltar para a página principal da EnergivIA
                      </Link>
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
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700 mt-0.5 dark:text-amber-400" />
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-900 dark:text-amber-300">
                            Aviso de Inteligência Artificial e Engenharia Solar:
                          </p>
                          <p className="leading-relaxed text-amber-800/90 dark:text-amber-400/90 text-[11.5px]">
                            As estimativas de geração e propostas da EnergivIA têm caráter comercial
                            preliminar. A responsabilidade técnica, vistoria presencial no local,
                            validação estrutural/elétrica e emissão de ART/TRT perante a
                            distribuidora são exclusivas do integrador credenciado.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-white p-3.5 space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => {
                            setTermsAccepted(e.target.checked);
                            if (error) setError(null);
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#0f6b86] focus:ring-[#0f6b86] cursor-pointer"
                        />
                        <span className="text-xs text-zinc-700 leading-snug">
                          Declaro que li e concordo com os{" "}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setTermsModalOpen(true);
                            }}
                            className="font-semibold text-[#0A4A63] underline hover:text-[#1f7f9b] transition-colors"
                          >
                            Termos de Uso e Isenção Técnica
                          </button>{" "}
                          e com a{" "}
                          <Link
                            href="/privacidade"
                            target="_blank"
                            className="font-semibold text-[#0A4A63] underline hover:text-[#1f7f9b] transition-colors"
                          >
                            Política de Privacidade
                          </Link>
                          .
                        </span>
                      </label>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <ShieldCheck className="h-3.5 w-3.5" /> Conformidade LGPD e Marco Civil
                        </span>
                        <button
                          type="button"
                          onClick={() => setTermsModalOpen(true)}
                          className="inline-flex items-center gap-1 font-medium text-[#1f7f9b] hover:underline cursor-pointer"
                        >
                          <FileText className="h-3 w-3" />
                          Ler termos na íntegra
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3 sm:flex-row">
                      <Button type="button" variant="outline" className="w-full" onClick={goBack}>
                        Voltar
                      </Button>
                      <Button
                        type="button"
                        className="w-full bg-[linear-gradient(90deg,#1b5e7c_0%,#1f7f9b_55%,#39d3bf_100%)] text-white shadow-[0_8px_18px_rgba(31,127,155,0.22)] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        disabled={loading || !termsAccepted}
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

      {/* Modal de Termos de Uso e Isenção Técnica */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent muiMaxWidth="md" className="max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="space-y-1 border-b border-zinc-200 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1f7f9b]">
              <Scale className="h-4 w-4" />
              Documento Oficial EnergivIA
            </div>
            <DialogTitle className="text-xl font-bold text-zinc-900">
              Termos de Uso e Isenção de Responsabilidade Técnica
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Revisado em conformidade com o Marco Civil da Internet (Lei 12.965/14) e LGPD (Lei
              13.709/18).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 my-4 space-y-6 text-xs leading-relaxed text-zinc-700">
            {/* Box de Destaque */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-amber-950">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">
                    Aviso Importante: Inteligência Artificial e Responsabilidade do Integrador
                  </p>
                  <p className="mt-1 leading-relaxed text-amber-900">
                    A EnergivIA é uma ferramenta de suporte comercial e estimativas preliminares.{" "}
                    <strong>
                      Todo e qualquer dimensionamento gerado por IA deve ser obrigatoriamente
                      revisado por técnico ou engenheiro habilitado (CREA/CFT)
                    </strong>{" "}
                    mediante vistoria técnica presencial no imóvel antes da instalação e homologação
                    perante a concessionária de energia.
                  </p>
                </div>
              </div>
            </div>

            <section className="space-y-1.5">
              <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#1f7f9b]" /> 1. Objeto e Escopo
              </h4>
              <p>
                A plataforma <strong>EnergivIA</strong> disponibiliza software para automação de
                propostas comerciais, leitura inteligente de contas de luz e estimativas financeiras
                para o mercado de energia solar. A EnergivIA não executa projetos elétricos
                executivos e não emite ART/TRT.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[#1f7f9b]" /> 2. Estimativas por Inteligência
                Artificial
              </h4>
              <p>
                Os cálculos de irradiação (HSP), quantidade de painéis, inversores e economia
                estimada são simulações matemáticas. Variações de sombreamento, orientação de
                telhado, cabeamento ou mudanças tarifárias da distribuidora (Lei 14.300/22) podem
                gerar divergências em relação à geração real.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#1f7f9b]" /> 3. Responsabilidade do Integrador
              </h4>
              <p>
                O Integrador é o único e exclusivo responsável por: (i) inspecionar fisicamente o
                imóvel e a estrutura do telhado/padrão de energia; (ii) verificar a compatibilidade
                e segurança dos equipamentos; (iii) emitir a devida ART/TRT por engenheiro
                responsável; e (iv) aprovar o parecer de acesso na concessionária.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#1f7f9b]" /> 4. Privacidade de Dados (LGPD)
              </h4>
              <p>
                O Integrador atua como Controlador dos dados e faturas de seus clientes finais
                inseridos na plataforma, declarando possuir autorização legal para o envio. A
                EnergivIA atua como Operadora técnica dos dados com criptografia e isolamento
                seguro.
              </p>
            </section>
          </div>

          <DialogFooter className="border-t border-zinc-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/termos-de-uso"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#0A4A63] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir página completa em nova guia
            </Link>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTermsModalOpen(false)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-[#0f6b86] text-white hover:bg-[#0A4A63]"
                onClick={() => {
                  setTermsAccepted(true);
                  if (error) setError(null);
                  setTermsModalOpen(false);
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Li e concordo com os Termos
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
