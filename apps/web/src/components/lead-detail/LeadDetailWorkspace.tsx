"use client";

import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { useProposalStudy } from "@/components/pipeline/proposal-study-provider";
import {
  createDeal,
  createLeadFinancialSimulation,
  getLead,
  listSimulationsForLead,
  type LeadDetail,
  type LeadFinancialSimulationInput,
  type SimulationListItem,
} from "@/lib/leads-api";
import { LoadingState } from "@/components/ui/loading-state";
import { ActivityTimeline } from "./ActivityTimeline";
import { DealCard } from "./DealCard";
import { LeadHeader } from "./LeadHeader";
import { LeadSidebar } from "./LeadSidebar";
import { ProposalList } from "./ProposalList";
import { SalesProgress } from "./SalesProgress";
import { SimulationCard } from "./SimulationCard";
import { TransformToOpportunityCard } from "./TransformToOpportunityCard";
import {
  buildAutoDealPayloadFromSimulation,
  buildPipelineDealForApiDeal,
  computeSalesProgress,
  hasUsableSimulation,
  pickActiveDeal,
  pickBestSimulation,
  resolvePrimaryCta,
} from "./lead-detail-utils";

export function LeadDetailWorkspace(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const leadId = typeof params["id"] === "string" ? params["id"] : "";
  const { currentOrganizationId, loading: orgLoading } = useOrganization();
  const { openStudyForDeal } = useProposalStudy();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [sims, setSims] = useState<SimulationListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ctaBusy, setCtaBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const reload = useCallback(async () => {
    if (!currentOrganizationId || !leadId) return;
    setError(null);
    try {
      const [l, list] = await Promise.all([
        getLead(currentOrganizationId, leadId),
        listSimulationsForLead(currentOrganizationId, leadId),
      ]);
      setLead(l);
      setSims(list);
      setHistoryRefresh((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, [currentOrganizationId, leadId]);

  useEffect(() => {
    if (!currentOrganizationId || !leadId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [l, list] = await Promise.all([
          getLead(currentOrganizationId, leadId),
          listSimulationsForLead(currentOrganizationId, leadId),
        ]);
        if (!cancelled) {
          setLead(l);
          setSims(list);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentOrganizationId, leadId]);

  const activeDeal = useMemo(() => (lead ? pickActiveDeal(lead.deals) : null), [lead]);
  const hasDeal = Boolean(activeDeal);

  const primaryCta = useMemo(() => resolvePrimaryCta(activeDeal, sims), [activeDeal, sims]);

  const progress = useMemo(() => computeSalesProgress(activeDeal, sims), [activeDeal, sims]);

  const pipelineDeal = useMemo(
    () => (lead ? buildPipelineDealForApiDeal(lead, activeDeal) : null),
    [lead, activeDeal]
  );

  const createOpportunityFromBestSimulation = useCallback(async () => {
    if (!currentOrganizationId || !leadId) return;
    const best = pickBestSimulation(sims);
    if (!best) return;
    const { title, value } = buildAutoDealPayloadFromSimulation(best);
    setCtaBusy(true);
    try {
      await createDeal(currentOrganizationId, leadId, {
        title,
        value,
        stage: "PROPOSAL",
        temperature: "WARM",
      });
      await reload();
    } finally {
      setCtaBusy(false);
    }
  }, [currentOrganizationId, leadId, reload, sims]);

  const handlePrimaryCta = useCallback(async () => {
    if (!lead || !pipelineDeal) return;
    switch (primaryCta.kind) {
      case "simulate_economy":
        setCtaBusy(true);
        try {
          await openStudyForDeal(pipelineDeal);
          await reload();
        } finally {
          setCtaBusy(false);
        }
        break;
      case "create_opportunity":
        await createOpportunityFromBestSimulation();
        break;
      case "create_proposal":
        setCtaBusy(true);
        try {
          await openStudyForDeal(pipelineDeal);
          await reload();
        } finally {
          setCtaBusy(false);
        }
        break;
      case "send_proposal":
      case "open_proposal":
        if (primaryCta.proposalId) {
          router.push(`/propostas/${primaryCta.proposalId}`);
        }
        break;
      default:
        break;
    }
  }, [
    createOpportunityFromBestSimulation,
    lead,
    openStudyForDeal,
    pipelineDeal,
    primaryCta,
    reload,
    router,
  ]);

  const submitCreateDeal = useCallback(async () => {
    if (!currentOrganizationId || !leadId) return;
    const t = dealTitle.trim();
    if (t.length < 2) {
      setCreateErr("Informe um título para a oportunidade.");
      return;
    }
    setCreateErr(null);
    let value: number | undefined;
    if (dealValue.trim()) {
      const n = Number(dealValue.replace(",", "."));
      if (!Number.isFinite(n)) {
        setCreateErr("Valor inválido.");
        return;
      }
      value = n;
    }
    try {
      await createDeal(currentOrganizationId, leadId, { title: t, value, stage: "NEW" });
      setCreateOpen(false);
      setDealTitle("");
      setDealValue("");
      await reload();
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : "Erro ao criar");
    }
  }, [currentOrganizationId, dealTitle, dealValue, leadId, reload]);

  const duplicateSimulation = useCallback(async () => {
    if (!currentOrganizationId || !leadId) return;
    const best = pickBestSimulation(sims);
    if (!best?.input || typeof best.input !== "object") return;
    setCtaBusy(true);
    try {
      await createLeadFinancialSimulation(currentOrganizationId, leadId, {
        name: `Cópia — ${new Date().toLocaleDateString("pt-BR")}`,
        input: best.input as LeadFinancialSimulationInput,
      });
      await reload();
    } finally {
      setCtaBusy(false);
    }
  }, [currentOrganizationId, leadId, reload, sims]);

  const openSimulationEditor = useCallback(async () => {
    if (!pipelineDeal) return;
    setCtaBusy(true);
    try {
      await openStudyForDeal(pipelineDeal);
      await reload();
    } finally {
      setCtaBusy(false);
    }
  }, [openStudyForDeal, pipelineDeal, reload]);

  if (orgLoading) {
    return <LoadingState label="Carregando organização" compact />;
  }

  if (!currentOrganizationId) {
    return (
      <Typography variant="body2" sx={{ color: "var(--color-muted-foreground)" }}>
        Selecione uma organização para ver este cliente.
      </Typography>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography color="error" variant="body2">
          {error}
        </Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => router.push("/clientes")}>
          Voltar à lista
        </Button>
      </Box>
    );
  }

  if (loading || !lead) {
    return <LoadingState label="Carregando cliente" compact />;
  }

  const activeProposals = activeDeal?.proposals ?? [];
  const showSimBridge = !hasDeal && hasUsableSimulation(sims);

  const explorationColumn = (
    <Stack spacing={3}>
      <SimulationCard
        simulations={sims}
        onViewDetails={() => void openSimulationEditor()}
        onDuplicate={() => void duplicateSimulation()}
        busy={ctaBusy}
      />
      {showSimBridge && currentOrganizationId ? (
        <TransformToOpportunityCard
          onCreateFromSimulation={() => void createOpportunityFromBestSimulation()}
          onManualCreate={() => setCreateOpen(true)}
          busy={ctaBusy}
        />
      ) : null}
      <SalesProgress
        progress={progress}
        onRecommendedAction={() => void handlePrimaryCta()}
        recommendedBusy={ctaBusy}
      />
      {currentOrganizationId ? (
        <ActivityTimeline
          organizationId={currentOrganizationId}
          leadId={leadId}
          leadName={lead.name}
          whatsappDigits={lead.whatsapp}
          refreshSignal={historyRefresh}
        />
      ) : null}
    </Stack>
  );

  const commercialColumn = (
    <Stack spacing={3}>
      {currentOrganizationId ? (
        <DealCard
          organizationId={currentOrganizationId}
          leadDeals={lead.deals}
          deal={activeDeal}
          onUpdated={() => void reload()}
          onManualCreate={() => setCreateOpen(true)}
        />
      ) : null}
      <SalesProgress
        progress={progress}
        onRecommendedAction={() => void handlePrimaryCta()}
        recommendedBusy={ctaBusy}
      />
      <SimulationCard
        simulations={sims}
        onViewDetails={() => void openSimulationEditor()}
        onDuplicate={() => void duplicateSimulation()}
        busy={ctaBusy}
      />
      {currentOrganizationId ? (
        <ProposalList
          organizationId={currentOrganizationId}
          proposals={activeProposals}
          onChanged={() => void reload()}
        />
      ) : null}
      {currentOrganizationId ? (
        <ActivityTimeline
          organizationId={currentOrganizationId}
          leadId={leadId}
          leadName={lead.name}
          whatsappDigits={lead.whatsapp}
          refreshSignal={historyRefresh}
        />
      ) : null}
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <LeadHeader
        lead={lead}
        activeDeal={activeDeal}
        primaryCta={primaryCta}
        onPrimaryCta={() => void handlePrimaryCta()}
        primaryBusy={ctaBusy}
      />

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {hasDeal ? commercialColumn : explorationColumn}
        </Box>

        <Box sx={{ width: "100%", maxWidth: { lg: 320 }, flexShrink: 0 }}>
          <LeadSidebar lead={lead} bills={lead.energyBills} />
        </Box>
      </Stack>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nova oportunidade</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Título"
            placeholder="Ex.: Sistema solar — residência"
            value={dealTitle}
            onChange={(e) => setDealTitle(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Valor estimado (R$, opcional)"
            value={dealValue}
            onChange={(e) => setDealValue(e.target.value)}
            placeholder="45000"
            fullWidth
          />
          {createErr ? (
            <Typography variant="caption" color="error">
              {createErr}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void submitCreateDeal()}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
