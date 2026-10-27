"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileSignature,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProposalZapSignCardProps {
  proposalId: string;
  zapsignSignUrl?: string | null;
  zapsignStatus?: string | null;
  zapsignSignedPdfUrl?: string | null;
  onUpdated?: (data: {
    zapsignSignUrl?: string | null;
    zapsignStatus?: string | null;
    zapsignDocToken?: string | null;
  }) => void;
}

export function ProposalZapSignCard({
  proposalId,
  zapsignSignUrl: initialSignUrl,
  zapsignStatus: initialStatus,
  zapsignSignedPdfUrl,
  onUpdated,
}: ProposalZapSignCardProps) {
  const [addonEnabled, setAddonEnabled] = useState<boolean | null>(null);
  const [addonReason, setAddonReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [signUrl, setSignUrl] = useState<string | null>(initialSignUrl ?? null);
  const [status, setStatus] = useState<string | null>(initialStatus ?? null);

  useEffect(() => {
    setSignUrl(initialSignUrl ?? null);
    setStatus(initialStatus ?? null);
  }, [initialSignUrl, initialStatus]);

  useEffect(() => {
    let active = true;
    fetch("/api/proxy/proposals/zapsign/status")
      .then(async (res) => {
        if (!res.ok) return { enabled: false };
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setAddonEnabled(Boolean(data?.enabled));
        setAddonReason(data?.reason ?? null);
      })
      .catch(() => {
        if (!active) return;
        setAddonEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleGenerateZapSign = async (forceRecreate = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/proposals/${encodeURIComponent(proposalId)}/zapsign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRecreate }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Não foi possível gerar o documento no ZapSign.");
      }

      setSignUrl(data.signUrl || null);
      setStatus(data.status || "PENDING");
      onUpdated?.({
        zapsignSignUrl: data.signUrl || null,
        zapsignStatus: data.status || "PENDING",
        zapsignDocToken: data.docToken || null,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao comunicar com o ZapSign.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!signUrl) return;
    void navigator.clipboard.writeText(signUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
      aria-label="Assinatura Digital ZapSign"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Assinatura Digital com Validade Jurídica (ZapSign)
              </h2>
              {status === "SIGNED" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  Assinado
                </span>
              ) : signUrl ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  Aguardando Assinatura
                </span>
              ) : addonEnabled === false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 border border-slate-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                  <Lock className="w-3 h-3" />
                  Add-on Opcional (+ R$ 59,90/mês)
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {status === "SIGNED"
                ? "Esta proposta foi assinada digitalmente pelo cliente com validade jurídica no ZapSign."
                : addonEnabled === false
                  ? addonReason ||
                    "Envie propostas e contratos para assinatura jurídica com 1 clique ativando o módulo ZapSign em Meus Planos."
                  : "Gere o link oficial de assinatura eletrônica no ZapSign a partir do PDF desta proposta para enviar ao cliente."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {addonEnabled === false ? (
            <Link
              href="/gestao/meus-planos"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 text-xs font-bold text-white transition shadow-sm"
            >
              <FileSignature className="w-3.5 h-3.5" />
              Ativar ZapSign (+ R$ 59,90/mês)
            </Link>
          ) : status === "SIGNED" && (zapsignSignedPdfUrl || signUrl) ? (
            <a
              href={zapsignSignedPdfUrl || signUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 text-xs font-bold text-white transition shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Documento Assinado
            </a>
          ) : signUrl ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {copied ? "Link Copiado!" : "Copiar Link ZapSign"}
              </Button>
              <a
                href={signUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 text-xs font-bold text-white transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir no ZapSign
              </a>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={() => void handleGenerateZapSign(true)}
                title="Regerar documento no ZapSign com o PDF atualizado"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={loading || addonEnabled === null}
              onClick={() => void handleGenerateZapSign(false)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Gerando no ZapSign...
                </>
              ) : (
                <>
                  <FileSignature className="mr-1.5 h-3.5 w-3.5" />
                  Gerar Assinatura ZapSign
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2.5 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
      )}
    </section>
  );
}
