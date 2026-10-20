/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useOrganization } from "../providers/organization-provider";
import { Star, X, MessageSquareHeart, Send, CheckCircle2 } from "lucide-react";

const FEEDBACK_TAGS = [
  "Propostas Rápidas",
  "IA Precisa",
  "Layout Moderno",
  "WhatsApp Ágil",
  "Cálculos Confiáveis",
  "Atendimento Ágil",
];

const RATING_LABELS: Record<number, { title: string; color: string }> = {
  1: { title: "Péssimo — Precisa melhorar muito", color: "text-red-400" },
  2: { title: "Regular — Pode ser melhor", color: "text-amber-400" },
  3: { title: "Bom — Atendeu o esperado", color: "text-yellow-400" },
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

  // Helper para verificar status no localStorage
  const isFeedbackSubmittedLocally = useCallback(() => {
    if (typeof window === "undefined") return false;
    const globalSubmitted = localStorage.getItem("energivia_feedback_submitted") === "true";
    const userSubmitted = user?.id
      ? localStorage.getItem(`energivia_feedback_submitted_${user.id}`) === "true"
      : false;
    return globalSubmitted || userSubmitted;
  }, [user?.id]);

  // Notifica o sistema/hub sobre abertura e fechamento do modal
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("feedback-prompt-visibility-change", { detail: { isOpen } })
    );
  }, [isOpen]);

  // Consulta status persistido no backend ao inicializar
  useEffect(() => {
    if (!user || isFeedbackSubmittedLocally()) return;

    let isMounted = true;
    fetch("/api/feedbacks/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.hasSubmitted) {
          localStorage.setItem("energivia_feedback_submitted", "true");
          if (user.id) {
            localStorage.setItem(`energivia_feedback_submitted_${user.id}`, "true");
          }
          window.dispatchEvent(
            new CustomEvent("feedback-submitted-changed", { detail: { submitted: true } })
          );
        }
      })
      .catch((err) => {
        console.warn("Falha ao checar status de feedback no backend:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [user, isFeedbackSubmittedLocally]);

  useEffect(() => {
    // Durante onboarding ou se o usuário ainda não tiver organização ativa, não exibir
    if (normalizedPath === "/create-organization" || !currentOrganization?.id) {
      setIsOpen(false);
      return;
    }

    // Ouvinte para abertura sob demanda (ex: disparada via Hub ou atalho)
    const handleOpen = () => {
      if (isFeedbackSubmittedLocally()) return;
      setIsOpen(true);
      setSubmitted(false);
      setErrorMessage(null);
    };
    window.addEventListener("open-feedback-prompt", handleOpen);

    // Se a trava dos 7 dias estiver bloqueando o acesso, não exibir a avaliação simultaneamente
    if (user?.isTrialLocked || (user?.isTrial && user?.trialExpired)) {
      setIsOpen(false);
      return () => {
        window.removeEventListener("open-feedback-prompt", handleOpen);
      };
    }

    // Verifica se já enviou anteriormente ou se já foi exibido automaticamente uma vez
    if (isFeedbackSubmittedLocally()) {
      return () => {
        window.removeEventListener("open-feedback-prompt", handleOpen);
      };
    }

    const hasAutoShownGlobal = localStorage.getItem("energivia_feedback_auto_shown") === "true";
    const hasAutoShownUser = user?.id
      ? localStorage.getItem(`energivia_feedback_auto_shown_${user.id}`) === "true"
      : false;

    if (hasAutoShownGlobal || hasAutoShownUser) {
      return () => {
        window.removeEventListener("open-feedback-prompt", handleOpen);
      };
    }

    // Regra de exibição automática ÚNICA (1 vez na tela do cliente):
    // 1. Integrador com plano contratado/pago (user?.isTrial === false)
    // 2. OU completou os 7 dias de teste (trialDaysLeft === 0 ou trialExpired)
    const hasPaidPlan = Boolean(
      user?.isTrial === false && user?.planTier && user?.planTier !== "TRIAL"
    );
    const reachedSevenDays = Boolean(
      user?.isTrial === true &&
      (user?.trialDaysLeft === 0 || user?.trialExpired || user?.isTrialProposalLimitReached)
    );

    if (hasPaidPlan || reachedSevenDays) {
      const timer = setTimeout(() => {
        if (
          !user?.isTrialLocked &&
          !(user?.isTrial && user?.trialExpired) &&
          !isFeedbackSubmittedLocally()
        ) {
          setIsOpen(true);
          localStorage.setItem("energivia_feedback_auto_shown", "true");
          if (user?.id) {
            localStorage.setItem(`energivia_feedback_auto_shown_${user.id}`, "true");
          }
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
  }, [user, currentOrganization?.id, normalizedPath, isFeedbackSubmittedLocally]);

  const handleDismiss = () => {
    setIsOpen(false);
    // Marca como auto-exibido para nunca reabrir sozinho na tela do cliente
    localStorage.setItem("energivia_feedback_auto_shown", "true");
    if (user?.id) {
      localStorage.setItem(`energivia_feedback_auto_shown_${user.id}`, "true");
    }
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
        // Persistência definitiva imediata
        localStorage.setItem("energivia_feedback_submitted", "true");
        if (user?.id) {
          localStorage.setItem(`energivia_feedback_submitted_${user.id}`, "true");
        }
        window.dispatchEvent(
          new CustomEvent("feedback-submitted-changed", { detail: { submitted: true } })
        );

        setTimeout(() => {
          setIsOpen(false);
        }, 2200);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Falha ao registrar feedback:", errorData);
        setErrorMessage(
          errorData.error || "Não foi possível registrar a avaliação no momento. Tente novamente."
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

  if (normalizedPath === "/create-organization" || !currentOrganization?.id || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none overflow-y-auto">
      {/* Fundo Embaçado (Backdrop Blur) */}
      <div
        onClick={handleDismiss}
        className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
      />

      {/* Modal Centralizado de Tamanho Confortável */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-[#090d16]/95 border border-amber-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-white p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Halos decorativos de iluminação ambiente sutil */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Cabeçalho */}
        <div className="relative flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25">
              <MessageSquareHeart className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {user?.isTrial ? "Período de Testes" : "Sua Experiência"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-tight">
                Como está sendo sua experiência com a EnergivIA?
              </h3>
            </div>
          </div>

          {/* Botão de Fechar */}
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          /* Estado de Sucesso */
          <div className="py-8 text-center space-y-3.5 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Muito obrigado pelo seu feedback! 🌟</h4>
              <p className="text-sm text-neutral-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Sua avaliação foi registrada com sucesso e ajuda nossa equipe a evoluir diariamente
                as ferramentas solares da sua empresa.
              </p>
            </div>
          </div>
        ) : (
          /* Formulário de Feedback */
          <form onSubmit={handleSubmit} className="relative space-y-4">
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Dê sua nota e conte o que achou da velocidade na criação de propostas e do assistente
              solar:
            </p>

            {/* Seletor de Estrelas (1 a 5) Ampliado */}
            <div className="flex flex-col items-center justify-center py-3 bg-[#030712]/70 rounded-2xl border border-neutral-800/90">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= activeRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 sm:p-1.5 transition-transform hover:scale-120 focus:outline-none cursor-pointer"
                      aria-label={`Avaliar com ${star} estrelas`}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors duration-150 ${
                          isFilled
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.55)]"
                            : "fill-transparent text-neutral-700 hover:text-neutral-500"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span
                className={`text-xs font-semibold mt-2 transition-colors ${
                  RATING_LABELS[activeRating]?.color || "text-neutral-400"
                }`}
              >
                {RATING_LABELS[activeRating]?.title || ""}
              </span>
            </div>

            {/* Tags Rápidas de Avaliação */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-300">
                O que mais se destacou para você?
              </span>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAGS.map((tag) => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        selected
                          ? "bg-amber-500/25 border-amber-500/60 text-amber-200 shadow-sm shadow-amber-500/10"
                          : "bg-neutral-900/60 border-neutral-800/80 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo de Comentário Confortável */}
            <div>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Deixe um comentário, elogio ou sugestão de melhoria..."
                className="w-full rounded-2xl bg-[#030712]/90 border border-neutral-800 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 resize-none transition"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs leading-tight">
                {errorMessage}
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-neutral-400 hover:text-white underline-offset-4 hover:underline transition px-2 py-1 cursor-pointer"
              >
                Avaliar mais tarde
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <span>Enviar Avaliação</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
