"use client";

import { Check, Pencil, X } from "lucide-react";
import type { DecisionCTAActions, DecisionCTATheme } from "./types";
import { appendActionToProposalUrl } from "./cta-action-url";

export interface CTAButtonsProps {
  proposalUrl: string;
  actions: DecisionCTAActions;
  theme: DecisionCTATheme;
  align: "left" | "center" | "right";
}

export function CTAButtons(props: CTAButtonsProps): JSX.Element {
  const { proposalUrl, actions, theme, align } = props;
  const justify =
    align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
  const hasUrl = Boolean(proposalUrl.trim());

  const baseBtn =
    "inline-flex min-h-[44px] w-full min-w-[200px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-md transition sm:w-auto sm:min-w-[180px]";

  const items: JSX.Element[] = [];

  if (actions.accept) {
    const href = hasUrl ? appendActionToProposalUrl(proposalUrl, "accept") : "#";
    items.push(
      <a
        key="accept"
        href={href}
        className={baseBtn + " text-white"}
        style={{
          backgroundColor: theme.primary,
          pointerEvents: hasUrl ? undefined : "none",
        }}
      >
        <Check className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        Aceitar proposta
      </a>
    );
  }

  if (actions.edit) {
    const href = hasUrl ? appendActionToProposalUrl(proposalUrl, "edit") : "#";
    items.push(
      <a
        key="edit"
        href={href}
        className={baseBtn + " border-2 bg-transparent"}
        style={{
          borderColor: theme.primary,
          color: theme.primary,
          pointerEvents: hasUrl ? undefined : "none",
        }}
      >
        <Pencil className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        Solicitar alteração
      </a>
    );
  }

  if (actions.reject) {
    const href = hasUrl ? appendActionToProposalUrl(proposalUrl, "reject") : "#";
    items.push(
      <a
        key="reject"
        href={href}
        className={baseBtn + " border-2 bg-transparent"}
        style={{
          borderColor: theme.danger,
          color: theme.danger,
          pointerEvents: hasUrl ? undefined : "none",
        }}
      >
        <X className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        Recusar proposta
      </a>
    );
  }

  if (!items.length) {
    return (
      <p className="text-sm opacity-70" style={{ color: theme.text }}>
        Nenhuma ação ativada. Ative pelo menos uma opção nos campos da seção.
      </p>
    );
  }

  return (
    <div className={"flex flex-col gap-3 sm:flex-row sm:flex-wrap " + justify} style={{ gap: 14 }}>
      {items}
    </div>
  );
}
