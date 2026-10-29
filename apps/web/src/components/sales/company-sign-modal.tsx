/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  FileSignature,
  PenTool,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { getCompanySignature, signCompanySaleDocument, TenantSignatureInfo } from "@/lib/sales-api";

interface CompanySignModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  docId: string;
  docTitle?: string;
  onSuccess: () => void;
}

export function CompanySignModal({
  isOpen,
  onClose,
  saleId,
  docId,
  docTitle,
  onSuccess,
}: CompanySignModalProps) {
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<TenantSignatureInfo | null>(null);

  // Form states
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [useSaved, setUseSaved] = useState(true);
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadSignature() {
      setLoadingConfig(true);
      setError(null);
      try {
        const info = await getCompanySignature();
        setCompanyInfo(info);
        if (info.representativeName) {
          setSignerName(info.representativeName);
        }
        if (info.representativeCpf) {
          setSignerCpf(info.representativeCpf);
        }
        if (info.representativeSignature) {
          setUseSaved(true);
        } else {
          setUseSaved(false);
        }
      } catch (err: any) {
        setError(err.message || "Erro ao carregar dados da empresa.");
      } finally {
        setLoadingConfig(false);
      }
    }

    loadSignature();
  }, [isOpen]);

  if (!isOpen) return null;

  function startDrawing(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleConfirmSign() {
    setError(null);

    let signatureImage = "";
    if (useSaved && companyInfo?.representativeSignature) {
      signatureImage = companyInfo.representativeSignature;
    } else {
      if (!canvasRef.current || !hasDrawn) {
        setError("Por favor, desenhe sua rubrica no espaço indicado.");
        return;
      }
      signatureImage = canvasRef.current.toDataURL("image/png");
    }

    setSigning(true);
    try {
      await signCompanySaleDocument(saleId, docId, {
        signatureImage,
        signerName: signerName.trim() || undefined,
        signerCpf: signerCpf.trim() || undefined,
        saveAsDefault: !useSaved ? saveAsDefault : false,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha ao assinar documento pela empresa.");
    } finally {
      setSigning(false);
    }
  }

  const hasSavedSignature = Boolean(companyInfo?.representativeSignature);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Assinar como Integrador
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chancela oficial da CONTRATADA para envio ao cliente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {loadingConfig ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="mt-2 text-xs text-slate-500">Carregando dados da assinatura...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Document Banner */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Documento Vinculado
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {docTitle || "Contrato de Prestação de Serviços e Fornecimento Solar"}
                </span>
              </div>

              {/* Toggle Saved vs New Canvas */}
              {hasSavedSignature && (
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setUseSaved(true)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                      useSaved
                        ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Rubrica Salva
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseSaved(false)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                      !useSaved
                        ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    Desenhar Nova
                  </button>
                </div>
              )}

              {/* Saved Signature View */}
              {useSaved && hasSavedSignature ? (
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <span className="block text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    Rubrica Oficial Cadastrada
                  </span>
                  <div className="my-2.5 flex items-center justify-center rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-900/50 dark:bg-slate-900">
                    <img
                      src={companyInfo?.representativeSignature || ""}
                      alt="Rubrica do Representante"
                      className="max-h-16 max-w-full object-contain"
                    />
                  </div>
                  <div className="text-left text-xs text-slate-600 dark:text-slate-300">
                    <p>
                      <strong>Representante:</strong> {signerName || "Representante Legal"}
                    </p>
                    {signerCpf && (
                      <p className="mt-0.5">
                        <strong>CPF:</strong> {signerCpf}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Canvas to Draw */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Nome do Representante
                      </label>
                      <input
                        type="text"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        CPF do Representante
                      </label>
                      <input
                        type="text"
                        value={signerCpf}
                        onChange={(e) => setSignerCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Desenhe sua rubrica abaixo
                      </label>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Limpar
                      </button>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-slate-950">
                      <canvas
                        ref={canvasRef}
                        width={460}
                        height={120}
                        className="w-full cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                      {!hasDrawn && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                          Desenhe aqui com o mouse ou o dedo
                        </div>
                      )}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveAsDefault}
                      onChange={(e) => setSaveAsDefault(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      Salvar esta rubrica como padrão da empresa para futuros contratos
                    </span>
                  </label>
                </div>
              )}

              {/* Compliance note */}
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  Ao confirmar, seu IP, data/hora e carimbo criptográfico SHA-256 serão vinculados
                  como a <strong>CONTRATADA</strong>, liberando o envio do link já chancelado ao
                  cliente.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            disabled={signing}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmSign}
            disabled={signing || loadingConfig}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {signing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Assinando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirmar e Assinar Contrato
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
