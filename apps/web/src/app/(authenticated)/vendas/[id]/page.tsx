/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileCheck2,
  ExternalLink,
  FileEdit,
  FileSignature,
  FileText,
  Fingerprint,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { LiveContractEditorModal } from "@/components/sales/live-contract-editor-modal";
import { PdfViewerModal } from "@/components/sales/pdf-viewer-modal";
import { CompanySignModal } from "@/components/sales/company-sign-modal";
import { deleteSaleDocument, generateSaleDocument, getSaleById, updateSale } from "@/lib/sales-api";
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

const SALE_STATUS_OPTIONS = [
  { value: "AWAITING_ANALYSIS", label: "Aguardando Análise" },
  { value: "DOCUMENTS_PENDING", label: "Documentos Pendentes" },
  { value: "SIGNATURE_PENDING", label: "Em Assinatura" },
  { value: "SIGNED", label: "Contrato Assinado" },
  { value: "COMPLETED", label: "Concluída" },
  { value: "CANCELLED", label: "Cancelada" },
];

const PAYMENT_METHOD_OPTIONS = [
  "À Vista (PIX / Transferência)",
  "Financiamento Bancário",
  "Boleto Bancário",
  "Cartão de Crédito (1x à vista)",
  "Cartão de Crédito em 6x",
  "Cartão de Crédito em 10x",
  "Cartão de Crédito em 12x",
  "Cartão de Crédito em 18x",
  "Cartão de Crédito em 21x",
  "Cartão de Crédito em 24x",
];

function parseUserAgentFriendly(ua?: string | null): string {
  if (!ua || typeof ua !== "string") return "Navegador Web";
  let os = "Dispositivo";
  if (ua.includes("iPhone")) os = "iPhone (iOS)";
  else if (ua.includes("iPad")) os = "iPad (iPadOS)";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  const arch =
    ua.includes("x64") || ua.includes("Win64") || ua.includes("WOW64") ? " (64-bit)" : "";

  let browser = "Navegador";
  if (ua.includes("OPR/") || ua.includes("Opera")) {
    const match = ua.match(/OPR\/([\d.]+)/);
    const ver = match ? " " + match[1].split(".")[0] : "";
    browser = "Opera / Opera GX" + ver;
  } else if (ua.includes("Edg/")) {
    const match = ua.match(/Edg\/([\d.]+)/);
    const ver = match ? " " + match[1].split(".")[0] : "";
    browser = "Microsoft Edge" + ver;
  } else if (ua.includes("Chrome/") && !ua.includes("Chromium")) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    const ver = match ? " " + match[1].split(".")[0] : "";
    browser = "Google Chrome" + ver;
  } else if (ua.includes("Firefox/")) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    const ver = match ? " " + match[1].split(".")[0] : "";
    browser = "Mozilla Firefox" + ver;
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Apple Safari";
  }

  return browser + " · " + os + arch;
}

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
  const [selectedDocForEditing, setSelectedDocForEditing] = useState<string | null>(null);
  const [companySigningDoc, setCompanySigningDoc] = useState<any>(null);
  const [viewingPdfDoc, setViewingPdfDoc] = useState<{
    url: string;
    title: string;
    isSigned?: boolean;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  // Estados de exclusão de minuta
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const [sale, setSale] = useState<any>(null);

  // Estados de consulta automática
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [cnpjFeedback, setCnpjFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [searchingCep, setSearchingCep] = useState(false);
  const [isCustomUtility, setIsCustomUtility] = useState(false);
  const [isCustomPayment, setIsCustomPayment] = useState(false);

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
    utilityCompany: "",
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
        legalRepresentativeCpf:
          data.legalRepresentativeCpf &&
          data.legalRepresentativeCpf.replace(/\D/g, "").length === 11
            ? formatCpf(data.legalRepresentativeCpf)
            : "",
        maritalStatus: data.maritalStatus || "Casado(a)",
        profession: data.profession || "",
        addressStreet: data.addressStreet || data.installationAddress || "",
        addressNumber: data.addressNumber || "",
        addressComp: data.addressComp || "",
        addressNeighborhood: data.addressNeighborhood || "",
        city: data.city || data.installationCity || "",
        state: data.state || data.installationState || "",
        zipCode: data.zipCode || data.installationZip || "",
        utilityCompany: data.utilityCompany || data.distributionCompany || "",
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
        legalRepresentativeCpf: prev.legalRepresentativeCpf,
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
          "Dados da empresa e endereço preenchidos via Receita Federal! O CPF do representante legal deve ser informado manualmente.",
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
      return;
    }

    setSearchingCep(true);
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

      setTimeout(() => {
        addressNumberRef.current?.focus();
      }, 100);
    } catch (err: any) {
      console.warn("CEP lookup failed:", err);
    } finally {
      setSearchingCep(false);
    }
  }

  function validateFichaCadastral(): Record<string, string> {
    const errs: Record<string, string> = {};

    if (!formData.customerName?.trim()) {
      errs.customerName =
        formData.customerType === "PJ"
          ? "Razão Social / Nome Empresarial é obrigatório"
          : "Nome Completo do Titular é obrigatório";
    }

    const cleanDoc = (formData.customerCpfCnpj || "").replace(/\D/g, "");
    if (!cleanDoc) {
      errs.customerCpfCnpj =
        formData.customerType === "PJ"
          ? "CNPJ da Empresa é obrigatório"
          : "CPF do Titular é obrigatório";
    } else if (formData.customerType === "PJ" && cleanDoc.length !== 14) {
      errs.customerCpfCnpj = "CNPJ da Empresa inválido (necessário 14 dígitos)";
    } else if (formData.customerType !== "PJ" && cleanDoc.length !== 11) {
      errs.customerCpfCnpj = "CPF do Titular inválido (necessário 11 dígitos)";
    }

    if (formData.customerType === "PJ") {
      if (!formData.legalRepresentativeName?.trim()) {
        errs.legalRepresentativeName = "Nome Completo do Representante Legal é obrigatório";
      }
      const cleanRepCpf = (formData.legalRepresentativeCpf || "").replace(/\D/g, "");
      if (!cleanRepCpf || cleanRepCpf.length !== 11) {
        errs.legalRepresentativeCpf = "CPF do Representante Legal inválido (necessário 11 dígitos)";
      }
    }

    if (!formData.customerEmail?.trim() || !formData.customerEmail.includes("@")) {
      errs.customerEmail = "E-mail válido é obrigatório para envio do OTP e assinatura digital";
    }

    const cleanPhone = (formData.customerPhone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.customerPhone = "Telefone / WhatsApp com DDD é obrigatório";
    }

    if (!formData.zipCode?.trim()) errs.zipCode = "CEP do local de instalação é obrigatório";
    if (!formData.addressStreet?.trim()) errs.addressStreet = "Logradouro / Rua é obrigatório";
    if (!formData.addressNumber?.trim()) errs.addressNumber = "Número do imóvel é obrigatório";
    if (!formData.addressNeighborhood?.trim()) errs.addressNeighborhood = "Bairro é obrigatório";
    if (!formData.city?.trim()) errs.city = "Cidade é obrigatória";
    if (!formData.state?.trim()) errs.state = "Estado (UF) é obrigatório";

    if (!formData.utilityCompany?.trim()) {
      errs.utilityCompany = "Distribuidora / Concessionária de Energia é obrigatória";
    }
    if (!formData.ucNumber?.trim()) {
      errs.ucNumber = "Número da Unidade Consumidora (UC) é obrigatório";
    }

    const kwp = parseFloat(formData.systemPowerKwp || "0");
    if (!formData.systemPowerKwp || isNaN(kwp) || kwp <= 0) {
      errs.systemPowerKwp = "Potência do Sistema em kWp é obrigatória";
    }

    const valor = parseMoneyBrlDisplay(formData.totalValue || "");
    if (isNaN(valor) || valor <= 0) {
      errs.totalValue = "Valor Total do Contrato (R$) é obrigatório";
    }

    return errs;
  }

  async function handleSave(e?: React.FormEvent, shouldAdvance: boolean = true) {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    const errors = validateFichaCadastral();
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      setFieldErrors(errors);
      setValidationErrors(Object.values(errors));
      setError(
        "Preencha todos os campos obrigatórios destacados em vermelho para prosseguir para a emissão do contrato."
      );
      setSaving(false);
      const firstKey = errorKeys[0];
      setTimeout(() => {
        const el = document.getElementById(`field-${firstKey}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }, 80);
      return;
    }

    setFieldErrors({});
    setValidationErrors(null);

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

      if (shouldAdvance) {
        setActiveTab("documentos");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      setError(err.message || "Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    setDeletingDocId(docId);
    setError(null);
    try {
      await deleteSaleDocument(saleId, docId);
      setSale((prev: any) => ({
        ...prev,
        documents: (prev?.documents || []).filter((d: any) => d.id !== docId),
      }));
      setDocToDelete(null);
      setDeleteSuccessMsg("Minuta de teste excluída com sucesso.");
      setTimeout(() => setDeleteSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || "Erro ao excluir minuta");
    } finally {
      setDeletingDocId(null);
    }
  }

  async function handleGenerateStandardDocument(
    docType: "CONTRATO_PF" | "CONTRATO_PJ" | "PROCURACAO_PF" | "PROCURACAO_PJ"
  ) {
    setGeneratingDoc(docType);
    setError(null);
    try {
      await generateSaleDocument(saleId, docType);
      await loadSale();
    } catch (err: any) {
      setError(err.message || "Erro ao emitir documento com modelo padrão");
    } finally {
      setGeneratingDoc(null);
    }
  }

  async function handleOpenDocumentEditor(
    docType: "CONTRATO_PF" | "CONTRATO_PJ" | "PROCURACAO_PF" | "PROCURACAO_PJ"
  ) {
    const existingDoc = sale?.documents?.find((d: any) => {
      const type = String(d?.templateType || d?.documentType || "");
      return type === docType;
    });

    if (existingDoc?.id) {
      setSelectedDocForEditing(existingDoc.id);
      return;
    }

    setGeneratingDoc(docType);
    setError(null);
    try {
      const created = await generateSaleDocument(saleId, docType);
      await loadSale();
      if (created?.id) {
        setSelectedDocForEditing(created.id);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao gerar e abrir minuta para edição");
    } finally {
      setGeneratingDoc(null);
    }
  }

  function handleCopySignLink(token: string, doc?: any) {
    const isContract = String(doc?.templateType || doc?.documentType || "").startsWith("CONTRATO");
    if (isContract && !doc?.companySignedAt && !doc?.isCompanySigned) {
      setCompanySigningDoc(doc);
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/assinar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 3000);
  }

  function handleSendWhatsAppMessage(doc: any) {
    const isContract = String(doc?.templateType || doc?.documentType || "").startsWith("CONTRATO");
    if (isContract && !doc?.companySignedAt && !doc?.isCompanySigned) {
      setCompanySigningDoc(doc);
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const token = doc?.publicToken || doc?.signToken || "";
    const signUrl = `${origin}/assinar/${token}`;
    const clientFirstName = (formData.customerName || sale?.customerName || "Cliente")
      .trim()
      .split(" ")[0];
    const docType = String(doc?.templateType || doc?.documentType || "");
    const docName = docType.startsWith("CONTRATO")
      ? "Contrato de Venda do Sistema Solar"
      : "Procuração para Homologação ANEEL";

    const text =
      `Olá, ${clientFirstName}! Segue o link para assinar digitalmente o seu ${docName} de forma rápida e segura direto pelo celular:\n\n` +
      `${signUrl}\n\n` +
      `A assinatura conta com certificação eletrônica e código de segurança. Qualquer dúvida, estou à disposição!`;

    try {
      navigator.clipboard?.writeText(text);
    } catch {
      // Ignora erro se clipboard não permitido
    }

    const rawPhone =
      formData.customerPhone ||
      sale?.customerPhone ||
      sale?.proposal?.deal?.lead?.whatsapp ||
      sale?.proposal?.deal?.lead?.phone ||
      "";
    const cleanDigits = rawPhone.replace(/\D/g, "");
    let waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (cleanDigits.length >= 10) {
      const waTarget = cleanDigits.startsWith("55") ? cleanDigits : `55${cleanDigits}`;
      waUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(text)}`;
    }

    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }

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
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/vendas"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] shadow-sm hover:bg-[var(--color-muted)] hover:border-[var(--color-primary)]/40 transition-colors"
            title="Voltar para a listagem geral de vendas"
          >
            <ArrowLeft className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <span className="hidden sm:inline">Voltar para Vendas</span>
            <span className="sm:hidden">Voltar</span>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1
                className="truncate text-xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-2xl"
                title={sale?.customerName || "Ficha da Venda"}
              >
                {sale?.customerName || "Ficha da Venda"}
              </h1>
              {sale?.customerType && (
                <span className="shrink-0 rounded bg-[var(--color-muted)] px-2 py-0.5 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                  {sale?.customerType}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
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
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2">
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
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          Ficha cadastral salva com sucesso! Os dados foram validados e atualizados para a emissão
          de documentos.
        </div>
      )}

      {deleteSuccessMsg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          {deleteSuccessMsg}
        </div>
      )}

      {validationErrors && validationErrors.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-medium text-rose-800 dark:text-rose-300 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-200 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>Campos Obrigatórios Pendentes para Emissão de Contratos</span>
          </div>
          <p className="text-xs text-rose-700/90 dark:text-rose-300/90">
            A emissão do contrato exige que todos os campos essenciais estejam preenchidos. Por
            favor, complete os itens abaixo:
          </p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5 list-disc list-inside text-[11px] font-semibold text-rose-800 dark:text-rose-200">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {error && !validationErrors && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)] overflow-x-auto scrollbar-none">
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
                  autoComplete="off"
                  data-lpignore="true"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white dark:bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="PF">Pessoa Física (PF)</option>
                  <option value="PJ">Pessoa Jurídica (PJ)</option>
                </select>
              </div>

              <div className="sm:col-span-1 lg:col-span-2">
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.customerName
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  {formData.customerType === "PJ"
                    ? "Razão Social / Nome Empresarial"
                    : "Nome Completo do Titular"}
                  {fieldErrors.customerName && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>
                <input
                  id="field-customerName"
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, customerName: e.target.value }));
                    clearFieldError("customerName");
                  }}
                  placeholder={
                    formData.customerType === "PJ"
                      ? "Ex: Soluções em Energia Ltda"
                      : "Ex: João da Silva"
                  }
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.customerName
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.customerName && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.customerName}
                  </p>
                )}
              </div>

              {/* Linha 2: CPF/CNPJ (1 col) + RG/IE (1 col) + Telefone/WhatsApp (1 col) */}
              <div>
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.customerCpfCnpj
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  {formData.customerType === "PJ" ? "CNPJ da Empresa" : "CPF do Titular"}
                  {fieldErrors.customerCpfCnpj && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>
                <div className="relative mt-1 flex items-center">
                  <input
                    id="field-customerCpfCnpj"
                    type="text"
                    value={formData.customerCpfCnpj}
                    onChange={(e) => {
                      const val = e.target.value;
                      clearFieldError("customerCpfCnpj");
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
                    className={cn(
                      "w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                      fieldErrors.customerCpfCnpj
                        ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                        : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                    )}
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
                {fieldErrors.customerCpfCnpj && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.customerCpfCnpj}
                  </p>
                )}
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
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.customerPhone
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Telefone / WhatsApp
                  {fieldErrors.customerPhone && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>
                <input
                  id="field-customerPhone"
                  type="text"
                  value={formData.customerPhone}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      customerPhone: formatPhone(e.target.value),
                    }));
                    clearFieldError("customerPhone");
                  }}
                  placeholder="(00) 00000-0000"
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.customerPhone
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.customerPhone && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.customerPhone}
                  </p>
                )}
              </div>

              {/* Campos do Representante Legal quando PJ */}
              {formData.customerType === "PJ" && (
                <>
                  <div className="sm:col-span-2">
                    <label
                      className={cn(
                        "text-xs font-medium",
                        fieldErrors.legalRepresentativeName
                          ? "font-semibold text-rose-600 dark:text-rose-400"
                          : "text-[var(--color-muted-foreground)]"
                      )}
                    >
                      Representante Legal (Sócio / Administrador)
                      {fieldErrors.legalRepresentativeName && (
                        <span className="ml-1 font-bold text-rose-500">*</span>
                      )}
                    </label>
                    <input
                      id="field-legalRepresentativeName"
                      type="text"
                      value={formData.legalRepresentativeName}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          legalRepresentativeName: e.target.value,
                        }));
                        clearFieldError("legalRepresentativeName");
                      }}
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      className={cn(
                        "mt-1 w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                        fieldErrors.legalRepresentativeName
                          ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                          : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                      )}
                    />
                    {fieldErrors.legalRepresentativeName && (
                      <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        {fieldErrors.legalRepresentativeName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={cn(
                        "text-xs font-medium",
                        fieldErrors.legalRepresentativeCpf
                          ? "font-semibold text-rose-600 dark:text-rose-400"
                          : "text-[var(--color-muted-foreground)]"
                      )}
                    >
                      CPF do Representante Legal
                      <span className="ml-1 text-[10px] font-normal text-[var(--color-muted-foreground)] opacity-80">
                        (Preenchimento manual)
                      </span>
                      {fieldErrors.legalRepresentativeCpf && (
                        <span className="ml-1 font-bold text-rose-500">*</span>
                      )}
                    </label>
                    <input
                      id="field-legalRepresentativeCpf"
                      type="text"
                      value={formData.legalRepresentativeCpf}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          legalRepresentativeCpf: formatCpf(e.target.value),
                        }));
                        clearFieldError("legalRepresentativeCpf");
                      }}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className={cn(
                        "mt-1 w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                        fieldErrors.legalRepresentativeCpf
                          ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                          : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                      )}
                    />
                    {fieldErrors.legalRepresentativeCpf && (
                      <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        {fieldErrors.legalRepresentativeCpf}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Linha 3 quando PF: E-mail (1 col) + Estado Civil (1 col) + Profissão (1 col) */}
              <div>
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.customerEmail
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  E-mail do Titular (Para envio do OTP de assinatura)
                  {fieldErrors.customerEmail && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>
                <input
                  id="field-customerEmail"
                  type="email"
                  autoComplete="off"
                  data-lpignore="true"
                  value={formData.customerEmail}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, customerEmail: e.target.value }));
                    clearFieldError("customerEmail");
                  }}
                  placeholder="cliente@email.com"
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-white dark:bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.customerEmail
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.customerEmail && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.customerEmail}
                  </p>
                )}
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
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.zipCode
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  CEP{" "}
                  {fieldErrors.zipCode && <span className="ml-1 font-bold text-rose-500">*</span>}
                </label>
                <div className="relative mt-1">
                  <input
                    id="field-zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => {
                      const formatted = formatCep(e.target.value);
                      setFormData((prev) => ({ ...prev, zipCode: formatted }));
                      clearFieldError("zipCode");
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
                    className={cn(
                      "w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                      fieldErrors.zipCode
                        ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                        : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                    )}
                  />
                  {searchingCep && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
                    </div>
                  )}
                </div>
                {fieldErrors.zipCode && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.zipCode}
                  </p>
                )}
              </div>

              <div className="lg:col-span-2">
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.addressStreet
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Logradouro (Rua / Av / Estrada)
                  {fieldErrors.addressStreet && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>
                <input
                  id="field-addressStreet"
                  type="text"
                  value={formData.addressStreet}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, addressStreet: e.target.value }));
                    clearFieldError("addressStreet");
                  }}
                  placeholder="Ex: Rua das Palmeiras"
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.addressStreet
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.addressStreet && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.addressStreet}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.addressNumber
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Número{" "}
                  {fieldErrors.addressNumber && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>
                <input
                  id="field-addressNumber"
                  ref={addressNumberRef}
                  type="text"
                  value={formData.addressNumber}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, addressNumber: e.target.value }));
                    clearFieldError("addressNumber");
                  }}
                  placeholder="123"
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.addressNumber
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.addressNumber && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.addressNumber}
                  </p>
                )}
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
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.addressNeighborhood
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Bairro{" "}
                  {fieldErrors.addressNeighborhood && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>
                <input
                  id="field-addressNeighborhood"
                  type="text"
                  value={formData.addressNeighborhood}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, addressNeighborhood: e.target.value }));
                    clearFieldError("addressNeighborhood");
                  }}
                  placeholder="Centro"
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.addressNeighborhood
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.addressNeighborhood && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.addressNeighborhood}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.city
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Cidade{" "}
                  {fieldErrors.city && <span className="ml-1 font-bold text-rose-500">*</span>}
                </label>
                <input
                  id="field-city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, city: e.target.value }));
                    clearFieldError("city");
                  }}
                  placeholder="Ex: Belo Horizonte"
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.city
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.city && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.city}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.state
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Estado (UF){" "}
                  {fieldErrors.state && <span className="ml-1 font-bold text-rose-500">*</span>}
                </label>
                <input
                  id="field-state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, state: e.target.value.toUpperCase() }));
                    clearFieldError("state");
                  }}
                  maxLength={2}
                  placeholder="MG"
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.state
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.state && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.state}
                  </p>
                )}
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
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.utilityCompany
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Concessionária de Energia
                  {fieldErrors.utilityCompany && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>

                {!isCustomUtility ? (
                  <select
                    id="field-utilityCompany"
                    value={
                      BRAZIL_CONCESSIONARIAS.some(
                        (c) =>
                          c.toUpperCase() === (formData.utilityCompany || "").trim().toUpperCase()
                      )
                        ? BRAZIL_CONCESSIONARIAS.find(
                            (c) =>
                              c.toUpperCase() ===
                              (formData.utilityCompany || "").trim().toUpperCase()
                          )
                        : formData.utilityCompany
                    }
                    onChange={(e) => {
                      clearFieldError("utilityCompany");
                      if (e.target.value === "__CUSTOM__") {
                        setIsCustomUtility(true);
                      } else {
                        setFormData((prev) => ({ ...prev, utilityCompany: e.target.value }));
                      }
                    }}
                    className={cn(
                      "mt-1 h-[38px] w-full rounded-lg border bg-[var(--color-background)] px-3 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                      fieldErrors.utilityCompany
                        ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                        : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                    )}
                  >
                    <option value="">Selecione a concessionária...</option>
                    {formData.utilityCompany &&
                      !BRAZIL_CONCESSIONARIAS.some(
                        (c) => c.toUpperCase() === formData.utilityCompany.trim().toUpperCase()
                      ) && (
                        <option value={formData.utilityCompany}>{formData.utilityCompany}</option>
                      )}
                    {BRAZIL_CONCESSIONARIAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Outra concessionária (Digitar nome)...</option>
                  </select>
                ) : (
                  <div className="relative mt-1">
                    <input
                      id="field-utilityCompany"
                      type="text"
                      value={formData.utilityCompany}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, utilityCompany: e.target.value }));
                        clearFieldError("utilityCompany");
                      }}
                      placeholder="Digite o nome da concessionária"
                      autoFocus
                      className={cn(
                        "h-[38px] w-full rounded-lg border bg-[var(--color-background)] pl-3 pr-20 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                        fieldErrors.utilityCompany
                          ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                          : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomUtility(false);
                        clearFieldError("utilityCompany");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Ver lista
                    </button>
                  </div>
                )}
                {fieldErrors.utilityCompany && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.utilityCompany}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.ucNumber
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Número da Unidade Consumidora (UC)
                  {fieldErrors.ucNumber && <span className="ml-1 font-bold text-rose-500">*</span>}
                </label>
                <input
                  id="field-ucNumber"
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  value={formData.ucNumber}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, ucNumber: e.target.value }));
                    clearFieldError("ucNumber");
                  }}
                  placeholder="Ex: 3001234567"
                  className={cn(
                    "mt-1 h-[38px] w-full rounded-lg border bg-white dark:bg-[var(--color-background)] px-3 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.ucNumber
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.ucNumber && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.ucNumber}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.systemPowerKwp
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Potência do Sistema (kWp)
                  {fieldErrors.systemPowerKwp && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>
                <input
                  id="field-systemPowerKwp"
                  type="number"
                  step="0.01"
                  value={formData.systemPowerKwp}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, systemPowerKwp: e.target.value }));
                    clearFieldError("systemPowerKwp");
                  }}
                  placeholder="Ex: 6.80"
                  className={cn(
                    "mt-1 h-[38px] w-full rounded-lg border bg-[var(--color-background)] px-3 text-xs text-[var(--color-foreground)] transition-colors focus:outline-none",
                    fieldErrors.systemPowerKwp
                      ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  )}
                />
                {fieldErrors.systemPowerKwp && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.systemPowerKwp}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={cn(
                    "text-xs font-medium",
                    fieldErrors.totalValue
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Valor Total do Contrato
                  {fieldErrors.totalValue && (
                    <span className="ml-1 font-bold text-rose-500">*</span>
                  )}
                </label>
                <div className="relative mt-1">
                  <span
                    className={cn(
                      "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold",
                      fieldErrors.totalValue
                        ? "text-rose-500"
                        : "text-[var(--color-muted-foreground)]"
                    )}
                  >
                    R$
                  </span>
                  <input
                    id="field-totalValue"
                    type="text"
                    inputMode="numeric"
                    value={formData.totalValue}
                    onChange={(e) => {
                      const masked = maskMoneyBrlFromDigits(e.target.value);
                      setFormData((prev) => ({ ...prev, totalValue: masked }));
                      clearFieldError("totalValue");
                    }}
                    placeholder="0,00"
                    className={cn(
                      "h-[38px] w-full rounded-lg border bg-[var(--color-background)] pl-9 pr-3 text-xs font-semibold text-[var(--color-foreground)] transition-colors focus:outline-none",
                      fieldErrors.totalValue
                        ? "border-rose-500 bg-rose-50/15 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-rose-950/20"
                        : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                    )}
                  />
                </div>
                {fieldErrors.totalValue && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.totalValue}
                  </p>
                )}
              </div>

              <div className="sm:col-span-1 lg:col-span-2">
                <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Condição / Forma de Pagamento
                </label>
                {!isCustomPayment ? (
                  <select
                    id="field-paymentMethod"
                    value={
                      PAYMENT_METHOD_OPTIONS.includes(formData.paymentMethod)
                        ? formData.paymentMethod
                        : formData.paymentMethod
                          ? formData.paymentMethod
                          : "Financiamento Bancário"
                    }
                    onChange={(e) => {
                      if (e.target.value === "__CUSTOM__") {
                        setIsCustomPayment(true);
                      } else {
                        setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }));
                      }
                    }}
                    className="mt-1 h-[38px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-xs text-[var(--color-foreground)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    {formData.paymentMethod &&
                      !PAYMENT_METHOD_OPTIONS.includes(formData.paymentMethod) && (
                        <option value={formData.paymentMethod}>{formData.paymentMethod}</option>
                      )}
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Outra condição (Digitar manualmente)...</option>
                  </select>
                ) : (
                  <div className="relative mt-1">
                    <input
                      id="field-paymentMethod"
                      type="text"
                      autoFocus
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))
                      }
                      placeholder="Ex: 50% entrada + 50% na entrega"
                      className="h-[38px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] pl-3 pr-20 text-xs text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomPayment(false);
                        if (!formData.paymentMethod) {
                          setFormData((prev) => ({
                            ...prev,
                            paymentMethod: "Financiamento Bancário",
                          }));
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Ver lista
                    </button>
                  </div>
                )}
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
              {saving ? "Validando e Salvando..." : "Salvar Ficha & Avançar p/ Contrato"}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Documentos & Assinatura Digital */}
      {activeTab === "documentos" && (
        <div className="space-y-6">
          {/* Top navigation inside Tab 2 */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("cadastro")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span>Voltar para 1. Ficha Cadastral</span>
            </button>
            <span className="text-[11px] text-[var(--color-muted-foreground)]">
              Etapa 2 de 3: Emissão e Assinatura Digital
            </span>
          </div>

          {/* Quick Action: Gerar e Editar Documentos em Tempo Real */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Contrato de Compra e Venda Solar */}
            <Card className="border-[var(--color-border)] bg-[var(--color-card)] transition hover:border-[var(--color-primary)]/40 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--color-primary)]">
                    <FileText className="h-5 w-5" />
                    <CardTitle className="text-sm font-semibold">
                      Contrato de Compra e Venda Solar ({formData.customerType})
                    </CardTitle>
                  </div>
                  {sale?.documents?.some((d: any) =>
                    String(d?.templateType || d?.documentType || "").startsWith("CONTRATO")
                  ) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Minuta Pronta
                    </span>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Emita diretamente com as cláusulas padrão da plataforma ou personalize a minuta
                  exclusivamente para este cliente.
                </CardDescription>

                <div className="mt-2 rounded-lg bg-[var(--color-background)] p-2.5 border border-[var(--color-border)]/70 text-[11px] text-[var(--color-muted-foreground)] space-y-1">
                  <div className="font-semibold text-[var(--color-foreground)] flex items-center gap-1">
                    <span>💡</span> Escopo da Edição:
                  </div>
                  <p>
                    O modelo padrão da empresa permanece intacto nas configurações gerais. As
                    cláusulas e textos editados aqui aplicam-se{" "}
                    <strong>exclusivamente ao contrato deste cliente</strong>.
                  </p>
                  <div className="pt-1 border-t border-[var(--color-border)]/50 mt-1.5 flex items-center justify-between">
                    <span>Deseja alterar o padrão para os próximos clientes?</span>
                    <Link
                      href="/configuracoes/documentos"
                      target="_blank"
                      className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      <span>Configurar Modelo Padrão</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateStandardDocument(
                        formData.customerType === "PJ" ? "CONTRATO_PJ" : "CONTRATO_PF"
                      )
                    }
                    disabled={generatingDoc === "CONTRATO_PF" || generatingDoc === "CONTRATO_PJ"}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  >
                    {generatingDoc === "CONTRATO_PF" || generatingDoc === "CONTRATO_PJ" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    {sale?.documents?.some((d: any) =>
                      String(d?.templateType || d?.documentType || "").startsWith("CONTRATO")
                    )
                      ? "Regenerar com Modelo Padrão"
                      : "Gerar Contrato (Padrão)"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleOpenDocumentEditor(
                        formData.customerType === "PJ" ? "CONTRATO_PJ" : "CONTRATO_PF"
                      )
                    }
                    disabled={generatingDoc === "CONTRATO_PF" || generatingDoc === "CONTRATO_PJ"}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  >
                    <FileEdit className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Editar Contrato deste Cliente</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Procuração de Homologação ANEEL */}
            <Card className="border-[var(--color-border)] bg-[var(--color-card)] transition hover:border-[var(--color-primary)]/40 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--color-primary)]">
                    <FileCheck2 className="h-5 w-5" />
                    <CardTitle className="text-sm font-semibold">
                      Procuração de Homologação ANEEL ({formData.customerType})
                    </CardTitle>
                  </div>
                  {sale?.documents?.some((d: any) =>
                    String(d?.templateType || d?.documentType || "").startsWith("PROCURACAO")
                  ) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Minuta Pronta
                    </span>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Termo de outorga para o integrador representar{" "}
                  {formData.customerType === "PJ" ? "a empresa" : "o cliente"} junto à
                  concessionária de energia ({formData.utilityCompany || "CEMIG"}).
                </CardDescription>

                <div className="mt-2 rounded-lg bg-[var(--color-background)] p-2.5 border border-[var(--color-border)]/70 text-[11px] text-[var(--color-muted-foreground)] space-y-1">
                  <div className="font-semibold text-[var(--color-foreground)] flex items-center gap-1">
                    <span>💡</span> Escopo da Edição:
                  </div>
                  <p>
                    O modelo de procuração padrão permanece preservado. Quaisquer poderes ou
                    parágrafos ajustados aqui são aplicados{" "}
                    <strong>apenas para este cliente</strong>.
                  </p>
                  <div className="pt-1 border-t border-[var(--color-border)]/50 mt-1.5 flex items-center justify-between">
                    <span>Deseja alterar o padrão para os próximos clientes?</span>
                    <Link
                      href="/configuracoes/documentos"
                      target="_blank"
                      className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      <span>Configurar Modelo Padrão</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateStandardDocument(
                        formData.customerType === "PJ" ? "PROCURACAO_PJ" : "PROCURACAO_PF"
                      )
                    }
                    disabled={
                      generatingDoc === "PROCURACAO_PF" || generatingDoc === "PROCURACAO_PJ"
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  >
                    {generatingDoc === "PROCURACAO_PF" || generatingDoc === "PROCURACAO_PJ" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileCheck2 className="h-3.5 w-3.5" />
                    )}
                    {sale?.documents?.some((d: any) =>
                      String(d?.templateType || d?.documentType || "").startsWith("PROCURACAO")
                    )
                      ? "Regenerar com Modelo Padrão"
                      : "Gerar Procuração (Padrão)"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleOpenDocumentEditor(
                        formData.customerType === "PJ" ? "PROCURACAO_PJ" : "PROCURACAO_PF"
                      )
                    }
                    disabled={
                      generatingDoc === "PROCURACAO_PF" || generatingDoc === "PROCURACAO_PJ"
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  >
                    <FileEdit className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Editar Procuração deste Cliente</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Banner de Esclarecimento sobre Assinaturas Bilaterais com fundo sólido */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-xs space-y-3 shadow-sm">
            <div className="font-semibold text-[var(--color-foreground)] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
              Como Funciona a Assinatura Bilateral (Você e o Cliente):
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-[var(--color-muted-foreground)]">
              <div className="rounded-lg bg-[var(--color-background)] p-3.5 border border-[var(--color-border)]">
                <span className="font-semibold text-[var(--color-foreground)] block mb-1">
                  1. Sua Empresa (CONTRATADA)
                </span>
                Assinada e autenticada digitalmente de forma automática pela plataforma EnergivIA na
                emissão do documento, com carimbo institucional e hash SHA-256.
              </div>
              <div className="rounded-lg bg-[var(--color-background)] p-3.5 border border-[var(--color-border)]">
                <span className="font-semibold text-[var(--color-foreground)] block mb-1">
                  2. O Cliente (CONTRATANTE)
                </span>
                Assina pelo link seguro (celular/computador) com autenticação em 2 etapas (OTP por
                e-mail e conferência de CPF).
              </div>
            </div>
            <p className="text-[11px] text-[var(--color-muted-foreground)] pt-1">
              * O documento PDF final contém o <strong>contrato integral</strong> com todas as
              cláusulas, os <strong>blocos de assinatura de ambas as partes</strong> e a{" "}
              <strong>folha de trilha de auditoria probatória</strong> anexa no final.
            </p>
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
                        className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-[var(--color-foreground)] truncate max-w-[280px] sm:max-w-none">
                              {title}
                            </span>
                            {isSigned ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Assinado
                              </span>
                            ) : isContract && !doc.companySignedAt && !doc.isCompanySigned ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                <Clock className="h-2.5 w-2.5" /> Aguarda Integrador
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                                <Clock className="h-2.5 w-2.5" /> Aguarda Cliente
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted-foreground)]">
                            <span>Gerado em: {formatDate(doc.createdAt)}</span>
                            {(doc.companySignedAt || doc.isCompanySigned) && (
                              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                Assinado pelo Integrador: {formatDate(doc.companySignedAt)}
                              </span>
                            )}
                            {isSigned && (
                              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                Assinado pelo Cliente: {formatDate(doc.signedAt)} por{" "}
                                {doc.signerName}
                              </span>
                            )}
                            <span className="font-mono text-[10px]">
                              SHA-256: {doc.originalPdfHash?.slice(0, 14)}...
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          {isSigned ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingPdfDoc({
                                    url: `/api/proxy/public/documents/${token}/pdf?regenerate=true`,
                                    title: doc.title || "Contrato Assinado",
                                    isSigned: true,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-semibold text-[var(--color-foreground)] shadow-sm hover:bg-[var(--color-muted)] hover:border-[var(--color-primary)]/40 transition-colors"
                                title="Visualizar documento completo assinado com botão de voltar"
                              >
                                <Download className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                                Visualizar PDF Assinado
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedDocForEditing(doc.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
                                title="Ver minuta original com cláusulas assinadas"
                              >
                                <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                Ver Minuta
                              </button>

                              <span
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                title="Documento juridicamente válido e com hash probatório registrado (inalterável)"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                Protegido por Lei
                              </span>
                            </>
                          ) : (
                            <>
                              {/* Botão de Assinatura do Integrador */}
                              {isContract && !doc.companySignedAt && !doc.isCompanySigned && (
                                <button
                                  type="button"
                                  onClick={() => setCompanySigningDoc(doc)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                                  title="Assinar formalmente como integrador antes de enviar ao cliente"
                                >
                                  <FileSignature className="h-3.5 w-3.5" />
                                  Assinar como Integrador
                                </button>
                              )}

                              {/* Visualizar PDF da minuta */}
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingPdfDoc({
                                    url: `/api/proxy/public/documents/${token}/pdf?regenerate=true`,
                                    title: doc.title || "Minuta de Contrato",
                                    isSigned: false,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-foreground)] shadow-sm hover:bg-[var(--color-muted)] transition-colors"
                                title="Visualizar documento em PDF com botão de voltar"
                              >
                                <Download className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                                PDF
                              </button>

                              {/* Copiar Link de Assinatura */}
                              <button
                                type="button"
                                onClick={() => handleCopySignLink(token, doc)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-foreground)] shadow-sm hover:bg-[var(--color-muted)] transition-colors"
                                title="Copiar link seguro para o cliente assinar"
                              >
                                {copiedLink === token ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    <span className="text-emerald-600 font-semibold">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                                    <span>Copiar Link</span>
                                  </>
                                )}
                              </button>

                              {/* WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppMessage(doc)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
                                title="Abrir WhatsApp para enviar o link do contrato ao cliente"
                              >
                                {copiedMsg === doc.id ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Abrindo...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>WhatsApp</span>
                                  </>
                                )}
                              </button>

                              {/* Excluir Minuta de Teste */}
                              <button
                                type="button"
                                onClick={() => setDocToDelete(doc)}
                                disabled={deletingDocId === doc.id}
                                className="inline-flex items-center justify-center rounded-lg border border-transparent p-1.5 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900/60 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                                title="Excluir este documento não assinado"
                              >
                                {deletingDocId === doc.id ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
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

          {/* Bottom navigation inside Tab 2 */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={() => setActiveTab("cadastro")}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <span>Voltar para 1. Ficha Cadastral</span>
            </button>

            {sale?.documents?.some((d: any) => (d?.status || d?.signStatus) === "SIGNED") && (
              <button
                type="button"
                onClick={() => setActiveTab("auditoria")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Ver Trilha de Auditoria Jurídica →</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Trilha de Auditoria Jurídica */}
      {activeTab === "auditoria" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("documentos")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span>Voltar para 2. Contratos & Documentos</span>
            </button>
          </div>
          <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-sm font-semibold">
                  Validade Jurídica & Trilha de Auditoria
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Conformidade com a Medida Provisória nº 2.200-2/2001 e Lei Federal nº 14.063/2020
                para assinaturas eletrônicas avançadas.
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
                    <strong>Integridade Criptográfica:</strong> Duplo hash SHA-256 (hash do
                    documento original e hash final do documento após aposição de assinatura).
                  </li>
                  <li>
                    <strong>Evidências Forenses:</strong> Registro do endereço IP do signatário,
                    porta lógica, User-Agent do dispositivo e carimbo de data/hora oficial de
                    Brasília.
                  </li>
                  <li>
                    <strong>Certificado de Autenticidade:</strong> O PDF assinado é emitido com
                    certificado digital e carimbo oficial de autenticidade.
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
                        <span className="font-semibold text-[var(--color-foreground)]">
                          {title}
                        </span>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">
                          Token: <code className="font-mono">{token}</code>
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-[var(--color-muted-foreground)]">
                        <div>
                          <strong>Hash do Documento Original (SHA-256):</strong>
                          <div className="font-mono text-[10px] break-all">
                            {doc.originalPdfHash}
                          </div>
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

                      {(doc.companySignedAt || doc.isCompanySigned) && (
                        <div className="pt-2 border-t border-[var(--color-border)] flex flex-wrap items-center gap-4 text-[11px] text-emerald-800 dark:text-emerald-300">
                          <span>
                            <strong>Integrador (CONTRATADA):</strong>{" "}
                            {doc.companySignerName || "Representante Legal"}
                          </span>
                          <span>
                            <strong>Data/Hora:</strong> {formatDate(doc.companySignedAt)}
                          </span>
                          <span>
                            <strong>IP Registrado:</strong> {doc.companySignerIp || "—"}
                          </span>
                        </div>
                      )}

                      {isSigned && (
                        <div className="pt-2 border-t border-[var(--color-border)] flex flex-wrap items-center gap-4 text-[11px]">
                          <span>
                            <strong>Cliente (CONTRATANTE):</strong> {doc.signerName}
                          </span>
                          <span>
                            <strong>Data/Hora:</strong> {formatDate(doc.signedAt)}
                          </span>
                          <span>
                            <strong>IP Registrado:</strong> {doc.signerIp || "—"}
                          </span>
                          {doc.signerUserAgent && (
                            <span>
                              <strong>Dispositivo:</strong>{" "}
                              {parseUserAgentFriendly(doc.signerUserAgent)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Bottom navigation inside Tab 3 */}
          <div className="flex items-center justify-start border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={() => setActiveTab("documentos")}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <span>Voltar para 2. Contratos & Documentos</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Edição de Documento em Tempo Real */}
      {selectedDocForEditing && (
        <LiveContractEditorModal
          saleId={saleId}
          docId={selectedDocForEditing}
          isOpen={Boolean(selectedDocForEditing)}
          onClose={() => setSelectedDocForEditing(null)}
          onSaved={() => {
            loadSale();
          }}
        />
      )}

      {/* Modal de Assinatura do Integrador (CONTRATADA) */}
      {companySigningDoc && (
        <CompanySignModal
          isOpen={Boolean(companySigningDoc)}
          onClose={() => setCompanySigningDoc(null)}
          saleId={saleId}
          docId={companySigningDoc.id}
          docTitle={companySigningDoc.title}
          onSuccess={async () => {
            await loadSale();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
          }}
        />
      )}

      {/* Modal de Visualização de Documento PDF com Botão Voltar */}
      {viewingPdfDoc && (
        <PdfViewerModal
          isOpen={Boolean(viewingPdfDoc)}
          onClose={() => setViewingPdfDoc(null)}
          pdfUrl={viewingPdfDoc.url}
          title={viewingPdfDoc.title}
          isSigned={viewingPdfDoc.isSigned}
        />
      )}

      {/* Modal de Confirmação para Exclusão de Minuta de Teste */}
      {docToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-500/10 p-2.5 text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                  Excluir Minuta de Contrato?
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                  Esta ação removerá a minuta pendente de teste. Como o documento{" "}
                  <strong>não foi assinado</strong>, ele pode ser descartado com segurança sem gerar
                  nenhum efeito ou histórico jurídico.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-[var(--color-background)] p-3 border border-[var(--color-border)] text-xs space-y-1">
              <div className="font-semibold text-[var(--color-foreground)]">
                {docToDelete.title || "Contrato Solar"}
              </div>
              <div className="text-[11px] text-[var(--color-muted-foreground)]">
                Status: Aguardando Assinatura · Não oficializado
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={Boolean(deletingDocId)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDocument(docToDelete.id)}
                disabled={Boolean(deletingDocId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingDocId ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Sim, Excluir Minuta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
