"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import type { DecisionCTAActions, DecisionCTATheme } from "./types";
import { ProposalDecisionModal } from "./proposal-decision-modal";

export interface CTAButtonsProps {
  proposalUrl: string;
  actions: DecisionCTAActions;
  theme: DecisionCTATheme;
  align: "left" | "center" | "right";
  proposalId?: string;
  clientName?: string;
}

export function CTAButtons(props: CTAButtonsProps): JSX.Element {
  const { _proposalUrl, actions, theme, align, proposalId, clientName } = {
    _proposalUrl: props.proposalUrl,
    ...props,
  };
  const [activeModal, setActiveModal] = useState<"ACCEPT" | "REQUEST_CHANGES" | "REJECT" | null>(
    null
  );

  const justify =
    align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";

  const baseBtn =
    "inline-flex min-h-[44px] w-full min-w-[200px] cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-md transition hover:scale-[1.02] active:scale-[0.98] sm:w-auto sm:min-w-[180px]";

  const items: JSX.Element[] = [];

  if (actions.accept) {
    items.push(
      <button
        key="accept"
        type="button"
        onClick={() => setActiveModal("ACCEPT")}
        className={baseBtn + " text-white"}
        style={{
          backgroundColor: theme.primary,
        }}
      >
        <Check className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        Aceitar proposta
      </button>
    );
  }

  if (actions.edit) {
    items.push(
      <button
        key="edit"
        type="button"
        onClick={() => setActiveModal("REQUEST_CHANGES")}
        className={baseBtn + " border-2 bg-transparent"}
        style={{
          borderColor: theme.primary,
          color: theme.primary,
        }}
      >
        <Pencil className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        Solicitar alteração
      </button>
    );
  }

  if (actions.reject) {
    items.push(
      <button
        key="reject"
        type="button"
        onClick={() => setActiveModal("REJECT")}
        className={baseBtn + " border-2 bg-transparent"}
        style={{
          borderColor: theme.danger,
          color: theme.danger,
        }}
      >
        <X className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        Recusar proposta
      </button>
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
    <>
      <div
        className={"flex flex-col gap-3 sm:flex-row sm:flex-wrap " + justify}
        style={{ gap: 14 }}
      >
        {items}
      </div>

      <ProposalDecisionModal
        open={Boolean(activeModal)}
        onClose={() => setActiveModal(null)}
        decisionType={activeModal}
        proposalId={proposalId}
        clientName={clientName}
      />
    </>
  );
}
