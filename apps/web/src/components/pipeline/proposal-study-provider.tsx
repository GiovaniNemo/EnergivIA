"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
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
  const { currentOrganizationId } = useOrganization();
  const modalRef = useRef<ProposalEconomicsModalHandle>(null);

  const openStudyForDeal = useCallback(
    async (
      deal: Deal,
      opts?: { forceStudyModal?: boolean; existingSimulation?: SimulationListItem }
    ) => {
      await modalRef.current?.openFromDeal(deal, opts);
    },
    []
  );

  const openStudyForDealWithFile = useCallback(async (deal: Deal, file: File) => {
    await modalRef.current?.openWithFile(deal, file);
  }, []);

  const openStudyForDealWithSimulation = useCallback(
    async (deal: Deal, simulation: SimulationListItem) => {
      await modalRef.current?.openWithSimulation(deal, simulation);
    },
    []
  );

  const value = useMemo(
    () => ({ openStudyForDeal, openStudyForDealWithFile, openStudyForDealWithSimulation }),
    [openStudyForDeal, openStudyForDealWithFile, openStudyForDealWithSimulation]
  );

  return (
    <ProposalStudyContext.Provider value={value}>
      {children}
      <ProposalEconomicsModal ref={modalRef} organizationId={currentOrganizationId} />
    </ProposalStudyContext.Provider>
  );
}
