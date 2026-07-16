import type { DealStage } from "@/app/(authenticated)/pipeline/use-deals";

export type ProposalStudyPipelineHooks = {
  updateDealStage: (leadId: string, stage: DealStage) => void;
  updateDealProposalStatus: (leadId: string, hasProposal: boolean) => void;
};

let pipelineHooks: ProposalStudyPipelineHooks | null = null;
let onPipelineReload: (() => void) | null = null;
let onDrawerStudyComplete: (() => void) | null = null;
let onProposalBusy: ((state: { leadId: string | null; loading: boolean }) => void) | null = null;

export const proposalStudyBridge = {
  setPipelineHooks(h: ProposalStudyPipelineHooks | null): void {
    pipelineHooks = h;
  },
  setOnPipelineReload(fn: (() => void) | null): void {
    onPipelineReload = fn;
  },
  setOnDrawerStudyComplete(fn: (() => void) | null): void {
    onDrawerStudyComplete = fn;
  },
  setOnProposalBusy(
    fn: ((state: { leadId: string | null; loading: boolean }) => void) | null
  ): void {
    onProposalBusy = fn;
  },
  getPipelineHooks(): ProposalStudyPipelineHooks | null {
    return pipelineHooks;
  },
  notifyStudyComplete(): void {
    onPipelineReload?.();
    onDrawerStudyComplete?.();
  },
  notifyProposalBusy(state: { leadId: string | null; loading: boolean }): void {
    onProposalBusy?.(state);
  },
};
