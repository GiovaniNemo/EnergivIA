"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  Building2,
  AlertCircle,
  Clock,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntegratorActivationItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  organizationId: string | null;
  organizationName: string | null;
  onboardingStatus: string;
  activationStatus: "ABANDONED_ONBOARDING" | "REGISTERED_NO_USAGE" | "ACTIVE";
  totalProposals: number;
  createdAt: string;
  lastActiveAt: string | null;
  onboardingAbandonedAt: string | null;
}

interface ActivationSummary {
  total: number;
  abandoned: number;
  registeredNoUsage: number;
  active: number;
}

const PLATFORM_ADMIN_EMAILS = [
  "sgiovanimendes@gmail.com",
  "contato@energivia.com.br",
  "admin@energivia.com.br",
];

function formatPhoneDisplay(val: string | null): string {
  if (!val) return "Não informado";
  const clean = val.replace(/\D/g, "");
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return val;
}

function getWhatsAppUrl(phone: string | null, name: string, status: string): string | null {
  if (!phone) return null;
  const rawDigits = phone.replace(/\D/g, "");
  if (rawDigits.length < 10) return null;
  const fullNumber = rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`;

  let message = "";
  if (status === "ABANDONED_ONBOARDING") {
    message = `Olá ${name}, vi que você iniciou o cadastro na EnergivIA! Posso te ajudar com alguma dúvida técnica ou na configuração para você começar a gerar suas propostas?`;
  } else if (status === "REGISTERED_NO_USAGE") {
    message = `Olá ${name}, tudo bem? Notei que você criou sua conta na EnergivIA mas ainda não gerou propostas. Gostaria de uma demonstração rápida de como gerar um orçamento solar com IA em menos de 1 minuto?`;
  } else {
    message = `Olá ${name}, tudo bem? Sou da equipe EnergivIA e estou à disposição para apoiar você e sua empresa nas suas vendas solares!`;
  }

  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

export default function IntegratorsActivationPage() {
  const router = useRouter();
  const { user, currentOrganization } = useOrganization();
  const [items, setItems] = useState<IntegratorActivationItem[]>([]);
  const [summary, setSummary] = useState<ActivationSummary>({
    total: 0,
    abandoned: 0,
    registeredNoUsage: 0,
    active: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "ABANDONED_ONBOARDING" | "REGISTERED_NO_USAGE" | "ACTIVE"
  >("ALL");

  const userEmail = (user?.email || "").toLowerCase().trim();
  const globalRole = (user?.role || "").toUpperCase();
  const orgRole = (currentOrganization?.role || "").toUpperCase();

  const isPlatform =
    globalRole === "PLATFORM" ||
    globalRole === "SUPERADMIN" ||
    orgRole === "PLATFORM" ||
    PLATFORM_ADMIN_EMAILS.includes(userEmail);

  useEffect(() => {
    if (user && !isPlatform) {
      router.replace("/painel");
    }
  }, [user, isPlatform, router]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/admin/activation-status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error("Falha ao carregar status de ativação:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isPlatform) {
      fetchData();
    }
  }, [isPlatform, fetchData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeFilter !== "ALL" && item.activationStatus !== activeFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const matchName = item.name.toLowerCase().includes(term);
      const matchEmail = item.email.toLowerCase().includes(term);
      const matchPhone = (item.phone || "").toLowerCase().includes(term);
      const matchOrg = (item.organizationName || "").toLowerCase().includes(term);

      return matchName || matchEmail || matchPhone || matchOrg;
    });
  }, [items, activeFilter, searchTerm]);

  if (!isPlatform && !loading) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f6b86]/10 text-[#0f6b86] dark:text-[#38bdf8] shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Integradores & Termômetro de Ativação
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Monitore quem iniciou o cadastro e desistiu, quem se cadastrou mas não gerou
                propostas e quem está ativo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <div
          onClick={() => setActiveFilter("ALL")}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-xs ${
            activeFilter === "ALL"
              ? "border-[#1f7f9b] bg-[#1f7f9b]/5 ring-2 ring-[#1f7f9b]/20"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total de Integradores</span>
            <Users className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {summary.total}
            </span>
            <span className="text-xs text-zinc-500">cadastros</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Base completa de usuários registrados
          </p>
        </div>

        {/* Abandoned */}
        <div
          onClick={() => setActiveFilter("ABANDONED_ONBOARDING")}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-xs ${
            activeFilter === "ABANDONED_ONBOARDING"
              ? "border-red-500 bg-red-500/5 ring-2 ring-red-500/20"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-red-400/50"
          }`}
        >
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 text-xs font-semibold uppercase tracking-wider">
            <span>Abandonaram Cadastro</span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">
              {summary.abandoned}
            </span>
            <span className="text-xs text-red-500/80">desistências</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Pararam no onboarding antes de criar empresa
          </p>
        </div>

        {/* Registered No Usage */}
        <div
          onClick={() => setActiveFilter("REGISTERED_NO_USAGE")}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-xs ${
            activeFilter === "REGISTERED_NO_USAGE"
              ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-amber-400/50"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <span>Cadastrado Sem Uso</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary.registeredNoUsage}
            </span>
            <span className="text-xs text-amber-500/80">0 propostas</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Completaram cadastro mas não geraram propostas
          </p>
        </div>

        {/* Active */}
        <div
          onClick={() => setActiveFilter("ACTIVE")}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-xs ${
            activeFilter === "ACTIVE"
              ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-emerald-400/50"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>Integradores Ativos</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary.active}
            </span>
            <span className="text-xs text-emerald-500/80">ativos</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Empresa criada e com propostas geradas
          </p>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeFilter === "ALL"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Todos ({summary.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ABANDONED_ONBOARDING")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeFilter === "ABANDONED_ONBOARDING"
                ? "bg-red-500 text-white"
                : "text-red-600 dark:text-red-400 hover:bg-red-500/10"
            }`}
          >
            Abandonaram Cadastro ({summary.abandoned})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("REGISTERED_NO_USAGE")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeFilter === "REGISTERED_NO_USAGE"
                ? "bg-amber-500 text-white"
                : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            }`}
          >
            Cadastrados Sem Uso ({summary.registeredNoUsage})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ACTIVE")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeFilter === "ACTIVE"
                ? "bg-emerald-600 text-white"
                : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            Ativos ({summary.active})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone..."
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Integrador</th>
                <th className="px-4 py-3.5">WhatsApp / Celular</th>
                <th className="px-4 py-3.5">Empresa</th>
                <th className="px-4 py-3.5 text-center">Propostas</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Data de Registro</th>
                <th className="px-4 py-3.5 text-right">Contato Comercial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#1f7f9b]" />
                    <p className="mt-2 text-xs">Carregando dados dos integradores...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    Nenhum integrador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const waUrl = getWhatsAppUrl(item.phone, item.name, item.activationStatus);
                  const formattedDate = new Date(item.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                    >
                      {/* Integrador */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.name || "Integrador"}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {item.email}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3.5 font-mono">
                        {item.phone ? (
                          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                            <Phone className="h-3.5 w-3.5 text-[#1f7f9b]" />
                            <span>{formatPhoneDisplay(item.phone)}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Não informado</span>
                        )}
                      </td>

                      {/* Empresa */}
                      <td className="px-4 py-3.5">
                        {item.organizationName ? (
                          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium">
                            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{item.organizationName}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">
                            Sem empresa (onboarding pendente)
                          </span>
                        )}
                      </td>

                      {/* Propostas */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                            item.totalProposals > 0
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {item.totalProposals}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {item.activationStatus === "ABANDONED_ONBOARDING" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            Abandonou Cadastro
                          </span>
                        ) : item.activationStatus === "REGISTERED_NO_USAGE" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            Cadastrado Sem Uso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {formattedDate}
                      </td>

                      {/* Ação WhatsApp */}
                      <td className="px-4 py-3.5 text-right">
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Chamar no WhatsApp
                            <ExternalLink className="h-3 w-3 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">Sem WhatsApp</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
