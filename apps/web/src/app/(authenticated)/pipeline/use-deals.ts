"use client";

import { useCallback, useState } from "react";
import type { Deal, DealStage } from "@/lib/pipeline-deal";

export type { Deal, DealStage } from "@/lib/pipeline-deal";

type NewDealInput = {
  leadId: string;
  clientName: string;
  contact: string;
  whatsapp: string | null;
  dealName?: string;
  value?: number;
};

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useDeals(initialDeals: Deal[] = []) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);

  const replaceDeals = useCallback((next: Deal[]) => {
    setDeals(next);
  }, []);

  const addDeal = useCallback((input: NewDealInput): string => {
    const id = generateId();
    const now = new Date();
    setDeals((prev) => [
      {
        id,
        leadId: input.leadId,
        dealId: null,
        clientName: input.clientName,
        contact: input.contact,
        whatsapp: input.whatsapp,
        dealName: input.dealName?.trim() || undefined,
        stage: "novo",
        status: undefined,
        order: 0,
        value: input.value ?? 0,
        nextStepDate: null,
        recentAt: now,
        hasProposal: false,
        assigneeUserId: null,
        assigneeName: null,
        originFromSimulation: false,
        proposalFollowUpStatus: "none",
      },
      ...prev,
    ]);
    return id;
  }, []);

  const updateDealStage = useCallback((id: string, stage: DealStage) => {
    setDeals((prev) =>
      prev.map((deal) => (deal.id === id ? { ...deal, stage, recentAt: new Date() } : deal))
    );
  }, []);

  const updateDealProposalStatus = useCallback((id: string, hasProposal: boolean) => {
    setDeals((prev) =>
      prev.map((deal) => (deal.id === id ? { ...deal, hasProposal, recentAt: new Date() } : deal))
    );
  }, []);

  return {
    deals,
    setDeals,
    replaceDeals,
    addDeal,
    updateDealStage,
    updateDealProposalStatus,
  };
}
