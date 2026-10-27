/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileSignature,
  FileText,
  Fingerprint,
  MapPin,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { generateSaleDocument, getSaleById, updateSale } from "@/lib/sales-api";
import { cn } from "@energivia/utils";

const SALE_STATUS_OPTIONS = [
  { value: "AWAITING_ANALYSIS", label: "Aguardando Análise" },
  { value: "DOCUMENTS_PENDING", label: "Documentos Pendentes" },
  { value: "SIGNATURE_PENDING", label: "Em Assinatura" },
  { value: "SIGNED", label: "Contrato Assinado" },
  { value: "COMPLETED", label: "Concluída" },
  { value: "CANCELLED", label: "Cancelada" },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function VendaDetailPage(): JSX.Element {
  const params = useParams();
  const saleId = params["id"] as string;

  const [activeTab, setActiveTab] = useState<"cadastro" | "documentos" | "auditoria">("cadastro");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sale, setSale] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerType: "PF",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCpfCnpj: "",
    customerRgIe: "",
    maritalStatus: "Casado(a)",
    profession: "",
    addressStreet: "",
    addressNumber: "",
    addressComp: "",
    addressNeighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    utilityCompany: "CEMIG",
    ucNumber: "",
    systemPowerKwp: "",
    totalValue: "",
    paymentMethod: "Financiamento Bancário",
    status: "AWAITING_ANALYSIS",
    notes: "",
  });

  async function loadSale() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSaleById(saleId);
      setSale(data);
      setFormData({
        customerType: data.customerType || "PF",
        customerName: data.customerName || "",
        customerEmail: data.customerEmail || "",
        customerPhone: data.customerPhone || "",
        customerCpfCnpj: data.customerCpfCnpj || "",
        customerRgIe: data.customerRgIe || "",
        maritalStatus: data.maritalStatus || "Casado(a)",
        profession: data.profession || "",
        addressStreet: data.addressStreet || "",
        addressNumber: data.addressNumber || "",
        addressComp: data.addressComp || "",
        addressNeighborhood: data.addressNeighborhood || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zipCode || "",
        utilityCompany: data.utilityCompany || "CEMIG",
        ucNumber: data.ucNumber || "",
        systemPowerKwp: data.systemPowerKwp != null ? String(data.systemPowerKwp) : "",
        totalValue: data.totalValue != null ? String(data.totalValue) : "",
        paymentMethod: data.paymentMethod || "Financiamento Bancário",
        status: data.status || "AWAITING_ANALYSIS",
        notes: data.notes || "",
      });
    } catch (err: any) {
      setError(err.message || "Erro ao carregar detalhes da venda");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (saleId) {
      loadSale();
    }
  }, [saleId]);

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const updated = await updateSale(saleId, {
        customerType: formData.customerType,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerCpfCnpj: formData.customerCpfCnpj,
        customerRgIe: formData.customerRgIe,
        maritalStatus: formData.maritalStatus,
        profession: formData.profession,
        addressStreet: formData.addressStreet,
        addressNumber: formData.addressNumber,
        addressComp: formData.addressComp,
        addressNeighborhood: formData.addressNeighborhood,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        utilityCompany: formData.utilityCompany,
        ucNumber: formData.ucNumber,
        systemPowerKwp: formData.systemPowerKwp ? parseFloat(formData.systemPowerKwp) : undefined,
        totalValue: formData.totalValue ? parseFloat(formData.totalValue) : undefined,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        notes: formData.notes,
      });
      setSale(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateDoc(docType: "CONTRATO_PF" | "PROCURACAO_PF") {
    setGeneratingDoc(docType);
    setError(null);
    try {
      await generateSaleDocument(saleId, docType);
      await loadSale();
      setActiveTab("documentos");
    } catch (err: any) {
      setError(err.message || "Erro ao gerar documento");
    } finally {
      setGeneratingDoc(null);
    }
  }

  function handleCopySignLink(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/assinar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 3000);
  }

  function handleCopyWhatsAppMessage(doc: any) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const token = doc?.publicToken || doc?.signToken || "";
    const signUrl = `${origin}/assinar/${token}`;
    const clientFirstName = (formData.customerName || "Cliente").split(" ")[0];
    const docType = String(doc?.templateType || doc?.documentType || "");
    const docName = docType.startsWith("CONTRATO")
      ? "Contrato de Venda do Sistema Solar"
      : "Procuração para Homologação ANEEL";

    const text =
      `Olá, ${clientFirstName}! Segue o link para assinar digitalmente o seu ${docName} de forma rápida e segura direto pelo celular:\n\n` +
      `${signUrl}\n\n` +
      `A assinatura conta com certificação eletrônica e código de segurança. Qualquer dúvida, estou à disposição!`;

    navigator.clipboard.writeText(text);
    setCopiedMsg(doc.id);
    setTimeout(() => setCopiedMsg(null), 3000);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <LoadingState message="Carregando ficha da venda..." />
      </div>
    );
  }

  if (error && !sale) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <Card className="border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <div className="mt-4">
            <Link
              href="/vendas"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para Vendas
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      {/* Top Bar Navigation */}
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/vendas"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
                {sale?.customerName || "Ficha da Venda"}
              </h1>
              <span className="rounded bg-[var(--color-muted)] px-2 py-0.5 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                {sale?.customerType}
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Convertida em {formatDate(sale?.createdAt)}
              {sale?.proposal?.id && (
                <>
                  {" "}
                  · Proposta de Origem:{" "}
                  <Link
                    href={`/proposals`}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Ver Proposta
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Status Dropdown & Save CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Status:
            </span>
            <select
              value={formData.status}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, status: e.target.value }));
                updateSale(saleId, { status: e.target.value }).then((res) => setSale(res));
              }}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
            >
              {SALE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          Alterações salvas com sucesso! Os novos dados serão utilizados na emissão de documentos.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab("cadastro")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors",
            activeTab === "cadastro"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          )}
        >
          <User className="h-4 w-4" />
          1. Ficha Cadastral & Dados
        </button>

        <button
          onClick={() => setActiveTab("documentos")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors",
            activeTab === "documentos"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          )}
        >
          <FileSignature className="h-4 w-4" />
          2. Contratos & Assinatura Digital
          {sale?.documents?.length > 0 && (
            <span className="ml-1 rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-[10px] text-[var(--color-primary)]">
              {sale.documents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("auditoria")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors",
            activeTab === "auditoria"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          3. Trilha de Auditoria Jurídica
        </button>
      </div>

      {/* Tab 1: Ficha Cadastral */}
      {activeTab === "cadastro" && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Identificação do Cliente */}
          <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[var(--color-primary)]" />
                <CardTitle className="text-sm font-semibold">Identificação do Titular</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Dados do cliente titular do contrato e da unidade consumidora.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Tipo de Pessoa
                </label>
                <select
                  value={formData.customerType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerType: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="PF">Pessoa Física (PF)</option>
                  <option value="PJ">Pessoa Jurídica (PJ)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Nome Completo / Razão Social
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerName: e.target.value }))
                  }
                  placeholder="Ex: João da Silva"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  {formData.customerType === "PJ" ? "CNPJ" : "CPF"}
                </label>
                <input
                  type="text"
                  value={formData.customerCpfCnpj}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerCpfCnpj: e.target.value }))
                  }
                  placeholder="000.000.000-00"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  {formData.customerType === "PJ" ? "Inscrição Estadual" : "RG / Órgão Emissor"}
                </label>
                <input
                  type="text"
                  value={formData.customerRgIe}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerRgIe: e.target.value }))
                  }
                  placeholder="Ex: MG-12.345.678 SSP"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              {formData.customerType === "PF" && (
                <div>
                  <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Estado Civil
                  </label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, maritalStatus: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="União Estável">União Estável</option>
                  </select>
                </div>
              )}

              {formData.customerType === "PF" && (
                <div>
                  <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Profissão
                  </label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, profession: e.target.value }))
                    }
                    placeholder="Ex: Engenheiro(a), Autônomo(a)"
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  E-mail do Titular (Para envio do OTP de assinatura)
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))
                  }
                  placeholder="cliente@email.com"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.customerPhone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))
                  }
                  placeholder="(00) 00000-0000"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Endereço de Instalação */}
          <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                <CardTitle className="text-sm font-semibold">
                  Endereço do Local de Instalação
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Onde a usina geradora de energia solar fotovoltaica será implantada.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Logradouro (Rua / Av / Estrada)
                </label>
                <input
                  type="text"
                  value={formData.addressStreet}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, addressStreet: e.target.value }))
                  }
                  placeholder="Ex: Rua das Palmeiras"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.addressNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, addressNumber: e.target.value }))
                  }
                  placeholder="123"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.addressComp}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, addressComp: e.target.value }))
                  }
                  placeholder="Apto 101 / Casa 2"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.addressNeighborhood}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, addressNeighborhood: e.target.value }))
                  }
                  placeholder="Centro"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="Ex: Belo Horizonte"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))
                  }
                  maxLength={2}
                  placeholder="MG"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  CEP
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, zipCode: e.target.value }))}
                  placeholder="00000-000"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Engenharia & Homologação */}
          <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
                <CardTitle className="text-sm font-semibold">
                  Dados de Concessionária & Engenharia
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Informações utilizadas na procuração ANEEL e no dimensionamento técnico.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Concessionária de Energia
                </label>
                <input
                  type="text"
                  value={formData.utilityCompany}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, utilityCompany: e.target.value }))
                  }
                  placeholder="Ex: CEMIG, CPFL, ENEL, COPEL"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Número da Unidade Consumidora (UC)
                </label>
                <input
                  type="text"
                  value={formData.ucNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ucNumber: e.target.value }))}
                  placeholder="Ex: 3001234567"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Potência do Sistema (kWp)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.systemPowerKwp}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, systemPowerKwp: e.target.value }))
                  }
                  placeholder="Ex: 6.80"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Valor Total do Contrato (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalValue}
                  onChange={(e) => setFormData((prev) => ({ ...prev, totalValue: e.target.value }))}
                  placeholder="Ex: 24500.00"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Condição / Forma de Pagamento
                </label>
                <input
                  type="text"
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))
                  }
                  placeholder="Ex: Financiamento BV em 60x"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-xs font-semibold text-white shadow transition hover:opacity-95 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Salvando Alterações..." : "Salvar Ficha Cadastral"}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Documentos & Assinatura Digital */}
      {activeTab === "documentos" && (
        <div className="space-y-6">
          {/* Quick Action: Gerar novos documentos */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-[var(--color-border)] bg-[var(--color-card)] transition hover:border-[var(--color-primary)]/40">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-sm font-semibold">
                    Contrato de Compra e Venda Solar
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Gera o contrato comercial em PDF com todas as cláusulas, preenchendo
                  automaticamente os dados do cliente, potência em kWp e valor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  onClick={() => handleGenerateDoc("CONTRATO_PF")}
                  disabled={generatingDoc === "CONTRATO_PF"}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                >
                  {generatingDoc === "CONTRATO_PF" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  {generatingDoc === "CONTRATO_PF"
                    ? "Gerando Contrato..."
                    : "Gerar Contrato de Venda"}
                </button>
              </CardContent>
            </Card>

            <Card className="border-[var(--color-border)] bg-[var(--color-card)] transition hover:border-[var(--color-primary)]/40">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                  <FileCheck2 className="h-5 w-5" />
                  <CardTitle className="text-sm font-semibold">
                    Procuração de Homologação ANEEL
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Gera o termo de outorga para o integrador representar o cliente junto à
                  concessionária de energia ({formData.utilityCompany || "CEMIG"}).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  onClick={() => handleGenerateDoc("PROCURACAO_PF")}
                  disabled={generatingDoc === "PROCURACAO_PF"}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                >
                  {generatingDoc === "PROCURACAO_PF" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  {generatingDoc === "PROCURACAO_PF"
                    ? "Gerando Procuração..."
                    : "Gerar Procuração ANEEL"}
                </button>
              </CardContent>
            </Card>
          </div>

          {/* List of Generated Documents */}
          <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Documentos Gerados para Assinatura
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Envie o link para o cliente assinar no smartphone ou baixe a via em PDF com selo
                    jurídico.
                  </CardDescription>
                </div>
                <button
                  onClick={() => loadSale()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  <RefreshCw className="h-3 w-3" /> Atualizar
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {!sale?.documents || sale.documents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-xs text-[var(--color-muted-foreground)]">
                  Nenhum documento gerado ainda. Clique em um dos botões acima para emitir o
                  contrato ou a procuração com 1 clique.
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {sale.documents.map((doc: any) => {
                    const isSigned = (doc?.status || doc?.signStatus) === "SIGNED";
                    const docType = String(doc?.templateType || doc?.documentType || "");
                    const isContract = docType.startsWith("CONTRATO");
                    const title =
                      doc?.title ||
                      (isContract
                        ? "Contrato de Compra e Venda de Sistema Solar"
                        : "Procuração de Acesso e Homologação ANEEL");
                    const token = doc?.publicToken || doc?.signToken || "";

                    return (
                      <div
                        key={doc.id}
                        className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[var(--color-foreground)]">
                              {title}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                isSigned
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              )}
                            >
                              {isSigned ? (
                                <>
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Assinado
                                </>
                              ) : (
                                <>
                                  <Clock className="h-2.5 w-2.5" /> Aguardando Assinatura
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted-foreground)]">
                            <span>Gerado em: {formatDate(doc.createdAt)}</span>
                            {isSigned && (
                              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                Assinado em: {formatDate(doc.signedAt)} por {doc.signerName}
                              </span>
                            )}
                            <span className="font-mono text-[10px]">
                              SHA-256: {doc.originalPdfHash?.slice(0, 14)}...
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Visualizar / Baixar PDF */}
                          <a
                            href={`/api/proxy/public/documents/${token}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] shadow-sm hover:bg-[var(--color-muted)]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {isSigned ? "PDF com Auditoria" : "Baixar PDF"}
                          </a>

                          {/* Se não estiver assinado, permite copiar o link e copiar texto de WhatsApp */}
                          {!isSigned && (
                            <>
                              <button
                                onClick={() => handleCopySignLink(token)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] shadow-sm hover:bg-[var(--color-muted)]"
                              >
                                {copiedLink === token ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    Copiar Link
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleCopyWhatsAppMessage(doc)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                              >
                                {copiedMsg === doc.id ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Mensagem Copiada!
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-3.5 w-3.5" />
                                    Copiar Texto p/ WhatsApp
                                  </>
                                )}
                              </button>

                              <Link
                                href={`/assinar/${token}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                                title="Abrir página de assinatura"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Trilha de Auditoria Jurídica */}
      {activeTab === "auditoria" && (
        <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-sm font-semibold">
                Validade Jurídica & Trilha de Auditoria
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Conformidade com a Medida Provisória nº 2.200-2/2001 e Lei Federal nº 14.063/2020 para
              assinaturas eletrônicas avançadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-[var(--color-muted)]/50 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[var(--color-foreground)]">
                <Fingerprint className="h-4 w-4 text-[var(--color-primary)]" />
                Garantias Técnicas e Legais Integradas:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[var(--color-muted-foreground)]">
                <li>
                  <strong>Autenticação em 2 Etapas (OTP):</strong> Código de validação enviado
                  diretamente para o e-mail do titular cadastrado.
                </li>
                <li>
                  <strong>Confirmação de Identidade:</strong> Exigência de confirmação dos 3
                  primeiros dígitos e dígito verificador do CPF do titular.
                </li>
                <li>
                  <strong>Integridade Criptográfica:</strong> Duplo hash SHA-256 (hash do documento
                  original e hash final do documento após aposição de assinatura).
                </li>
                <li>
                  <strong>Evidências Forenses:</strong> Registro do endereço IP do signatário, porta
                  lógica, User-Agent do dispositivo e carimbo de data/hora oficial de Brasília.
                </li>
                <li>
                  <strong>Folha de Auditoria Jurídica Anexa:</strong> O PDF assinado é emitido com a
                  folha de auditoria e certificado digital anexos na última página.
                </li>
              </ul>
            </div>

            {/* List of audit trails for all documents */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[var(--color-foreground)]">
                Histórico de Documentos da Venda:
              </h4>

              {(!sale?.documents || sale.documents.length === 0) && (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Nenhum documento gerado para esta venda até o momento.
                </p>
              )}

              {sale?.documents?.map((doc: any) => {
                const docType = String(doc?.templateType || doc?.documentType || "");
                const isContract = docType.startsWith("CONTRATO");
                const title =
                  doc?.title ||
                  (isContract ? "Contrato de Venda do Sistema Solar" : "Procuração ANEEL");
                const token = doc?.publicToken || doc?.signToken || "";
                const isSigned = (doc?.status || doc?.signStatus) === "SIGNED";

                return (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-[var(--color-border)] p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--color-foreground)]">{title}</span>
                      <span className="text-[11px] text-[var(--color-muted-foreground)]">
                        Token: <code className="font-mono">{token}</code>
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-[var(--color-muted-foreground)]">
                      <div>
                        <strong>Hash do Documento Original (SHA-256):</strong>
                        <div className="font-mono text-[10px] break-all">{doc.originalPdfHash}</div>
                      </div>
                      {doc.signedPdfHash && (
                        <div>
                          <strong>Hash do Documento Assinado (SHA-256):</strong>
                          <div className="font-mono text-[10px] break-all text-emerald-700 dark:text-emerald-300">
                            {doc.signedPdfHash}
                          </div>
                        </div>
                      )}
                    </div>

                    {isSigned && (
                      <div className="pt-2 border-t border-[var(--color-border)] flex flex-wrap items-center gap-4 text-[11px]">
                        <span>
                          <strong>Signatário:</strong> {doc.signerName}
                        </span>
                        <span>
                          <strong>Data/Hora:</strong> {formatDate(doc.signedAt)}
                        </span>
                        <span>
                          <strong>IP Registrado:</strong> {doc.signerIp || "—"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
