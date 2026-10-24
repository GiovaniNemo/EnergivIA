"use client";

import {
  Search,
  MessageSquare,
  FileText,
  Phone,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import type { SalesRepTenant } from "@/lib/sales-rep-api";
import { Button } from "@/components/ui/button";

interface SalesRepTenantsTableProps {
  tenants: SalesRepTenant[];
  loading?: boolean;
  filter: "all" | "trial" | "active" | "churn_risk";
  onFilterChange: (filter: "all" | "trial" | "active" | "churn_risk") => void;
  search: string;
  onSearchChange: (search: string) => void;
  onOpenNotes: (tenant: SalesRepTenant) => void;
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  TRIAL_ONBOARDING: {
    label: "Onboarding Trial",
    color:
      "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  },
  DEMO: {
    label: "Demo Realizada",
    color:
      "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20",
  },
  NEGOTIATING: {
    label: "Negociando Plano",
    color:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  },
  WON: {
    label: "Cliente Ativado",
    color:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  },
  CHURN_RISK: {
    label: "Risco de Churn",
    color:
      "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
  },
};

export function SalesRepTenantsTable({
  tenants,
  loading,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onOpenNotes,
}: SalesRepTenantsTableProps): JSX.Element {
  const tabs = [
    { id: "all", label: "Todas as Empresas" },
    { id: "trial", label: "Em Teste (Trials)" },
    { id: "active", label: "Clientes Pagantes" },
    { id: "churn_risk", label: "Risco de Churn" },
  ] as const;

  const handleOpenWhatsApp = (tenant: SalesRepTenant) => {
    const rawPhone = tenant.primaryContact?.phone?.replace(/\D/g, "");
    if (!rawPhone) return;

    const contactName = tenant.primaryContact?.name || "Parceiro";
    let message = `Olá ${contactName}! Sou o consultor de ativação da EnergivIA. Como está sendo sua experiência na plataforma?`;

    if (tenant.isTrial && tenant.proposalsCount === 0) {
      message = `Olá ${contactName}! Sou da equipe EnergivIA. Vi que você iniciou o teste na plataforma. Posso te ajudar a gerar sua 1ª proposta solar inteligente em 2 minutos?`;
    } else if (tenant.isTrial && tenant.proposalsCount > 0 && tenant.trialDaysLeft <= 2) {
      message = `Olá ${contactName}! Vi que você já emitiu ${tenant.proposalsCount} proposta(s) com a EnergivIA! Seu período de teste encerra em breve. Gostaria de condições especiais para formalizar seu plano?`;
    }

    const cleanNumber = rawPhone.startsWith("55") ? rawPhone : `55${rawPhone}`;
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white dark:bg-[#050811]/70 backdrop-blur-md shadow-xs dark:shadow-xl overflow-hidden">
      {/* Barra Superior: Abas e Busca */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/90 dark:border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Abas */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFilterChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  active
                    ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/30 font-semibold shadow-xs"
                    : "text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por empresa, nome ou e-mail..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-slate-400 outline-none focus:border-emerald-500/50 shadow-inner dark:shadow-none"
          />
        </div>
      </div>

      {/* Conteúdo da Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-700 dark:text-slate-300">
          <thead className="bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/[0.06] text-zinc-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th className="py-3.5 px-4 sm:px-6">Empresa & Contato</th>
              <th className="py-3.5 px-4">Plano & Teste</th>
              <th className="py-3.5 px-4">Termômetro de Uso</th>
              <th className="py-3.5 px-4">Última Atividade</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Ações Rápidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/70 dark:divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 w-32 bg-zinc-200 dark:bg-white/10 rounded mb-1.5" />
                    <div className="h-3 w-24 bg-zinc-100 dark:bg-white/5 rounded" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 w-20 bg-zinc-200 dark:bg-white/10 rounded-full" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 w-36 bg-zinc-200 dark:bg-white/10 rounded" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-28 bg-zinc-200 dark:bg-white/10 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <div className="h-8 w-16 bg-zinc-200 dark:bg-white/10 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-500 dark:text-slate-400">
                  <Building2 className="h-10 w-10 mx-auto mb-2 text-zinc-400 dark:text-slate-500 opacity-60" />
                  <p className="font-semibold text-zinc-800 dark:text-slate-300">
                    Nenhum integrador encontrado
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1">
                    Compartilhe seu link exclusivo de indicação para trazer novos clientes para sua
                    carteira.
                  </p>
                </td>
              </tr>
            ) : (
              tenants.map((t) => {
                const stageInfo = STAGE_LABELS[t.lastNote?.stage || "TRIAL_ONBOARDING"] || {
                  label: "Onboarding Trial",
                  color:
                    "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
                };

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Empresa & Contato */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-semibold text-zinc-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                        {t.name}
                      </div>
                      <div className="text-zinc-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                        <span>{t.primaryContact?.name || "Sem contato informado"}</span>
                        {t.primaryContact?.email && (
                          <span className="text-zinc-400 dark:text-slate-400 font-mono">
                            • {t.primaryContact.email}
                          </span>
                        )}
                      </div>
                      {t.primaryContact?.phone && (
                        <div className="text-[11px] text-zinc-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-zinc-400 dark:text-slate-400" />
                          {t.primaryContact.phone}
                        </div>
                      )}
                    </td>

                    {/* Plano & Teste */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {t.isTrial ? (
                        <div className="inline-flex flex-col">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              t.trialDaysLeft === 0
                                ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                                : t.trialDaysLeft <= 2
                                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20"
                                  : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {t.trialDaysLeft === 0
                              ? "Trial Expirado"
                              : `${t.trialDaysLeft} dias de teste`}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Plano Ativo
                          </span>
                          {t.currentInstallment && (
                            <span
                              className="inline-flex items-center text-[10px] font-mono text-emerald-800 dark:text-emerald-300/90 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20"
                              title={`Parcela ${t.currentInstallment.installment} (${t.currentInstallment.tierLabel})`}
                            >
                              {t.currentInstallment.installment}ª parcela •{" "}
                              {t.currentInstallment.rate}%
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Termômetro de Uso */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Propostas */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${
                            t.proposalsCount > 2
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20"
                              : t.proposalsCount > 0
                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20"
                                : "bg-zinc-100 dark:bg-slate-800 text-zinc-500 dark:text-slate-400 border-zinc-200 dark:border-slate-700"
                          }`}
                          title="Propostas geradas"
                        >
                          <FileText className="h-3 w-3" />
                          {t.proposalsCount} prop.
                        </span>

                        {/* WhatsApp */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                            t.hasWhatsappConnected
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20"
                              : "bg-zinc-100 dark:bg-slate-800 text-zinc-500 dark:text-slate-400 border-zinc-200 dark:border-slate-700"
                          }`}
                          title="WhatsApp Conectado"
                        >
                          <MessageSquare className="h-3 w-3" />
                          {t.hasWhatsappConnected ? "Zap ON" : "Zap OFF"}
                        </span>

                        {/* Faturas */}
                        {t.billsCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                            {t.billsCount} fat.
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Última Atividade & Estágio */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stageInfo.color}`}
                      >
                        {stageInfo.label}
                      </span>
                      {t.lastNote && (
                        <p className="text-zinc-500 dark:text-slate-400 text-xs mt-1 truncate max-w-[180px]">
                          {t.lastNote.content}
                        </p>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {t.primaryContact?.phone && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenWhatsApp(t)}
                            className="h-8 px-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 gap-1.5 shadow-xs"
                            title="Conversar no WhatsApp"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenNotes(t)}
                          className="h-8 px-2.5 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 gap-1.5"
                          title="Ver notas e histórico comercial"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Notas</span>
                          <ChevronRight className="h-3 w-3 opacity-60" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
