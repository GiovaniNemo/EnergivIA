/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
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
  Search,
  Send,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { generateSaleDocument, getSaleById, updateSale } from "@/lib/sales-api";
import {
  fetchCnpjData,
  fetchViaCepData,
  formatCep,
  formatCnpj,
  formatCpf,
  formatPhone,
} from "@/lib/consultas-api";
import { cn, maskMoneyBrlFromDigits, parseMoneyBrlDisplay } from "@energivia/utils";

const BRAZIL_CONCESSIONARIAS = [
  // Principais / Grandes Grupos Nacionais
  "CEMIG (Minas Gerais)",
  "COPEL (Paraná)",
  "CPFL Paulista (São Paulo)",
  "CPFL Piratininga (São Paulo)",
  "CPFL Santa Cruz (São Paulo / PR / MG)",
  "RGE Sul (Rio Grande do Sul)",
  "Enel Distribuição São Paulo (SP)",
  "Enel Distribuição Rio de Janeiro (RJ)",
  "Enel Distribuição Ceará (CE)",
  "Light (Rio de Janeiro)",
  "Neoenergia Elektro (São Paulo / MS)",
  "Neoenergia Coelba (Bahia)",
  "Neoenergia Pernambuco (Celpe)",
  "Neoenergia Cosern (Rio Grande do Norte)",
  "Neoenergia Brasília (CEB - DF)",
  "Equatorial Goiás (GO)",
  "Equatorial Maranhão (Cemar)",
  "Equatorial Pará (Celpa)",
  "Equatorial Piauí (Cepisa)",
  "Equatorial Alagoas (Ceal)",
  "Equatorial Amapá (CEA)",
  "CEEE Equatorial (Rio Grande do Sul)",
  "Energisa Minas Gerais (MG)",
  "Energisa Mato Grosso (MT)",
  "Energisa Mato Grosso do Sul (MS)",
  "Energisa Paraíba (PB)",
  "Energisa Borborema (PB)",
  "Energisa Sergipe (SE)",
  "Energisa Tocantins (TO)",
  "Energisa Rondônia (Ceron)",
  "Energisa Acre (Eletroacre)",
  "Energisa Sul-Sudeste (SP / PR)",
  "Celesc Distribuição (Santa Catarina)",
  "EDP São Paulo (SP)",
  "EDP Espírito Santo (ES)",
  "Amazonas Energia (AM)",
  "Roraima Energia (RR)",
  // Concessionárias Regionais, Municipais e Permissionárias
  "DMED (Poços de Caldas - MG)",
  "Demei (Ijuí - RS)",
  "Eflul (Urussanga - SC)",
  "Cooperaliança (Içara - SC)",
  "ELFSM (Santa Maria - ES)",
  "Chesp (Goiás)",
  "Forcel (Paraná)",
  "MuxEnergia (RS)",
  "Nova Palma Energia (RS)",
  "Hidroelétrica Panambi (RS)",
];

const COMMON_CONCESSIONARIA_ALIASES = [
  "CEMIG",
  "COPEL",
  "ENEL SP",
  "ENEL RJ",
  "ENEL CE",
  "CPFL Paulista",
  "CPFL Piratininga",
  "LIGHT",
  "CELESC",
  "NEOENERGIA ELEKTRO",
  "NEOENERGIA COELBA",
  "EQUATORIAL GOIÁS",
  "ENERGISA MG",
  "EDP SP",
  "EDP ES",
];

const PAYMENT_CONDITIONS_OPTIONS = [
  "À Vista (PIX / Transferência Bancária)",
  "À Vista (50% Entrada + 50% na Conexão)",
  "À Vista (30% Entrada + 40% na Entrega + 30% na Conexão)",
  "Financiamento Bancário (BV Financeira)",
  "Financiamento Bancário (Banco Santander)",
  "Financiamento Bancário (Solfácil)",
  "Financiamento Bancário (Banco do Brasil / Pronaf)",
  "Financiamento Bancário (Caixa Econômica)",
  "Financiamento Bancário (Sicredi / Sicoob)",
  "Financiamento Bancário (Outras Instituições)",
  "Cartão de Crédito (Parcelado até 12x)",
  "Cartão de Crédito (Parcelado até 18x / 21x)",
  "Boleto Bancário Parcelado",
  "Consórcio Solar",
];

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

  // Estados de consulta automática
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [cnpjFeedback, setCnpjFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [searchingCep, setSearchingCep] = useState(false);

  const addressNumberRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerType: "PF",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCpfCnpj: "",
    customerRgIe: "",
    legalRepresentativeName: "",
    legalRepresentativeCpf: "",
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
        customerName: data.customerName || data.proposal?.deal?.lead?.name || "",
        customerEmail: data.customerEmail || data.proposal?.deal?.lead?.email || "",
        customerPhone:
          data.customerPhone ||
          data.proposal?.deal?.lead?.whatsapp ||
          data.proposal?.deal?.lead?.phone ||
          "",
        customerCpfCnpj:
          data.customerCpfCnpj || data.documentNumber || data.proposal?.deal?.lead?.cpfCnpj || "",
        customerRgIe: data.customerRgIe || data.rgNumber || "",
        legalRepresentativeName: data.legalRepresentativeName || "",
        legalRepresentativeCpf: data.legalRepresentativeCpf || "",
        maritalStatus: data.maritalStatus || "Casado(a)",
        profession: data.profession || "",
        addressStreet: data.addressStreet || data.installationAddress || "",
        addressNumber: data.addressNumber || "",
        addressComp: data.addressComp || "",
        addressNeighborhood: data.addressNeighborhood || "",
        city: data.city || data.installationCity || "",
        state: data.state || data.installationState || "",
        zipCode: data.zipCode || data.installationZip || "",
        utilityCompany: data.utilityCompany || data.distributionCompany || "CEMIG",
        ucNumber: data.ucNumber || data.consumerUnitNumber || "",
        systemPowerKwp: data.systemPowerKwp != null ? String(data.systemPowerKwp) : "",
        totalValue: (() => {
          const raw =
            data.totalValue != null
              ? Number(data.totalValue)
              : data.investmentAmount != null
                ? Number(data.investmentAmount)
                : null;
          return raw != null && !isNaN(raw)
            ? maskMoneyBrlFromDigits(String(Math.round(raw * 100)))
            : "";
        })(),
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

  async function handleSearchCnpj(customCnpj?: string) {
    const raw = (customCnpj || formData.customerCpfCnpj || "").replace(/\D/g, "");
    if (raw.length !== 14) {
      setCnpjFeedback({
        type: "error",
        message: "O CNPJ precisa conter 14 dígitos para a busca automática.",
      });
      return;
    }

    setSearchingCnpj(true);
    setCnpjFeedback(null);
    try {
      const data = await fetchCnpjData(raw);
      setFormData((prev) => ({
        ...prev,
        customerName: data.razaoSocial || data.nomeFantasia || prev.customerName,
        customerCpfCnpj: data.cnpjFormatado,
        customerPhone: data.telefone || prev.customerPhone,
        customerEmail: data.email || prev.customerEmail,
        legalRepresentativeName: data.representanteLegal || prev.legalRepresentativeName,
        legalRepresentativeCpf: data.cpfRepresentante || prev.legalRepresentativeCpf,
        zipCode: data.cep || prev.zipCode,
        addressStreet: data.logradouro || prev.addressStreet,
        addressNumber: data.numero || prev.addressNumber,
        addressComp: data.complemento || prev.addressComp,
        addressNeighborhood: data.bairro || prev.addressNeighborhood,
        city: data.cidade || prev.city,
        state: data.estado || prev.state,
      }));

      setCnpjFeedback({
        type: "success",
        message:
          "Dados da empresa e endereço preenchidos via Receita Federal! Você pode ajustar qualquer campo manualmente.",
      });
      setTimeout(() => setCnpjFeedback(null), 8000);
    } catch (err: any) {
      setCnpjFeedback({
        type: "error",
        message: err.message || "CNPJ não encontrado na Receita. Preencha os campos manualmente.",
      });
    } finally {
      setSearchingCnpj(false);
    }
  }

  async function handleSearchCep(customCep?: string) {
    const raw = (customCep || formData.zipCode || "").replace(/\D/g, "");
    if (raw.length !== 8) {
      setCepFeedback({
        type: "error",
        message: "O CEP precisa conter 8 dígitos para busca automática.",
      });
      return;
    }

    setSearchingCep(true);
    setCepFeedback(null);
    try {
      const data = await fetchViaCepData(raw);
      setFormData((prev) => ({
        ...prev,
        zipCode: data.cepFormatado,
        addressStreet: data.logradouro || prev.addressStreet,
        addressNeighborhood: data.bairro || prev.addressNeighborhood,
        city: data.cidade || prev.city,
        state: data.estado || prev.state,
        addressComp: data.complemento || prev.addressComp,
      }));

      setCepFeedback({
        type: "success",
        message: "Endereço localizado com sucesso via ViaCEP!",
      });

      setTimeout(() => {
        setCepFeedback(null);
        addressNumberRef.current?.focus();
      }, 3000);

      setTimeout(() => {
        addressNumberRef.current?.focus();
      }, 100);
    } catch (err: any) {
      setCepFeedback({
        type: "error",
        message: err.message || "CEP não encontrado. Preencha o endereço manualmente.",
      });
    } finally {
      setSearchingCep(false);
    }
  }

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
        legalRepresentativeName: formData.legalRepresentativeName,
        legalRepresentativeCpf: formData.legalRepresentativeCpf,
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
        totalValue:
          parseMoneyBrlDisplay(formData.totalValue) > 0
            ? parseMoneyBrlDisplay(formData.totalValue)
            : undefined,
        investmentAmount:
          parseMoneyBrlDisplay(formData.totalValue) > 0
            ? parseMoneyBrlDisplay(formData.totalValue)
            : undefined,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        notes: formData.notes,
      });
      setSale((prev: any) => ({
        ...prev,
        ...updated,
        customerName: formData.customerName || prev?.customerName,
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateDoc(
    docType: "CONTRATO_PF" | "CONTRATO_PJ" | "PROCURACAO_PF" | "PROCURACAO_PJ"
  ) {
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
                updateSale(saleId, { status: e.target.value }).then((res) =>
                  setSale((prev: any) => ({ ...prev, ...res }))
                );
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
                {formData.customerType === "PJ" ? (
                  <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
                ) : (
                  <User className="h-4 w-4 text-[var(--color-primary)]" />
                )}
                <CardTitle className="text-sm font-semibold">
                  {formData.customerType === "PJ"
                    ? "Identificação da Empresa (Pessoa Jurídica)"
                    : "Identificação do Titular (Pessoa Física)"}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {formData.customerType === "PJ"
                  ? "Dados cadastrais da empresa contratante e do representante legal perante a ANEEL."
                  : "Dados do cliente titular do contrato e da unidade consumidora."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Linha 1: Tipo de Pessoa (1 col) + Nome Completo / Razão Social (2 cols) */}
              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Tipo de Pessoa (CPF / CNPJ)
                </label>
                <select
                  value={formData.customerType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      customerType: nextType,
                      customerCpfCnpj: "",
                    }));
                    setCnpjFeedback(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="PF">Pessoa Física (PF)</option>
                  <option value="PJ">Pessoa Jurídica (PJ)</option>
                </select>
              </div>

              <div className="sm:col-span-1 lg:col-span-2">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  {formData.customerType === "PJ"
                    ? "Razão Social / Nome Empresarial"
                    : "Nome Completo do Titular"}
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerName: e.target.value }))
                  }
                  placeholder={
                    formData.customerType === "PJ"
                      ? "Ex: Soluções em Energia Ltda"
                      : "Ex: João da Silva"
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              {/* Linha 2: CPF/CNPJ (1 col) + RG/IE (1 col) + Telefone/WhatsApp (1 col) */}
              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  {formData.customerType === "PJ" ? "CNPJ da Empresa" : "CPF do Titular"}
                </label>
                <div className="relative mt-1 flex items-center">
                  <input
                    type="text"
                    value={formData.customerCpfCnpj}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (formData.customerType === "PJ") {
                        const formatted = formatCnpj(val);
                        setFormData((prev) => ({ ...prev, customerCpfCnpj: formatted }));
                        if (formatted.replace(/\D/g, "").length === 14) {
                          handleSearchCnpj(formatted);
                        }
                      } else {
                        setFormData((prev) => ({ ...prev, customerCpfCnpj: formatCpf(val) }));
                      }
                    }}
                    onBlur={() => {
                      if (
                        formData.customerType === "PJ" &&
                        formData.customerCpfCnpj.replace(/\D/g, "").length === 14
                      ) {
                        handleSearchCnpj(formData.customerCpfCnpj);
                      }
                    }}
                    placeholder={
                      formData.customerType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"
                    }
                    maxLength={formData.customerType === "PJ" ? 18 : 14}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                  {formData.customerType === "PJ" && (
                    <button
                      type="button"
                      onClick={() => handleSearchCnpj()}
                      disabled={searchingCnpj}
                      className="absolute right-1 top-1 bottom-1 inline-flex items-center gap-1 rounded-md bg-[var(--color-muted)] px-2.5 text-[11px] font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/80 disabled:opacity-50"
                      title="Consultar CNPJ"
                    >
                      {searchingCnpj ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Search className="h-3 w-3" />
                      )}
                      Buscar
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  {formData.customerType === "PJ"
                    ? "Inscrição Estadual (IE)"
                    : "RG / Órgão Emissor"}
                </label>
                <input
                  type="text"
                  value={formData.customerRgIe}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerRgIe: e.target.value }))
                  }
                  placeholder={
                    formData.customerType === "PJ"
                      ? "Ex: 123.456.789.000 ou ISENTO"
                      : "Ex: MG-12.345.678 SSP"
                  }
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
                    setFormData((prev) => ({ ...prev, customerPhone: formatPhone(e.target.value) }))
                  }
                  placeholder="(00) 00000-0000"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              {/* Campos do Representante Legal quando PJ */}
              {formData.customerType === "PJ" && (
                <>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      Representante Legal (Sócio / Administrador)
                    </label>
                    <input
                      type="text"
                      value={formData.legalRepresentativeName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          legalRepresentativeName: e.target.value,
                        }))
                      }
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      CPF do Representante Legal
                    </label>
                    <input
                      type="text"
                      value={formData.legalRepresentativeCpf}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          legalRepresentativeCpf: formatCpf(e.target.value),
                        }))
                      }
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Linha 3 quando PF: E-mail (1 col) + Estado Civil (1 col) + Profissão (1 col) */}
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

              {/* Feedback CNPJ se houver */}
              {cnpjFeedback && (
                <div
                  className={cn(
                    "sm:col-span-2 lg:col-span-3 rounded-md p-2 text-xs font-medium flex items-center gap-1.5",
                    cnpjFeedback.type === "success"
                      ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                  )}
                >
                  {cnpjFeedback.type === "success" && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{cnpjFeedback.message}</span>
                </div>
              )}
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
              <div>
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  CEP
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => {
                      const formatted = formatCep(e.target.value);
                      setFormData((prev) => ({ ...prev, zipCode: formatted }));
                      if (formatted.replace(/\D/g, "").length === 8) {
                        handleSearchCep(formatted);
                      }
                    }}
                    onBlur={() => {
                      if (formData.zipCode.replace(/\D/g, "").length === 8) {
                        handleSearchCep(formData.zipCode);
                      }
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                  {searchingCep && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
                    </div>
                  )}
                </div>
              </div>

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
                  ref={addressNumberRef}
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
                  placeholder="Apto 101 / Galpão B"
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
                <div className="relative mt-1">
                  <input
                    type="text"
                    list="brazil-concessionarias-list"
                    value={formData.utilityCompany}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, utilityCompany: e.target.value }))
                    }
                    placeholder="Selecione ou digite (Ex: Copel, Cemig, Enel...)"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                  <datalist id="brazil-concessionarias-list">
                    {COMMON_CONCESSIONARIA_ALIASES.map((alias) => (
                      <option key={"alias-" + alias} value={alias} />
                    ))}
                    {BRAZIL_CONCESSIONARIAS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
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
                  Valor Total do Contrato
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-muted-foreground)]">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.totalValue}
                    onChange={(e) => {
                      const masked = maskMoneyBrlFromDigits(e.target.value);
                      setFormData((prev) => ({ ...prev, totalValue: masked }));
                    }}
                    placeholder="0,00"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] pl-9 pr-3 py-2 text-xs font-semibold text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-1 lg:col-span-2">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Condição / Forma de Pagamento
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    list="payment-conditions-list"
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))
                    }
                    placeholder="Selecione ou digite a forma de pagamento"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                  <datalist id="payment-conditions-list">
                    {PAYMENT_CONDITIONS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    Atalhos:
                  </span>
                  {[
                    "À Vista (PIX / Transferência Bancária)",
                    "Financiamento Bancário (BV Financeira)",
                    "Financiamento Bancário (Banco Santander)",
                    "Cartão de Crédito (Parcelado até 12x)",
                    "Boleto Bancário Parcelado",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: preset }))}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors"
                    >
                      {preset.split(" (")[0] +
                        (preset.includes("12x")
                          ? " 12x"
                          : preset.includes("BV")
                            ? " BV"
                            : preset.includes("Santander")
                              ? " Santander"
                              : "")}
                    </button>
                  ))}
                </div>
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
                    Contrato de Compra e Venda Solar ({formData.customerType})
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Gera o contrato comercial em PDF com todas as cláusulas, preenchendo
                  automaticamente os dados de{" "}
                  {formData.customerType === "PJ" ? "empresa e sócio" : "cliente"}, potência em kWp
                  e valor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  onClick={() =>
                    handleGenerateDoc(
                      formData.customerType === "PJ" ? "CONTRATO_PJ" : "CONTRATO_PF"
                    )
                  }
                  disabled={generatingDoc === "CONTRATO_PF" || generatingDoc === "CONTRATO_PJ"}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                >
                  {generatingDoc === "CONTRATO_PF" || generatingDoc === "CONTRATO_PJ" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  {generatingDoc === "CONTRATO_PF" || generatingDoc === "CONTRATO_PJ"
                    ? "Gerando Contrato..."
                    : `Gerar Contrato de Venda (${formData.customerType})`}
                </button>
              </CardContent>
            </Card>

            <Card className="border-[var(--color-border)] bg-[var(--color-card)] transition hover:border-[var(--color-primary)]/40">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                  <FileCheck2 className="h-5 w-5" />
                  <CardTitle className="text-sm font-semibold">
                    Procuração de Homologação ANEEL ({formData.customerType})
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Gera o termo de outorga para o integrador representar{" "}
                  {formData.customerType === "PJ" ? "a empresa" : "o cliente"} junto à
                  concessionária de energia ({formData.utilityCompany || "CEMIG"}).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  onClick={() =>
                    handleGenerateDoc(
                      formData.customerType === "PJ" ? "PROCURACAO_PJ" : "PROCURACAO_PF"
                    )
                  }
                  disabled={generatingDoc === "PROCURACAO_PF" || generatingDoc === "PROCURACAO_PJ"}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                >
                  {generatingDoc === "PROCURACAO_PF" || generatingDoc === "PROCURACAO_PJ" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  {generatingDoc === "PROCURACAO_PF" || generatingDoc === "PROCURACAO_PJ"
                    ? "Gerando Procuração..."
                    : `Gerar Procuração ANEEL (${formData.customerType})`}
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
