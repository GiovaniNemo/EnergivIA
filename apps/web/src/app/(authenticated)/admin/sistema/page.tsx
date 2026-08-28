"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Server,
  Database,
  Mail,
  MessageSquare,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Megaphone,
  Sliders,
  ShieldAlert,
  Cpu,
  Trash2,
  Eye,
  Save,
  Check,
  Zap,
  Clock,
  HardDrive,
  FileText,
  CheckCircle,
  UserCheck,
  Plus,
  Layers,
  Palette,
} from "lucide-react";
import { SystemAnnouncement } from "@/components/layout/sidebar-notice";
import { uploadOrganizationLogo } from "@/lib/organizations-api";
import { ImageDropzone } from "@/components/ui/image-dropzone";

export interface ReferralSourceOption {
  id: string;
  label: string;
  requiresDetails: boolean;
  detailsPlaceholder?: string;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface ServiceHealth {
  name: string;
  category: "core" | "ai" | "messaging" | "infra";
  status: "operational" | "degraded" | "offline";
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

interface HealthData {
  status: "healthy" | "degraded" | "critical";
  checkedAt: string;
  totalTimeMs: number;
  environment: string;
  nodeVersion: string;
  uptimeSeconds: number;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  services: ServiceHealth[];
}

interface FeatureFlags {
  aiFeatures: boolean;
  newProposalEditor: boolean;
  betaFinancing: boolean;
  publicAPI: boolean;
  audioTranscription: boolean;
  maintenanceMode: boolean;
  advancedFinancialSimulation: boolean;
  instantEnergyBillOCR: boolean;
}

export default function AdminSistemaPage() {
  const [activeTab, setActiveTab] = useState<
    "health" | "announcements" | "flags" | "tools" | "referrals" | "branding"
  >("health");
  const [refreshingHealth, setRefreshingHealth] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);

  // Branding state
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandLogoDarkUrl, setBrandLogoDarkUrl] = useState("");
  const [brandLogoLightUrl, setBrandLogoLightUrl] = useState("");
  const [whatsappLogoUrl, setWhatsappLogoUrl] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => {
    fetch("/api/proxy/system-settings/branding", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.brandLogoUrl) setBrandLogoUrl(data.brandLogoUrl);
        if (data?.brandLogoDarkUrl) setBrandLogoDarkUrl(data.brandLogoDarkUrl);
        if (data?.brandLogoLightUrl) setBrandLogoLightUrl(data.brandLogoLightUrl);
        if (data?.whatsappLogoUrl) setWhatsappLogoUrl(data.whatsappLogoUrl);
      })
      .catch(() => {});
  }, []);

  // Announcement State
  const [announcement, setAnnouncement] = useState<SystemAnnouncement>({
    id: "announcement-1",
    active: false,
    type: "maintenance",
    title: "Manutenção Programada no Sistema",
    message:
      "Estamos atualizando nossos servidores de cálculo de propostas. Todas as outras ferramentas continuam disponíveis.",
    category: "Manutenção",
    actionText: "Acompanhar",
    actionUrl: "",
    dismissible: true,
    showInSidebar: true,
  });
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [announcementSavedSuccess, setAnnouncementSavedSuccess] = useState(false);

  // Feature Flags State
  const [flags, setFlags] = useState<FeatureFlags>({
    aiFeatures: true,
    newProposalEditor: true,
    betaFinancing: true,
    publicAPI: false,
    audioTranscription: true,
    maintenanceMode: false,
    advancedFinancialSimulation: true,
    instantEnergyBillOCR: true,
  });
  const [savingFlagKey, setSavingFlagKey] = useState<string | null>(null);
  const [flagSuccessMsg, setFlagSuccessMsg] = useState("");

  // Referral Sources State
  const [referralSources, setReferralSources] = useState<ReferralSourceOption[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [newReferralLabel, setNewReferralLabel] = useState("");
  const [newReferralRequiresDetails, setNewReferralRequiresDetails] = useState(false);
  const [newReferralPlaceholder, setNewReferralPlaceholder] = useState("");
  const [savingReferral, setSavingReferral] = useState(false);
  const [referralFeedback, setReferralFeedback] = useState<string | null>(null);

  // Tools feedback
  const [toolFeedback, setToolFeedback] = useState<string | null>(null);

  // Fetch Health
  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setRefreshingHealth(true);
    try {
      const res = await fetch("/api/system/health", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error("Erro ao buscar saúde do sistema:", err);
    } finally {
      if (isManual) setRefreshingHealth(false);
    }
  }, []);

  // Fetch Announcement
  const fetchAnnouncement = useCallback(async () => {
    try {
      const res = await fetch("/api/system/announcements", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.announcement) {
          setAnnouncement(data.announcement);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar anúncio do sistema:", err);
    }
  }, []);

  // Fetch Feature Flags
  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch("/api/system/features", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.flags) {
          setFlags(data.flags);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar feature flags:", err);
    }
  }, []);

  // Fetch Referral Sources
  const fetchReferralSources = useCallback(async () => {
    setLoadingReferrals(true);
    try {
      const res = await fetch("/api/system/referral-sources?all=true", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sources)) {
          setReferralSources(data.sources);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar opções de indicação:", err);
    } finally {
      setLoadingReferrals(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchAnnouncement();
    fetchFlags();
    fetchReferralSources();
  }, [fetchHealth, fetchAnnouncement, fetchFlags, fetchReferralSources]);

  // Referral Sources Handlers
  const handleToggleReferralActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/system/referral-sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !currentActive }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sources) setReferralSources(data.sources);
        setReferralFeedback(
          currentActive ? "Opção desativada do cadastro!" : "Opção ativada no cadastro!"
        );
        setTimeout(() => setReferralFeedback(null), 2500);
      }
    } catch (err) {
      console.error("Erro ao alternar status da opção:", err);
    }
  };

  const handleAddReferralSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReferralLabel.trim()) return;
    setSavingReferral(true);
    try {
      const res = await fetch("/api/system/referral-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newReferralLabel.trim(),
          requiresDetails: newReferralRequiresDetails,
          detailsPlaceholder: newReferralPlaceholder.trim() || undefined,
          active: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sources) setReferralSources(data.sources);
        setNewReferralLabel("");
        setNewReferralRequiresDetails(false);
        setNewReferralPlaceholder("");
        setReferralFeedback("Nova opção adicionada com sucesso!");
        setTimeout(() => setReferralFeedback(null), 2500);
      }
    } catch (err) {
      console.error("Erro ao adicionar opção:", err);
    } finally {
      setSavingReferral(false);
    }
  };

  const handleDeleteReferralSource = async (id: string, label: string) => {
    if (!confirm(`Deseja realmente remover a opção "${label}"?`)) return;
    try {
      const res = await fetch(`/api/system/referral-sources?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sources) setReferralSources(data.sources);
        setReferralFeedback("Opção excluída com sucesso!");
        setTimeout(() => setReferralFeedback(null), 2500);
      }
    } catch (err) {
      console.error("Erro ao excluir opção:", err);
    }
  };

  // Save Announcement
  const handleSaveAnnouncement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingAnnouncement(true);
    try {
      const updated = {
        ...announcement,
        id: `announcement-${Date.now()}`, // new id forces users to see new announcement if previously dismissed
      };
      const res = await fetch("/api/system/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncement(data.announcement);
        setAnnouncementSavedSuccess(true);
        window.dispatchEvent(new Event("system_announcement_updated"));
        setTimeout(() => setAnnouncementSavedSuccess(false), 3500);
      }
    } catch (err) {
      console.error("Erro ao salvar anúncio:", err);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Toggle Feature Flag
  const toggleFlag = async (key: keyof FeatureFlags) => {
    setSavingFlagKey(key);
    const newValue = !flags[key];
    const newFlags = { ...flags, [key]: newValue };
    setFlags(newFlags);

    try {
      const res = await fetch("/api/system/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFlags),
      });
      if (res.ok) {
        setFlagSuccessMsg("Recurso atualizado com sucesso!");
        setTimeout(() => setFlagSuccessMsg(""), 2500);
      }
    } catch (err) {
      console.error("Erro ao alternar flag:", err);
    } finally {
      setSavingFlagKey(null);
    }
  };

  // Quick Preset for Announcement
  const applyPreset = (preset: "maintenance" | "warning" | "feature" | "clear") => {
    if (preset === "maintenance") {
      setAnnouncement({
        ...announcement,
        active: true,
        type: "maintenance",
        title: "Manutenção Preventiva Agendada",
        message:
          "Realizaremos uma melhoria em nossa infraestrutura hoje a partir das 23h. A plataforma poderá ter breves instabilidades.",
        category: "Manutenção",
        actionText: "Acompanhar Status",
        actionUrl: "",
        dismissible: true,
        showInSidebar: true,
      });
    } else if (preset === "warning") {
      setAnnouncement({
        ...announcement,
        active: true,
        type: "warning",
        title: "Instabilidade Temporária no WhatsApp",
        message:
          "Identificamos uma lentidão na entrega de mensagens automáticas de WhatsApp. Nossa equipe já está atuando na normalização.",
        category: "Atenção",
        actionText: "Ver Detalhes",
        actionUrl: "",
        dismissible: true,
        showInSidebar: true,
      });
    } else if (preset === "feature") {
      setAnnouncement({
        ...announcement,
        active: true,
        type: "success",
        title: "Novo Editor de Propostas V2 Liberado!",
        message:
          "A nova versão do gerador de propostas comerciais agora conta com layouts customizados e geração ultrarrápida!",
        category: "Novidade",
        actionText: "Conhecer Recursos",
        actionUrl: "/propostas",
        dismissible: true,
        showInSidebar: true,
      });
    } else if (preset === "clear") {
      setAnnouncement({
        ...announcement,
        active: false,
      });
    }
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${seconds % 60}s`;
  };

  // Helper icons for services
  const getServiceIcon = (name: string, category: string) => {
    if (category === "ai" || name.includes("Inteligência") || name.includes("IA")) return Sparkles;
    if (name.includes("Banco") || name.includes("Prisma") || name.includes("PostgreSQL"))
      return Database;
    if (name.includes("PDF") || name.includes("Puppeteer")) return FileText;
    if (name.includes("E-mail") || name.includes("Resend") || name.includes("SES")) return Mail;
    if (name.includes("WhatsApp") || name.includes("Z-API")) return MessageSquare;
    return Server;
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
                  Sistema & Infraestrutura
                </h1>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                  Painel administrativo de diagnóstico, comunicados aos integradores e feature flags
                  globais
                </p>
              </div>
            </div>
          </div>

          {/* Quick Info & Health Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-[var(--color-foreground)]">
                {healthData?.status === "healthy" ? "Sistemas Operacionais" : "Monitoramento Ativo"}
              </span>
            </div>

            <button
              onClick={() => fetchHealth(true)}
              disabled={refreshingHealth}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshingHealth ? "animate-spin" : ""}`} />
              {refreshingHealth ? "Testando..." : "Testar Serviços"}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button
            onClick={() => setActiveTab("health")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "health"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-500/10"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Activity className="h-4 w-4" />
            Saúde & Infraestrutura
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "announcements"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-500/10"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Megaphone className="h-4 w-4" />
            Avisos & Comunicados
            {announcement.active && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-bold">
                Ativo
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("flags")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "flags"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-500/10"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Feature Flags
          </button>

          <button
            onClick={() => setActiveTab("tools")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "tools"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-500/10"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Cpu className="h-4 w-4" />
            Diagnóstico & DevOps
          </button>

          <button
            onClick={() => setActiveTab("referrals")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "referrals"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-500/10"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Canais de Indicação & Origem
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold">
              {referralSources.filter((s) => s.active).length} ativas
            </span>
          </button>

          <button
            onClick={() => setActiveTab("branding")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "branding"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-500/10"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Palette className="h-4 w-4" />
            Identidade Visual
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: SAÚDE & INFRAESTRUTURA */}
        {/* ========================================================================= */}
        {activeTab === "health" && (
          <div className="space-y-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Status Global
                  </p>
                  <h3 className="text-lg font-bold text-[var(--color-foreground)] mt-1 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    100% Operacional
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Activity className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Tempo de Resposta
                  </p>
                  <h3 className="text-lg font-bold text-[var(--color-foreground)] mt-1">
                    {healthData?.totalTimeMs || 18} ms
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                  <Zap className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Uptime do Servidor
                  </p>
                  <h3 className="text-lg font-bold text-[var(--color-foreground)] mt-1">
                    {healthData?.uptimeSeconds ? formatUptime(healthData.uptimeSeconds) : "99.98%"}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Memória do Processo
                  </p>
                  <h3 className="text-lg font-bold text-[var(--color-foreground)] mt-1">
                    {healthData?.memory?.heapUsedMb || 64} MB{" "}
                    <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                      / {healthData?.memory?.heapTotalMb || 128} MB
                    </span>
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                  <HardDrive className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Live Services Grid */}
            <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-foreground)] flex items-center gap-2">
                    <Server className="h-5 w-5 text-[var(--color-primary)]" />
                    Diagnóstico dos Nós de Integração
                  </h2>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                    Monitoramento contínuo das conexões com bancos, motores de cálculo e provedores
                    externos
                  </p>
                </div>

                <span className="text-xs text-[var(--color-muted-foreground)]">
                  Última checagem:{" "}
                  {healthData?.checkedAt
                    ? new Date(healthData.checkedAt).toLocaleTimeString("pt-BR")
                    : "Agora"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthData?.services?.map((svc, idx) => {
                  const Icon = getServiceIcon(svc.name, svc.category);
                  const isOk = svc.status === "operational";
                  const isDegraded = svc.status === "degraded";

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)]/50 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                              isOk
                                ? "bg-emerald-500/10 text-emerald-500"
                                : isDegraded
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-[var(--color-foreground)] leading-tight">
                              {svc.name}
                            </h4>
                            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                              {svc.message || "Operando com normalidade"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              isOk
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : isDegraded
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            }`}
                          >
                            {isOk ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : isDegraded ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {isOk ? "Operacional" : isDegraded ? "Degradado" : "Offline"}
                          </span>
                        </div>
                      </div>

                      {/* Footer info & Latency */}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-muted-foreground)]">
                        <span className="capitalize">Categoria: {svc.category}</span>
                        {svc.latencyMs && (
                          <span className="font-mono bg-[var(--color-card)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                            {svc.latencyMs} ms
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: AVISOS & COMUNICADOS AOS INTEGRADORES */}
        {/* ========================================================================= */}
        {activeTab === "announcements" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-foreground)] flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-amber-500" />
                      Publicar Comunicado aos Integradores
                    </h2>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                      Transmita informações de manutenção, novidades ou alertas na barra lateral de
                      todos os usuários
                    </p>
                  </div>

                  {announcementSavedSuccess && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-in fade-in">
                      <Check className="h-3.5 w-3.5" /> Salvo e Publicado!
                    </span>
                  )}
                </div>

                {/* Presets Rápidos */}
                <div className="mb-6">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-2">
                    Modelos Prontos (Presets):
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPreset("maintenance")}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                    >
                      🔧 Manutenção Noturna
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("warning")}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                    >
                      ⚠️ Instabilidade Técnica
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("feature")}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                    >
                      ✨ Nova Funcionalidade
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("clear")}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 transition-colors"
                    >
                      🛑 Desativar Aviso
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                  {/* Status Toggle */}
                  <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                        Exibir Comunicado na Plataforma
                      </h4>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Quando ativo, o aviso será visível para todos os usuários logados
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAnnouncement({ ...announcement, active: !announcement.active })
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        announcement.active ? "bg-emerald-500" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          announcement.active ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Nível do Alerta (Tipo) */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1.5">
                      Tipo de Severidade / Estilo
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        {
                          type: "maintenance",
                          label: "Manutenção",
                          color: "border-amber-500 text-amber-500",
                        },
                        {
                          type: "warning",
                          label: "Alerta / Atenção",
                          color: "border-red-500 text-red-500",
                        },
                        {
                          type: "info",
                          label: "Informativo",
                          color: "border-blue-500 text-blue-500",
                        },
                        {
                          type: "success",
                          label: "Novidade / Sucesso",
                          color: "border-emerald-500 text-emerald-500",
                        },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() =>
                            setAnnouncement({
                              ...announcement,
                              type: item.type as SystemAnnouncement["type"],
                            })
                          }
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            announcement.type === item.type
                              ? `bg-[var(--color-card)] ${item.color} shadow-sm ring-2 ring-[var(--color-primary)]`
                              : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categoria e Título */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1">
                        Etiqueta / Tag
                      </label>
                      <input
                        type="text"
                        value={announcement.category || ""}
                        onChange={(e) =>
                          setAnnouncement({ ...announcement, category: e.target.value })
                        }
                        placeholder="Ex: Manutenção, Atenção, Update"
                        className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1">
                        Título do Comunicado *
                      </label>
                      <input
                        type="text"
                        required
                        value={announcement.title}
                        onChange={(e) =>
                          setAnnouncement({ ...announcement, title: e.target.value })
                        }
                        placeholder="Ex: Atualização programada nos servidores"
                        className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  {/* Mensagem */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1">
                      Mensagem Completa *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={announcement.message}
                      onChange={(e) =>
                        setAnnouncement({ ...announcement, message: e.target.value })
                      }
                      placeholder="Descreva detalhadamente o comunicado que aparecerá para os integradores..."
                      className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Link e Texto de Ação */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1">
                        Texto do Botão / Link (Opcional)
                      </label>
                      <input
                        type="text"
                        value={announcement.actionText || ""}
                        onChange={(e) =>
                          setAnnouncement({ ...announcement, actionText: e.target.value })
                        }
                        placeholder="Ex: Ver Status, Saiba Mais"
                        className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1">
                        Link de Destino / URL (Opcional)
                      </label>
                      <input
                        type="text"
                        value={announcement.actionUrl || ""}
                        onChange={(e) =>
                          setAnnouncement({ ...announcement, actionUrl: e.target.value })
                        }
                        placeholder="Ex: https://status... ou /ajuda"
                        className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  {/* Opções de Fechamento */}
                  <div className="pt-2 flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={announcement.dismissible}
                        onChange={(e) =>
                          setAnnouncement({ ...announcement, dismissible: e.target.checked })
                        }
                        className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      Permitir que o usuário feche com o botão "X"
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                      type="submit"
                      disabled={savingAnnouncement}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingAnnouncement
                        ? "Publicando..."
                        : "Publicar Comunicado aos Integradores"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--color-border)]">
                  <Eye className="h-4 w-4 text-[var(--color-primary)]" />
                  <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                    Pré-visualização em Tempo Real
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-4">
                  Veja exatamente como este comunicado aparecerá no rodapé da barra lateral
                  (Sidebar) de cada integrador:
                </p>

                {/* Simulated Sidebar Box */}
                <div className="p-4 rounded-xl bg-[var(--color-sidebar)] border border-[var(--color-border)] shadow-inner">
                  <div className="text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
                    Rodapé da Barra Lateral:
                  </div>

                  {announcement.active ? (
                    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 relative shadow-sm">
                      {announcement.dismissible && (
                        <div className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-black/10 text-gray-400">
                          <span className="text-xs font-bold leading-none">✕</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2.5 pr-4">
                        <div className="p-1 rounded-md bg-amber-500/20 text-amber-500">
                          <Megaphone className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          {announcement.category && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              {announcement.category}
                            </span>
                          )}
                          <h5 className="text-xs font-bold mt-1 text-amber-900 dark:text-amber-100">
                            {announcement.title || "Título do Aviso"}
                          </h5>
                        </div>
                      </div>
                      <p className="text-[11px] mt-2 leading-relaxed">
                        {announcement.message ||
                          "Escreva a mensagem no formulário ao lado para pré-visualizar aqui."}
                      </p>
                      {announcement.actionText && (
                        <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                          <span className="underline">{announcement.actionText} →</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl border border-dashed border-[var(--color-border)] text-center text-xs text-[var(--color-muted-foreground)]">
                      Nenhum comunicado ativo no momento.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FEATURE FLAGS */}
        {/* ========================================================================= */}
        {activeTab === "flags" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-foreground)] flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-[var(--color-primary)]" />
                    Gerenciamento Global de Feature Flags
                  </h2>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                    Habilite ou suspenda funcionalidades instantaneamente em toda a plataforma para
                    todos os clientes
                  </p>
                </div>

                {flagSuccessMsg && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-in fade-in">
                    {flagSuccessMsg}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: "aiFeatures",
                    title: "IA Generativa Solar & Chatbot",
                    description:
                      "Assistente de propostas, geração de textos comerciais e chat de dúvidas técnicas com IA",
                    icon: Sparkles,
                  },
                  {
                    key: "newProposalEditor",
                    title: "Novo Editor de Propostas V2",
                    description:
                      "Interface avançada com blocos arrastáveis, visualização dinâmica e edição em tempo real",
                    icon: FileText,
                  },
                  {
                    key: "betaFinancing",
                    title: "Módulo de Financiamento Solar",
                    description:
                      "Simulação bancária de parcelas e envio direto de propostas para financeiras parceiras",
                    icon: Zap,
                  },
                  {
                    key: "audioTranscription",
                    title: "Transcrição de Áudio WhatsApp (IA)",
                    description:
                      "Processamento automático de áudios de clientes via WhatsApp utilizando Whisper",
                    icon: MessageSquare,
                  },
                  {
                    key: "publicAPI",
                    title: "API Pública & Webhooks de Integração",
                    description:
                      "Permite a clientes conectarem seus CRMs externos (HubSpot, RD Station) via token de API",
                    icon: Server,
                  },
                  {
                    key: "instantEnergyBillOCR",
                    title: "OCR Instantâneo de Contas de Energia",
                    description:
                      "Extração automatizada de histórico de consumo e concessionária por PDF ou imagem",
                    icon: Database,
                  },
                  {
                    key: "advancedFinancialSimulation",
                    title: "Simulador Financeiro Avançado (TIR/LCOE)",
                    description:
                      "Cálculo detalhado de Payback descontado, Taxa Interna de Retorno e inflação energética",
                    icon: Activity,
                  },
                  {
                    key: "maintenanceMode",
                    title: "Modo Manutenção Geral da Plataforma",
                    description:
                      "Exibe banner de manutenção e restringe novas criações para atualizações de infraestrutura",
                    icon: ShieldAlert,
                  },
                ].map((item) => {
                  const flagKey = item.key as keyof FeatureFlags;
                  const isEnabled = flags[flagKey];
                  const isSaving = savingFlagKey === flagKey;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.key}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                        isEnabled
                          ? "border-[var(--color-border)] bg-[var(--color-background)]"
                          : "border-[var(--color-border)]/50 bg-[var(--color-background)]/50 opacity-75"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            isEnabled
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-gray-500/10 text-gray-400"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                              {item.title}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isEnabled
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                              }`}
                            >
                              {isEnabled ? "ATIVO" : "INATIVO"}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFlag(flagKey)}
                        disabled={isSaving}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? "bg-emerald-500" : "bg-gray-600"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DIAGNÓSTICO & DEVOPS */}
        {/* ========================================================================= */}
        {activeTab === "tools" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Caches & Storage */}
              <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)]">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                      Gerenciamento de Caches & Sessões
                    </h3>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Limpeza de dados temporários e redefinição de estado
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--color-foreground)]">
                        Limpar Cache de Avisos Dispensados
                      </h4>
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">
                        Faz todos os comunicados voltarem a aparecer para você
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        Object.keys(localStorage).forEach((k) => {
                          if (k.startsWith("dismissed_notice_")) localStorage.removeItem(k);
                        });
                        window.dispatchEvent(new Event("system_announcement_updated"));
                        setToolFeedback("Cache de avisos limpo!");
                        setTimeout(() => setToolFeedback(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-card)] border border-[var(--color-border)] hover:bg-gray-500/10 text-[var(--color-foreground)] transition-colors"
                    >
                      Redefinir
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--color-foreground)]">
                        Limpar Rascunhos de Propostas
                      </h4>
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">
                        Libera espaço ocupado por propostas temporárias não salvas
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setToolFeedback("Rascunhos temporários sincronizados!");
                        setTimeout(() => setToolFeedback(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-card)] border border-[var(--color-border)] hover:bg-gray-500/10 text-[var(--color-foreground)] transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {toolFeedback && (
                  <p className="text-xs font-semibold text-emerald-500 animate-in fade-in">
                    ✓ {toolFeedback}
                  </p>
                )}
              </div>

              {/* Informações Técnicas do Runtime */}
              <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)]">
                  <Cpu className="h-5 w-5 text-[var(--color-primary)]" />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                      Especificações do Ambiente
                    </h3>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Dados do processo Node.js e orquestrador
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between p-2.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                    <span className="text-[var(--color-muted-foreground)]">Versão do Node.js:</span>
                    <span className="text-[var(--color-foreground)] font-bold">
                      {healthData?.nodeVersion || "v20.x"}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                    <span className="text-[var(--color-muted-foreground)]">
                      Ambiente de Execução:
                    </span>
                    <span className="text-[var(--color-foreground)] font-bold uppercase">
                      {healthData?.environment || "Production"}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                    <span className="text-[var(--color-muted-foreground)]">
                      Memória RSS alocada:
                    </span>
                    <span className="text-[var(--color-foreground)] font-bold">
                      {healthData?.memory?.rssMb || 140} MB
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                    <span className="text-[var(--color-muted-foreground)]">Mecanismo de PDF:</span>
                    <span className="text-[var(--color-foreground)] font-bold">
                      Puppeteer + Chromium Headless
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CANAIS DE INDICAÇÃO & ORIGEM */}
        {/* ========================================================================= */}
        {activeTab === "referrals" && (
          <div className="space-y-6">
            {/* Feedback Alert */}
            {referralFeedback && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{referralFeedback}</span>
                </div>
                <button
                  onClick={() => setReferralFeedback(null)}
                  className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* Header info */}
            <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-500/20">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-foreground)]">
                      Canais de Origem & Indicações de Integradores
                    </h2>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                      Configure as opções exibidas no menu suspenso obrigatório da tela de cadastro
                      de novos integradores (
                      <code className="text-[11px] font-mono text-[var(--color-primary)]">
                        /create-organization
                      </code>
                      ).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-foreground)]">
                    {referralSources.filter((s) => s.active).length} ativas de{" "}
                    {referralSources.length} opções
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to add a new option */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
                  <div className="flex items-center gap-2 pb-4 border-b border-[var(--color-border)]">
                    <Plus className="h-5 w-5 text-[var(--color-primary)]" />
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                        Adicionar Nova Opção
                      </h3>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Inclua uma nova origem no menu suspenso
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddReferralSource} className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">
                        Nome da Opção *
                      </label>
                      <input
                        type="text"
                        value={newReferralLabel}
                        onChange={(e) => setNewReferralLabel(e.target.value)}
                        placeholder="Ex: Podcast Solar, Feira Regional..."
                        className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-foreground)] focus:border-[#0f6b86] focus:outline-none focus:ring-2 focus:ring-[#0f6b86]/20 transition-colors"
                        required
                      />
                    </div>

                    <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/60 p-3.5">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newReferralRequiresDetails}
                          onChange={(e) => setNewReferralRequiresDetails(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-[var(--color-foreground)] block">
                            Exigir detalhes / &quot;Quem recomendou?&quot;
                          </span>
                          <span className="text-[var(--color-muted-foreground)] block mt-0.5">
                            Se marcado, o integrador terá que digitar o nome da pessoa, distribuidor
                            ou detalhes ao selecionar esta opção.
                          </span>
                        </div>
                      </label>

                      {newReferralRequiresDetails && (
                        <div className="pt-2 animate-in fade-in duration-200">
                          <label className="text-[11px] font-semibold text-[var(--color-foreground)] block mb-1">
                            Placeholder do campo de texto (opcional)
                          </label>
                          <input
                            type="text"
                            value={newReferralPlaceholder}
                            onChange={(e) => setNewReferralPlaceholder(e.target.value)}
                            placeholder="Ex: Nome da pessoa que recomendou"
                            className="w-full h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-xs text-[var(--color-foreground)] focus:border-[#0f6b86] focus:outline-none focus:ring-1 focus:ring-[#0f6b86]"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={savingReferral || !newReferralLabel.trim()}
                      className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      {savingReferral ? "Adicionando..." : "Incluir Opção no Menu"}
                    </button>
                  </form>
                </div>

                {/* Live Preview Box */}
                <div className="p-5 rounded-2xl bg-[linear-gradient(135deg,#08324F_0%,#0A4A63_60%,#0f6b86_100%)] text-white shadow-md space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-300" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                      Prévia na Tela de Cadastro
                    </h4>
                  </div>
                  <p className="text-xs text-white/80">
                    Veja como as opções ativas aparecem para os novos integradores no cadastro:
                  </p>

                  <div className="p-3.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm space-y-2">
                    <label className="text-[11px] font-semibold text-white/95 block">
                      Como conheceu a EnergivIA? *
                    </label>
                    <select
                      className="w-full h-8 px-2 rounded-lg bg-white text-slate-800 text-xs font-medium focus:outline-none cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecione uma opção...
                      </option>
                      {referralSources
                        .filter((s) => s.active)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* List of Referral Sources */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-[var(--color-primary)]" />
                      <div>
                        <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                          Opções do Menu Suspenso
                        </h3>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          Ative ou desative opções instantaneamente para incluir ou tirar do
                          cadastro
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => fetchReferralSources()}
                      disabled={loadingReferrals}
                      className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-background)] text-[var(--color-muted-foreground)] transition-colors cursor-pointer"
                      title="Atualizar lista"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${loadingReferrals ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>

                  {loadingReferrals && referralSources.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--color-muted-foreground)]">
                      Carregando opções...
                    </div>
                  ) : referralSources.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--color-muted-foreground)]">
                      Nenhuma opção configurada. Adicione uma no formulário ao lado.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-border)] pt-2">
                      {referralSources.map((source) => (
                        <div
                          key={source.id}
                          className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            !source.active
                              ? "opacity-60 bg-[var(--color-background)]/30 rounded-xl px-2"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                                source.active
                                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                                  : "bg-gray-400"
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-[var(--color-foreground)] truncate">
                                  {source.label}
                                </span>
                                {source.requiresDetails && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                                    Exige detalhe / quem indicou
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 font-mono">
                                ID: {source.id}
                                {source.detailsPlaceholder
                                  ? ` · Campo: "${source.detailsPlaceholder}"`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Toggle Ativo / Inativo */}
                            <button
                              onClick={() => handleToggleReferralActive(source.id, source.active)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border cursor-pointer ${
                                source.active
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                              }`}
                              title={
                                source.active
                                  ? "Clique para tirar do cadastro"
                                  : "Clique para incluir no cadastro"
                              }
                            >
                              {source.active ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Ativa no Cadastro
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5" />
                                  Inativa (Oculta)
                                </>
                              )}
                            </button>

                            {/* Delete Option */}
                            <button
                              onClick={() => handleDeleteReferralSource(source.id, source.label)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer"
                              title="Excluir opção permanentemente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "branding" && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                Identidade Visual da Plataforma
              </h3>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Personalize o logotipo geral da plataforma e a logo do WhatsApp exibida no topo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                    Logo Tema Escuro (Dark)
                  </h4>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Exibido quando o usuário está no modo escuro do sistema.
                  </p>
                </div>
                <ImageDropzone
                  label="Carregar Logo Escuro"
                  value={brandLogoDarkUrl}
                  onSelectFile={async (file) => {
                    try {
                      const url = await uploadOrganizationLogo(file);
                      setBrandLogoDarkUrl(url);
                      setBrandLogoUrl(url);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Erro ao enviar imagem");
                    }
                  }}
                  onClear={() => {
                    setBrandLogoDarkUrl("");
                    setBrandLogoUrl("");
                  }}
                  accept="image/jpeg,image/png,image/webp"
                  helperText="Formatos aceitos: JPG, PNG, WEBP."
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                    Logo Tema Claro (Light)
                  </h4>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Exibido quando o usuário está no modo claro do sistema.
                  </p>
                </div>
                <ImageDropzone
                  label="Carregar Logo Claro"
                  value={brandLogoLightUrl}
                  onSelectFile={async (file) => {
                    try {
                      const url = await uploadOrganizationLogo(file);
                      setBrandLogoLightUrl(url);
                      if (!brandLogoDarkUrl) setBrandLogoUrl(url);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Erro ao enviar imagem");
                    }
                  }}
                  onClear={() => {
                    setBrandLogoLightUrl("");
                  }}
                  accept="image/jpeg,image/png,image/webp"
                  helperText="Formatos aceitos: JPG, PNG, WEBP."
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                    Símbolo do WhatsApp (IA no WhatsApp)
                  </h4>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Modifica o ícone verde de WhatsApp exibido no botão superior direito do sistema.
                  </p>
                </div>
                <ImageDropzone
                  label="Carregar Ícone do WhatsApp"
                  value={whatsappLogoUrl}
                  onSelectFile={async (file) => {
                    try {
                      const url = await uploadOrganizationLogo(file);
                      setWhatsappLogoUrl(url);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Erro ao enviar imagem");
                    }
                  }}
                  onClear={() => setWhatsappLogoUrl("")}
                  accept="image/jpeg,image/png,image/webp"
                  helperText="Formatos aceitos: JPG, PNG, WEBP."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
              <button
                onClick={async () => {
                  setSavingBranding(true);
                  try {
                    const res = await fetch("/api/proxy/system-settings/branding", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        brandLogoUrl: brandLogoDarkUrl || brandLogoUrl,
                        brandLogoDarkUrl,
                        brandLogoLightUrl,
                        whatsappLogoUrl,
                      }),
                    });
                    if (res.ok) {
                      alert("Identidade visual salva com sucesso!");
                      window.location.reload();
                    } else {
                      const data = await res.json().catch(() => ({}));
                      alert(
                        "Ocorreu um erro ao salvar as configurações: " +
                          (data.details || "Erro desconhecido")
                      );
                    }
                  } catch {
                    alert("Falha ao se conectar com o servidor.");
                  } finally {
                    setSavingBranding(false);
                  }
                }}
                disabled={savingBranding}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {savingBranding ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Identidade Visual
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
