/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileSignature,
  FileText,
  KeyRound,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  getPublicDocument,
  requestPublicOtp,
  signPublicDocument,
  verifyPublicOtp,
} from "@/lib/sales-api";
import { PdfViewerModal } from "@/components/sales/pdf-viewer-modal";
import { BrandLogo } from "@/components/ui/brand-logo";
import { cn } from "@energivia/utils";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
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

function formatCpfOrCnpj(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export default function PublicSignDocumentPage(): JSX.Element {
  const params = useParams();
  const token = params["token"] as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Stepper: 1: PREVIEW, 2: CPF, 3: OTP, 4: SIGN, 5: SUCCESS
  const [step, setStep] = useState<number>(1);

  // Identity verification
  const [cpfInput, setCpfInput] = useState("");
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [emailMasked, setEmailMasked] = useState("");

  // OTP verification
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [penColor, setPenColor] = useState<string>("#0f172a");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submittingSign, setSubmittingSign] = useState(false);
  const [signResult, setSignResult] = useState<any>(null);

  useEffect(() => {
    async function fetchDoc() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicDocument(token);
        setDoc(data);
        if (data.signStatus === "SIGNED" || data.status === "SIGNED" || data.isSigned) {
          setStep(5);
          setSignResult({
            signedAt: data.signedAt,
            signedPdfHash: data.signedPdfHash,
          });
        }
      } catch (err: any) {
        setError(err.message || "Documento não encontrado ou link expirado.");
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [token]);

  // Request OTP handler
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!cpfInput.trim()) {
      setError("Por favor, digite seu CPF ou CNPJ cadastrado.");
      return;
    }
    setRequestingOtp(true);
    setError(null);
    try {
      const res = await requestPublicOtp(token, cpfInput.replace(/\D/g, ""));
      setEmailMasked(res.emailMasked);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Erro ao verificar CPF/CNPJ. Confira os números digitados.");
    } finally {
      setRequestingOtp(false);
    }
  }

  // Verify OTP handler
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length < 4) {
      setError("Digite o código de 5 dígitos recebido em seu e-mail.");
      return;
    }
    setVerifyingOtp(true);
    setError(null);
    try {
      await verifyPublicOtp(token, otpCode.trim());
      setStep(4);
    } catch (err: any) {
      setError(err.message || "Código inválido ou expirado. Tente novamente.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  function getCanvasCoordinates(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Precise scale factor between CSS box size and internal bitmap coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  // Setup Canvas touch & mouse handlers
  function startDrawing(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;

    // Immediately register point on tap/dot
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.closePath();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  const signerDisplayName = doc?.signerName || doc?.customerName || "Titular do Contrato";
  const organizationDisplayName =
    doc?.organizationName || doc?.companyName || "EnergivIA Soluções Solares";

  // Submit Signature
  async function handleConfirmSign() {
    if (!hasSignature || !canvasRef.current) {
      setError("Por favor, faça sua rubrica ou assinatura no campo indicado.");
      return;
    }
    if (!acceptedTerms) {
      setError("Você deve declarar ciência e concordância com os termos do documento.");
      return;
    }

    setSubmittingSign(true);
    setError(null);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const res = await signPublicDocument(token, {
        signatureImage: dataUrl,
        signerName: signerDisplayName,
        signerCpf: cpfInput || doc?.signerCpf,
      });

      setSignResult(res);
      setStep(5);
    } catch (err: any) {
      setError(err.message || "Erro ao processar assinatura eletrônica.");
    } finally {
      setSubmittingSign(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Carregando documento seguro...
        </p>
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg dark:border-red-900/50 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            Acesso Indisponível
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <p className="mt-4 text-xs text-slate-400">
            Entre em contato com a empresa de energia solar emissora para obter um novo link de
            assinatura.
          </p>
        </div>
      </div>
    );
  }

  const isContract = String(doc?.templateType || doc?.documentType || "").startsWith("CONTRATO");
  const docTitle =
    doc?.title ||
    (isContract ? "Contrato de Compra e Venda Solar" : "Procuração para Homologação ANEEL");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      {/* Top Banner Institucional */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sticky top-0 z-20">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-7 max-w-[130px] sm:max-w-[160px] flex items-center shrink-0">
              <BrandLogo size="sm" priority />
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" /> Sign
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline font-mono text-[10px]">
              MP 2.200-2/2001 · Lei 14.063
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Stepper Progress */}
        {step < 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              <span className={step >= 1 ? "text-emerald-600 font-semibold" : ""}>1. Revisão</span>
              <span className={step >= 2 ? "text-emerald-600 font-semibold" : ""}>
                2. Identidade
              </span>
              <span className={step >= 3 ? "text-emerald-600 font-semibold" : ""}>3. Código</span>
              <span className={step >= 4 ? "text-emerald-600 font-semibold" : ""}>4. Rubrica</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-medium text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        )}

        {/* STEP 1: PREVIEW */}
        {step === 1 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                {isContract ? <FileText className="h-6 w-6" /> : <FileCheck2 className="h-6 w-6" />}
              </div>
              <div>
                <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Documento Pronto para Assinatura
                </span>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {docTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {doc?.createdAt
                    ? `Gerado em ${formatDate(doc.createdAt)}`
                    : "Pronto para assinatura eletrônica"}
                </p>
              </div>
            </div>

            {/* Document Info Box */}
            <div className="rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/50 space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">Signatário Titular:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {signerDisplayName}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">Empresa Integradora:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {organizationDisplayName}
                </span>
              </div>
              {isContract && (doc?.isCompanySigned || doc?.companySignedAt) && (
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-700/60 text-emerald-700 dark:text-emerald-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Chancela do Integrador:
                  </span>
                  <span>Assinado por {doc.companySignerName || "Representante Autorizado"}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Integridade (SHA-256 Original):
                </span>
                <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">
                  {doc?.originalPdfHash ? `${doc.originalPdfHash.slice(0, 16)}...` : "—"}
                </span>
              </div>
            </div>

            {/* PDF Preview CTA */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
              >
                <Eye className="h-4 w-4" />
                Visualizar / Baixar Minuta (PDF)
              </button>

              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-700"
              >
                Avançar para Assinar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIRMAÇÃO DE CPF / CNPJ */}
        {step === 2 && (
          <form
            onSubmit={handleRequestOtp}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirmação de Identidade
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Para garantir a segurança jurídica, confirme o CPF ou CNPJ cadastrado.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Digite seu CPF ou CNPJ
              </label>
              <input
                type="text"
                value={cpfInput}
                onChange={(e) => setCpfInput(formatCpfOrCnpj(e.target.value))}
                maxLength={18}
                placeholder="000.000.000-00"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                autoFocus
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                O código de validação OTP será enviado para o e-mail cadastrado na contratação.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>

              <button
                type="submit"
                disabled={requestingOtp}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {requestingOtp ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {requestingOtp ? "Validando..." : "Enviar Código de Segurança"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: CÓDIGO OTP */}
        {step === 3 && (
          <form
            onSubmit={handleVerifyOtp}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Código de Autenticação
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enviamos um código de 5 dígitos para o e-mail:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{emailMasked}</strong>
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Código de 5 dígitos
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                maxLength={5}
                placeholder="12345"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Corrigir CPF/CNPJ
              </button>

              <button
                type="submit"
                disabled={verifyingOtp}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {verifyingOtp ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {verifyingOtp ? "Verificando..." : "Validar Código"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: RUBRICA NO CANVAS */}
        {step === 4 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <FileSignature className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Assine ou Rubrique Abaixo
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Utilize o dedo (celular) ou mouse (computador) para desenhar sua assinatura.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Limpar
                </button>
              </div>
            </div>

            {/* Signature Pad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Cor da Caneta:
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPenColor("#0f172a")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all",
                        penColor === "#0f172a"
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      <span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-100 inline-block" />
                      Preto
                    </button>
                    <button
                      type="button"
                      onClick={() => setPenColor("#1e40af")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all",
                        penColor === "#1e40af"
                          ? "bg-white text-blue-700 shadow-xs dark:bg-slate-700 dark:text-blue-300"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      <span className="h-2 w-2 rounded-full bg-blue-700 inline-block" />
                      Azul
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white p-2.5 shadow-md">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={240}
                  className="w-full h-48 cursor-crosshair touch-none rounded-xl bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasSignature && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-400 select-none">
                    <FileSignature className="h-6 w-6 text-slate-300 mb-1" />
                    <span>Escreva sua assinatura aqui</span>
                  </div>
                )}
                <div className="pointer-events-none absolute bottom-5 left-6 right-6 border-b border-slate-300 text-center pb-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                    Linha de Assinatura · {signerDisplayName}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms acceptance */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Declaro que li e concordo integralmente com os termos deste documento, reconhecendo
                sua eficácia e validade jurídica nos moldes da{" "}
                <strong>Medida Provisória nº 2.200-2/2001</strong> e{" "}
                <strong>Lei Federal nº 14.063/2020</strong>.
              </span>
            </label>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>

              <button
                onClick={handleConfirmSign}
                disabled={submittingSign || !hasSignature || !acceptedTerms}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {submittingSign ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {submittingSign ? "Processando e Carimbando..." : "Confirmar e Assinar"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUCESSO / CONCLUÍDO */}
        {step === 5 && (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg dark:border-emerald-900/50 dark:bg-slate-900 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Assinatura Concluída com Sucesso
              </span>
              <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                Documento Eletrônico Assinado!
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Seu documento foi autenticado e carimbado digitalmente com eficácia jurídica plena.
              </p>
            </div>

            {/* Audit Details */}
            <div className="rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/50 text-left space-y-2">
              {(doc?.companySignedAt || doc?.isCompanySigned) && (
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-700/60 text-emerald-800 dark:text-emerald-300">
                  <span className="text-slate-500 dark:text-slate-400">
                    Integrador (CONTRATADA):
                  </span>
                  <span className="font-semibold">
                    {doc.companySignerName || "Representante Legal"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {doc?.companySignedAt ? "Cliente (CONTRATANTE):" : "Signatário:"}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {signerDisplayName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Data e Hora do Aceite:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(signResult?.signedAt || doc?.signedAt)}
                </span>
              </div>
              {signResult?.signedPdfHash && (
                <div className="border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">
                    Hash Criptográfico SHA-256 do Documento Assinado:
                  </span>
                  <div className="mt-1 font-mono text-[10px] break-all text-emerald-700 dark:text-emerald-300">
                    {signResult.signedPdfHash}
                  </div>
                </div>
              )}
            </div>

            {/* Download PDF button */}
            <div className="pt-2">
              <a
                href={`/api/proxy/public/documents/${token}/pdf?regenerate=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Baixar Documento Assinado (PDF)
              </a>
            </div>

            <p className="text-[11px] text-slate-400">
              Uma cópia deste documento assinado permanece arquivada com segurança na plataforma.
            </p>
          </div>
        )}
      </main>

      {/* MODAL DE VISUALIZAÇÃO COM BOTÃO DE VOLTAR */}
      {showPdfModal && (
        <PdfViewerModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          pdfUrl={`/api/proxy/public/documents/${token}/pdf?regenerate=true`}
          title={docTitle}
          isSigned={false}
        />
      )}
    </div>
  );
}
