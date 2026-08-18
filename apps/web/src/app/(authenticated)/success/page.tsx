"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const { refetch } = useOrganization();

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/proxy/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setPlanName(data?.subscription?.plan?.name || null);
            await refetch();
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          if (isMounted) {
            setError(errData.message || "Não foi possível validar a sessão no Stripe.");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erro ao comunicar com o servidor.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [sessionId, refetch]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-background)]">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-10 max-w-md w-full text-center shadow-xl">
          <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
            Confirmando seu pagamento...
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Estamos ativando os recursos do seu plano na EnergivIA.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-background)]">
        <div className="bg-[var(--color-card)] border border-red-500/30 rounded-2xl p-10 max-w-md w-full text-center shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
            Atenção na verificação
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mb-6">{error}</p>
          <Link
            href="/gestao/meus-planos"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition"
          >
            Ir para Meus Planos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-background)] animate-in fade-in duration-500">
      <div className="relative bg-[var(--color-card)] border border-emerald-500/30 rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          Pagamento Confirmado
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-foreground)] mb-3 tracking-tight">
          Assinatura Ativada!
        </h1>

        <p className="text-base text-[var(--color-muted-foreground)] mb-8 leading-relaxed">
          {planName
            ? `Parabéns! O seu plano ${planName} já está ativo e todos os recursos foram liberados.`
            : "Parabéns! Sua assinatura foi confirmada com sucesso e todos os recursos da plataforma já estão disponíveis para uso."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/gestao/meus-planos"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] font-medium border border-[var(--color-border)] transition"
          >
            Ver Meus Planos
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20"
          >
            Acessar Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
