"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/components/providers/organization-provider";
import type { Deal } from "@/lib/pipeline-deal";
import type { SimulationListItem } from "@/lib/leads-api";
import {
  ProposalEconomicsModal,
  type ProposalEconomicsModalHandle,
  buildDealFromLeadDetail,
} from "@/components/pipeline/proposal-economics-modal";

export { buildDealFromLeadDetail };

type ProposalStudyContextValue = {
  openStudyForDeal: (
    deal: Deal,
    opts?: { forceStudyModal?: boolean; existingSimulation?: SimulationListItem }
  ) => Promise<void>;
  openStudyForDealWithFile: (deal: Deal, file: File) => Promise<void>;
  openStudyForDealWithSimulation: (deal: Deal, simulation: SimulationListItem) => Promise<void>;
  isProposalCreationLocked: boolean;
};

const ProposalStudyContext = createContext<ProposalStudyContextValue | null>(null);

export function useProposalStudy(): ProposalStudyContextValue {
  const ctx = useContext(ProposalStudyContext);
  if (!ctx) {
    throw new Error("useProposalStudy must be used within ProposalStudyProvider.");
  }
  return ctx;
}

export function ProposalStudyProvider({ children }: { children: ReactNode }): JSX.Element {
  const { currentOrganizationId, user } = useOrganization();
  const router = useRouter();
  const modalRef = useRef<ProposalEconomicsModalHandle>(null);

  const isTrial = user?.isTrial ?? false;
  const isTrialExpired = Boolean(isTrial && user?.trialExpired);
  const isTrialLimitReached = Boolean(isTrial && user?.isTrialProposalLimitReached);
  const isPlanLimitReached = Boolean(!isTrial && user?.isProposalLimitReached);
  const isProposalCreationLocked = Boolean(
    isTrialExpired || isTrialLimitReached || isPlanLimitReached || user?.isTrialLocked
  );

  const openStudyForDeal = useCallback(
    async (
      deal: Deal,
      opts?: { forceStudyModal?: boolean; existingSimulation?: SimulationListItem }
    ) => {
      if (isProposalCreationLocked && !opts?.existingSimulation) {
        router.push("/gestao/meus-planos");
        return;
      }
      await modalRef.current?.openFromDeal(deal, opts);
    },
    [isProposalCreationLocked, router]
  );

  const openStudyForDealWithFile = useCallback(
    async (deal: Deal, file: File) => {
      if (isProposalCreationLocked) {
        router.push("/gestao/meus-planos");
        return;
      }
      await modalRef.current?.openWithFile(deal, file);
    },
    [isProposalCreationLocked, router]
  );

  const openStudyForDealWithSimulation = useCallback(
    async (deal: Deal, simulation: SimulationListItem) => {
      await modalRef.current?.openWithSimulation(deal, simulation);
    },
    []
  );

  const value = useMemo(
    () => ({
      openStudyForDeal,
      openStudyForDealWithFile,
      openStudyForDealWithSimulation,
      isProposalCreationLocked,
    }),
    [
      openStudyForDeal,
      openStudyForDealWithFile,
      openStudyForDealWithSimulation,
      isProposalCreationLocked,
    ]
  );

  return (
    <ProposalStudyContext.Provider value={value}>
      {children}
      <ProposalEconomicsModal ref={modalRef} organizationId={currentOrganizationId} />
    </ProposalStudyContext.Provider>
  );
}
