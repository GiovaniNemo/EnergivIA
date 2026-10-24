"use client";

import { useEffect, useState, useCallback } from "react";
import { Handshake, RefreshCw, Briefcase, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  type SalesRepSummary,
  type SalesRepTenant,
  getSalesRepSummary,
  listSalesRepTenants,
} from "@/lib/sales-rep-api";
import { SalesRepLinkCard } from "@/components/sales-rep/SalesRepLinkCard";
import { SalesRepKpiCards } from "@/components/sales-rep/SalesRepKpiCards";
import { SalesRepTenantsTable } from "@/components/sales-rep/SalesRepTenantsTable";
import { SalesRepTenantDrawer } from "@/components/sales-rep/SalesRepTenantDrawer";
import { SalesRepManagementSection } from "@/components/sales-rep/SalesRepManagementSection";

const PLATFORM_ADMIN_EMAILS = [
  "sgiovanimendes@gmail.com",
  "contato@energivia.com.br",
  "admin@energivia.com.br",
];

export default function AdminComercialPage(): JSX.Element {
  const { user, currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState<"carteira" | "equipe">("carteira");

  const [summary, setSummary] = useState<SalesRepSummary | null>(null);
  const [tenants, setTenants] = useState<SalesRepTenant[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [filter, setFilter] = useState<"all" | "trial" | "active" | "churn_risk">("all");
  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<SalesRepTenant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const userEmail = (user?.email || "").toLowerCase().trim();
  const globalRole = (user?.role || "").toUpperCase();
  const orgRole = (currentOrganization?.role || "").toUpperCase();

  const isPlatform =
    globalRole === "PLATFORM" ||
    globalRole === "SUPERADMIN" ||
    orgRole === "PLATFORM" ||
    PLATFORM_ADMIN_EMAILS.includes(userEmail);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await getSalesRepSummary();
      setSummary(data);
    } catch {
      // Falha tratada com fallback
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    setLoadingTenants(true);
    try {
      const data = await listSalesRepTenants(filter, search);
      setTenants(data);
    } catch {
      // Falha tratada
    } finally {
      setLoadingTenants(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchTenants]);

  const handleOpenNotes = (tenant: SalesRepTenant) => {
    setSelectedTenant(tenant);
    setDrawerOpen(true);
  };

  const handleNoteAdded = () => {
    fetchTenants();
    fetchSummary();
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-1">
            <Handshake className="h-3.5 w-3.5" />
            Product-Led Sales
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Portal Comercial EnergivIA
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-slate-400 mt-0.5">
            Gestão de carteira de integradores, acompanhamento de ativação no trial e liberação de
            vendedores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSummary();
              fetchTenants();
            }}
            className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 gap-2 text-xs shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Abas Super Admin (apenas visíveis se for Super Admin da Plataforma) */}
      {isPlatform && (
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("carteira")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === "carteira"
                ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/30 font-semibold shadow-xs"
                : "text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Minha Carteira & Link</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("equipe")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === "equipe"
                ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/30 font-semibold shadow-xs"
                : "text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Liberação & Equipe de Vendedores</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-500/30 font-bold">
              Admin
            </span>
          </button>
        </div>
      )}

      {/* Conteúdo da Aba: Gestão & Liberação de Vendedores */}
      {isPlatform && activeTab === "equipe" ? (
        <SalesRepManagementSection />
      ) : (
        <>
          {/* Card de Link Exclusivo */}
          <SalesRepLinkCard
            referralCode={summary?.referralCode}
            referralLink={summary?.referralLink}
          />

          {/* Cards de KPIs */}
          <SalesRepKpiCards summary={summary} loading={loadingSummary} />

          {/* Tabela de Empresas & Termômetro */}
          <SalesRepTenantsTable
            tenants={tenants}
            loading={loadingTenants}
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
            onOpenNotes={handleOpenNotes}
          />

          {/* Drawer de Notas & Histórico */}
          <SalesRepTenantDrawer
            tenant={selectedTenant}
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onNoteAdded={handleNoteAdded}
          />
        </>
      )}
    </div>
  );
}
