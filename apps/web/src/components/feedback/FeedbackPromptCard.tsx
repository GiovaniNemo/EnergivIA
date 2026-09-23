/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useOrganization } from "../providers/organization-provider";
import { Star, X, Sparkles, Send, CheckCircle2 } from "lucide-react";

const FEEDBACK_TAGS = [
  "⚡ Propostas Rápidas",
  "🤖 IA Precisa",
  "🎨 Layout Moderno",
  "💬 WhatsApp Ágil",
  "📊 Cálculos Confiáveis",
];

const RATING_LABELS: Record<number, { title: string; color: string }> = {
  1: { title: "Péssimo — Precisa melhorar", color: "text-red-400" },
  2: { title: "Regular — Pode ser melhor", color: "text-amber-400" },
  3: { title: "Bom — Gostei da proposta", color: "text-yellow-400" },
  4: { title: "Muito Bom — Superou expectativas", color: "text-emerald-400" },
  5: { title: "Excelente! — Ferramenta fantástica 🚀", color: "text-amber-300" },
};

export function FeedbackPromptCard() {
  const pathname = usePathname();
  const normalizedPath = (pathname ?? "").replace(/\/$/, "") || "/";
  const { user, currentOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Notifica o sistema/hub sobre abertura e fechamento do card
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("feedback-prompt-visibility-change", { detail: { isOpen } })
    );
  }, [isOpen]);

  useEffect(() => {
    // Durante onboarding ou se o usuário ainda não tiver organização ativa/entrado na plataforma, nunca exibir
    if (normalizedPath === "/create-organization" || !currentOrganization?.id) {
      setIsOpen(false);
      return;
    }

    // Ouvinte para abertura sob demanda disparada pela bolinha de Avaliação no Hub
    const handleOpen = () => {
      setIsOpen(true);
      setSubmitted(false);
      setErrorMessage(null);
    };
    window.addEventListener("open-feedback-prompt", handleOpen);

    // Se a trava dos 5 dias estiver ativa, nunca exibir a avaliação (as duas não podem aparecer juntas)
    if (user?.isTrialLocked) {
      setIsOpen(false);
      return () => {
        window.removeEventListener("open-feedback-prompt", handleOpen);
      };
    }

    // Verifica se já enviou anteriormente ou se já foi exibido automaticamente uma vez
    const hasSubmitted = localStorage.getItem("energivia_feedback_submitted");
    const hasAutoShown = localStorage.getItem("energivia_feedback_auto_shown");

    if (hasSubmitted || hasAutoShown) {
      return () => {
        window.removeEventListener("open-feedback-prompt", handleOpen);
      };
    }

    // Regra de exibição automática ÚNICA (1 vez):
    // 1. Integrador já contratou ou colocou um plano pago comprovado (user?.isTrial === false)
    // 2. OU completou os 5 dias de cadastro/teste (trialDaysLeft === 0 ou trialExpired)
    const hasPaidPlan = Boolean(
      user?.isTrial === false && user?.planTier && user?.planTier !== "TRIAL"
    );
    const reachedFiveDays = Boolean(
      user?.isTrial === true &&
      (user?.trialDaysLeft === 0 || user?.trialExpired || user?.isTrialProposalLimitReached)
    );

    if (hasPaidPlan || reachedFiveDays) {
      const timer = setTimeout(() => {
        if (!user?.isTrialLocked) {
          setIsOpen(true);
          localStorage.setItem("energivia_feedback_auto_shown", "true");
        }
      }, 2000);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("open-feedback-prompt", handleOpen);
      };
    }

    return () => {
      window.removeEventListener("open-feedback-prompt", handleOpen);
    };
  }, [user, currentOrganization?.id, normalizedPath]);

  const handleDismiss = () => {
    setIsOpen(false);
    // Adia por 1 dia se o usuário optou por sair sem avaliar
    localStorage.setItem(
      "energivia_feedback_dismissed_until",
      String(Date.now() + 24 * 60 * 60 * 1000)
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        rating,
        comment: comment.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        channel: "web",
        userName: user?.name,
        userEmail: user?.email,
        tenantId: user?.currentOrganizationId || user?.tenantId,
        userPlan: user?.isTrial ? "TRIAL" : user?.planName || "PAID",
      };

      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitted(true);
        localStorage.setItem("energivia_feedback_submitted", "true");
        setTimeout(() => {
          setIsOpen(false);
        }, 2500);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Falha ao registrar feedback:", errorData);
        setErrorMessage(
          errorData.error || "Não foi possível registrar o feedback no momento. Tente novamente."
        );
      }
    } catch (err: any) {
      console.error("Erro ao enviar avaliação:", err);
      setErrorMessage(
        "Erro de conexão ao enviar avaliação. Verifique sua conexão e tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  if (normalizedPath === "/create-organization" || !currentOrganization?.id) {
    return null;
  }

  return (
    <>
      {/* Card Flutuante de Avaliação (acionado via Hub Orbital ou disparo automático controlado) */}
      {isOpen && (
        <div className="fixed bottom-6 right-5 sm:bottom-6 sm:right-6 z-50 w-[92vw] max-w-[420px] animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="relative overflow-hidden rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl shadow-black/80 text-white p-5 sm:p-6 transition-all">
            {/* Brilho decorativo de fundo */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Cabeçalho */}
            <div className="relative flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-md shadow-amber-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-0.5">
                    {user?.isTrial ? "☀️ Período de Testes (5 dias)" : "💎 Sua Experiência"}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 leading-tight">
                    O que você achou da EnergivIA?
                  </h3>
                </div>
              </div>

              {/* Botão de Fechar / Sair sem avaliar */}
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                title="Fechar e avaliar mais tarde"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              /* Estado de Sucesso */
              <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Muito obrigado pelo feedback! 🌟
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                    Sua avaliação é essencial para continuarmos inovando e acelerando as vendas da
                    sua empresa.
                  </p>
                </div>
              </div>
            ) : (
              /* Formulário de Feedback */
              <form onSubmit={handleSubmit} className="relative space-y-3.5">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Como você avalia nossa plataforma e a velocidade na geração de propostas solares?
                </p>

                {/* Seletor de Estrelas (1 a 5) */}
                <div className="flex flex-col items-center justify-center py-2 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= activeRating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                          aria-label={`Avaliar com ${star} estrelas`}
                        >
                          <Star
                            className={`w-7 h-7 transition-colors duration-150 ${
                              isFilled
                                ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                : "fill-transparent text-neutral-600 hover:text-neutral-400"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-1 transition-colors ${
                      RATING_LABELS[activeRating]?.color || "text-neutral-400"
                    }`}
                  >
                    {RATING_LABELS[activeRating]?.title || ""}
                  </span>
                </div>

                {/* Tags Rápidas de Avaliação */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-neutral-400">
                    O que mais se destacou para você?
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_TAGS.map((tag) => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            selected
                              ? "bg-amber-500/25 border-amber-500/60 text-amber-200"
                              : "bg-neutral-800/60 border-neutral-700/60 text-neutral-300 hover:border-neutral-600 hover:text-white"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Campo de Comentário Opcional */}
                <div>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Deixe um comentário, elogio ou sugestão de melhoria..."
                    className="w-full rounded-xl bg-neutral-950/80 border border-neutral-800 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 resize-none"
                  />
                </div>

                {errorMessage && (
                  <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] leading-tight">
                    {errorMessage}
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-[11px] text-neutral-400 hover:text-white underline-offset-4 hover:underline transition px-1 cursor-pointer"
                  >
                    Avaliar mais tarde
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <span>Enviando...</span>
                    ) : (
                      <>
                        <span>Enviar Avaliação</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
