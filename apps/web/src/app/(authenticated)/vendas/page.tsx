/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileSignature,
  FileText,
  Filter,
  Plus,
  Search,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { listSales } from "@/lib/sales-api";
import { cn } from "@energivia/utils";

interface SaleListItem {
  id: string;
  status: string;
  customerType: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerCpfCnpj: string | null;
  city: string | null;
  state: string | null;
  systemPowerKwp: number | null;
  totalValue: number | null;
  utilityCompany: string | null;
  ucNumber: string | null;
  createdAt: string;
  proposal?: {
    id: string;
    title: string;
    customer_name: string;
  } | null;
  documents?: Array<{
    id: string;
    documentType: string;
    signStatus: string;
    signToken: string;
  }>;
}

const SALE_STATUS_MAP: Record<string, { label: string; badgeClass: string; icon: LucideIcon }> = {
  AWAITING_ANALYSIS: {
    label: "Aguardando Análise",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: Clock,
  },
  DOCUMENTS_PENDING: {
    label: "Documentos Pendentes",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    icon: FileText,
  },
  SIGNATURE_PENDING: {
    label: "Em Assinatura",
    badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
    icon: FileSignature,
  },
  SIGNED: {
    label: "Contrato Assinado",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  COMPLETED: {
    label: "Concluída",
    badgeClass: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    icon: BadgeCheck,
  },
  CANCELLED: {
    label: "Cancelada",
    badgeClass: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    icon: Clock,
  },
  CANCELED: {
    label: "Cancelada",
    badgeClass: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    icon: Clock,
  },
};

function formatBrl(val: number | null | undefined): string {
  if (val == null || typeof val !== "number" || Number.isNaN(val)) return "R$ 0,00";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function VendasPage(): JSX.Element {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await listSales({ limit: 100 });
        setSales(res.items || []);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar vendas");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter((item) => {
      const matchStatus = selectedStatus === "ALL" || item.status === selectedStatus;
      const term = search.trim().toLowerCase();
      const matchSearch =
        !term ||
        item.customerName?.toLowerCase().includes(term) ||
        item.customerCpfCnpj?.toLowerCase().includes(term) ||
        item.city?.toLowerCase().includes(term) ||
        item.utilityCompany?.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term);

      return matchStatus && matchSearch;
    });
  }, [sales, selectedStatus, search]);

  const stats = useMemo(() => {
    const total = sales.length;
    const awaiting = sales.filter(
      (s) => s.status === "AWAITING_ANALYSIS" || s.status === "DOCUMENTS_PENDING"
    ).length;
    const signing = sales.filter((s) => s.status === "SIGNATURE_PENDING").length;
    const signed = sales.filter((s) => s.status === "SIGNED" || s.status === "COMPLETED").length;
    const totalRevenue = sales.reduce((acc, s) => acc + (s.totalValue || 0), 0);

    return { total, awaiting, signing, signed, totalRevenue };
  }, [sales]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              Gestão de Vendas & Contratos
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Acompanhe orçamentos convertidos, preenchimento cadastral, emissão de contratos e
            assinaturas digitais.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/proposals"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-sm transition hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <Plus className="h-4 w-4" />
            Novo Orçamento / Proposta
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-[var(--color-border)] bg-[var(--color-card)]/90 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Total de Vendas
            </CardTitle>
            <Zap className="h-4 w-4 text-[var(--color-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">{stats.total}</div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Volume: {formatBrl(stats.totalRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-card)]/90 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Aguardando Documentos
            </CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {stats.awaiting}
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Ficha em complemento
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-card)]/90 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Em Assinatura
            </CardTitle>
            <FileSignature className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">{stats.signing}</div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Link enviado ao cliente
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-card)]/90 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Contratos Assinados
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">{stats.signed}</div>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              Prontos p/ homologação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, CPF, concessionária ou cidade..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] py-2 pl-9 pr-4 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          >
            <option value="ALL">Todos os Status</option>
            <option value="AWAITING_ANALYSIS">Aguardando Análise</option>
            <option value="DOCUMENTS_PENDING">Documentos Pendentes</option>
            <option value="SIGNATURE_PENDING">Em Assinatura</option>
            <option value="SIGNED">Contrato Assinado</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingState message="Carregando vendas e contratos..." />
      ) : error ? (
        <Card className="border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </Card>
      ) : filteredSales.length === 0 ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <BadgeCheck className="h-8 w-8" />
          </div>
          <CardTitle className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">
            Nenhuma venda encontrada
          </CardTitle>
          <CardDescription className="mx-auto mt-2 max-w-md text-sm text-[var(--color-muted-foreground)]">
            Quando um cliente aceitar um orçamento, clique em &ldquo;Converter para Venda&rdquo; na
            listagem de propostas para iniciar a ficha técnica, gerar contratos em PDF e coletar
            assinaturas digitais.
          </CardDescription>
          <div className="mt-6">
            <Link
              href="/proposals"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-95"
            >
              Ir para Orçamentos & Propostas
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSales.map((sale) => {
            const statusConfig = SALE_STATUS_MAP[sale.status] || {
              label: sale.status,
              badgeClass: "border-[var(--color-border)] bg-[var(--color-muted)]",
              icon: Clock,
            };
            const StatusIcon = statusConfig.icon;

            const hasContract = sale.documents?.some((d) =>
              String(d?.templateType || d?.documentType || "").startsWith("CONTRATO")
            );
            const hasPoa = sale.documents?.some((d) =>
              String(d?.templateType || d?.documentType || "").startsWith("PROCURACAO")
            );
            const allSigned =
              sale.documents &&
              sale.documents.length > 0 &&
              sale.documents.every((d) => (d?.status || d?.signStatus) === "SIGNED");

            return (
              <Card
                key={sale.id}
                className="group flex flex-col justify-between border-[var(--color-border)] bg-[var(--color-card)] transition hover:border-[var(--color-primary)]/40 hover:shadow-md"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          statusConfig.badgeClass
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted-foreground)]">
                        {formatDate(sale.createdAt)}
                      </span>
                    </div>

                    <CardTitle className="mt-2 text-base font-semibold leading-snug text-[var(--color-foreground)]">
                      {sale.customerName || "Cliente não informado"}
                    </CardTitle>

                    <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                      <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-medium">
                        {sale.customerType === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
                      </span>
                      {sale.city && sale.state && (
                        <span>
                          {sale.city}/{sale.state}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3 text-xs">
                    {/* Technical details grid */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-muted)]/50 p-2.5">
                      <div>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">
                          Potência do Sistema
                        </span>
                        <div className="font-semibold text-[var(--color-foreground)]">
                          {sale.systemPowerKwp ? `${sale.systemPowerKwp.toFixed(2)} kWp` : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">
                          Valor da Venda
                        </span>
                        <div className="font-semibold text-[var(--color-foreground)]">
                          {formatBrl(sale.totalValue)}
                        </div>
                      </div>
                      {sale.utilityCompany && (
                        <div className="col-span-2 pt-1 border-t border-[var(--color-border)]/50 flex justify-between">
                          <span className="text-[11px] text-[var(--color-muted-foreground)]">
                            Concessionária / UC:
                          </span>
                          <span className="font-medium text-[var(--color-foreground)]">
                            {sale.utilityCompany} {sale.ucNumber ? `· UC ${sale.ucNumber}` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Document Status Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border",
                          hasContract
                            ? allSigned
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            : "border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                        )}
                      >
                        <FileText className="h-3 w-3" />
                        Contrato {hasContract ? (allSigned ? "✓" : "Gerado") : "Pendente"}
                      </span>

                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border",
                          hasPoa
                            ? allSigned
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            : "border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                        )}
                      >
                        <FileCheck2 className="h-3 w-3" />
                        Procuração {hasPoa ? (allSigned ? "✓" : "Gerada") : "Pendente"}
                      </span>
                    </div>
                  </CardContent>
                </div>

                <div className="border-t border-[var(--color-border)] p-3 bg-[var(--color-card)]/50 rounded-b-xl flex items-center justify-between">
                  <Link
                    href={`/vendas/${sale.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
                  >
                    Abrir Ficha da Venda
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
