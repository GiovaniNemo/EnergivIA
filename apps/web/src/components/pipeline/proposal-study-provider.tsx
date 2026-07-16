"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import type { Deal } from "@/lib/pipeline-deal";
import {
  ProposalEconomicsModal,
  type ProposalEconomicsModalHandle,
  buildDealFromLeadDetail,
} from "@/components/pipeline/proposal-economics-modal";

export { buildDealFromLeadDetail };

type ProposalStudyContextValue = {
  openStudyForDeal: (deal: Deal, opts?: { forceStudyModal?: boolean }) => Promise<void>;
  openStudyForDealWithFile: (deal: Deal, file: File) => Promise<void>;
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

  const openStudyForDeal = useCallback(async (deal: Deal, opts?: { forceStudyModal?: boolean }) => {
    await modalRef.current?.openFromDeal(deal, opts);
  }, []);

  const openStudyForDealWithFile = useCallback(async (deal: Deal, file: File) => {
    await modalRef.current?.openWithFile(deal, file);
  }, []);

  const value = useMemo(
    () => ({ openStudyForDeal, openStudyForDealWithFile }),
    [openStudyForDeal, openStudyForDealWithFile]
  );

  return (
    <ProposalStudyContext.Provider value={value}>
      {children}
      <ProposalEconomicsModal ref={modalRef} organizationId={currentOrganizationId} />
    </ProposalStudyContext.Provider>
  );
}
