"use client";

import { useState } from "react";
import { Check, CheckCircle2, Loader2, Pencil, X, AlertCircle } from "lucide-react";
import {
  submitPublicProposalResponse,
  type ProposalResponseInput,
} from "@/lib/public-proposals-api";

export interface ProposalDecisionModalProps {
  open: boolean;
  onClose: () => void;
  decisionType: "ACCEPT" | "REQUEST_CHANGES" | "REJECT" | null;
  proposalId?: string;
  clientName?: string;
  proposalTitle?: string;
}

export function ProposalDecisionModal({
  open,
  onClose,
  decisionType,
  proposalId,
  clientName,
  proposalTitle: _proposalTitle,
}: ProposalDecisionModalProps): JSX.Element | null {
  const [signatureName, setSignatureName] = useState(clientName ?? "");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!open || !decisionType) return null;

  const isAccept = decisionType === "ACCEPT";
  const isEdit = decisionType === "REQUEST_CHANGES";
  const isReject = decisionType === "REJECT";

  const cleanProposalId =
    proposalId ||
    (typeof window !== "undefined"
      ? window.location.pathname.split("/").filter(Boolean).pop() || ""
      : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cleanProposalId) {
      setError("Identificador da proposta não encontrado.");
      return;
    }

    if (isAccept && !signatureName.trim()) {
      setError("Por favor, digite seu nome completo para assinar o aceite.");
      return;
    }

    if (isEdit && !comments.trim()) {
      setError("Por favor, descreva as alterações ou dúvidas que deseja ajustar.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: ProposalResponseInput = {
      decision: decisionType,
      comments: comments.trim() || undefined,
      signatureName: signatureName.trim() || undefined,
      contactWhatsapp: contactWhatsapp.trim() || undefined,
    };

    try {
      await submitPublicProposalResponse(cleanProposalId, payload);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar resposta. Tente novamente.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setError(null);
    setLoading(false);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] p-6 text-white shadow-2xl transition-all sm:p-8">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {isAccept
                ? "Aceite Confirmado com Sucesso! 🎉"
                : isEdit
                  ? "Solicitação Enviada! 📝"
                  : "Resposta Registrada! ✅"}
            </h3>
            <p className="mt-2 text-sm text-zinc-300">
              {isAccept
                ? "Obrigado pela confiança! Nossa equipe foi notificada instantaneamente e entrará em contato para dar sequência ao seu projeto solar."
                : isEdit
                  ? "Recebemos suas solicitações de alteração. Nossa equipe técnica e comercial entrará em contato para revisar as condições."
                  : "Sua decisão foi informada à equipe. Agradecemos pelo seu tempo e atenção!"}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-emerald-500"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-2">
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                {isAccept && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-400 border border-emerald-500/30">
                    <Check className="h-3.5 w-3.5" /> Aceite da Proposta
                  </span>
                )}
                {isEdit && (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-amber-400 border border-amber-500/30">
                    <Pencil className="h-3.5 w-3.5" /> Solicitar Alterações
                  </span>
                )}
                {isReject && (
                  <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-rose-400 border border-rose-500/30">
                    <X className="h-3.5 w-3.5" /> Recusar Proposta
                  </span>
                )}
              </div>

              <h2 className="mt-2 text-xl font-bold text-white">
                {isAccept
                  ? "Confirmar Aceite da Proposta"
                  : isEdit
                    ? "Solicitar Ajustes no Projeto"
                    : "Informar Recusa da Proposta"}
              </h2>

              <p className="mt-1 text-xs text-zinc-400">
                {isAccept
                  ? "Preencha as informações abaixo para confirmar seu aceite. Nossa equipe receberá seu alerta imediatamente."
                  : isEdit
                    ? "Informe o que você gostaria de modificar na proposta para nossa equipe reavaliar."
                    : "Se desejar, deixe uma observação sobre o motivo da recusa."}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isAccept && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Nome Completo do Signatário / Titular *
                </label>
                <input
                  type="text"
                  required
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                WhatsApp / Telefone para Contato
              </label>
              <input
                type="text"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                placeholder="Ex: (11) 99999-8888"
                className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                {isAccept
                  ? "Observações ou Preferências (Opcional)"
                  : isEdit
                    ? "O que você deseja alterar na proposta? *"
                    : "Motivo ou Feedback (Opcional)"}
              </label>
              <textarea
                rows={3}
                required={isEdit}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  isAccept
                    ? "Ex: Preferência para início da instalação em data específica..."
                    : isEdit
                      ? "Ex: Gostaria de aumentar a quantidade de placas para cobrir aumento de consumo futuro..."
                      : "Ex: Decidi adiar o investimento por enquanto..."
                }
                className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition ${
                  isAccept
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30"
                    : isEdit
                      ? "bg-amber-600 hover:bg-amber-500 shadow-amber-900/30"
                      : "bg-rose-600 hover:bg-rose-500 shadow-rose-900/30"
                } disabled:opacity-50`}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isAccept
                  ? "Confirmar e Aceitar"
                  : isEdit
                    ? "Enviar Solicitação"
                    : "Confirmar Recusa"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
