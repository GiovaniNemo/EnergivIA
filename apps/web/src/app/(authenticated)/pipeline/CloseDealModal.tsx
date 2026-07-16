"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { ClosedDealStatus, Deal, DealStage } from "@/lib/pipeline-deal";

type CloseDetailsPayload = {
  id: string;
  status: ClosedDealStatus;
  reason?: string;
  finalValue?: number;
  postponedDate?: string;
  note?: string;
};

type CloseDealModalProps = {
  open: boolean;
  deal: Deal | null;
  fromStage?: DealStage;
  fromStatus?: ClosedDealStatus;
  status: ClosedDealStatus | null;
  onClose: () => void;
  onConfirm: (payload: CloseDetailsPayload) => Promise<void> | void;
};

const LOST_REASONS = [
  "price",
  "competitor",
  "no_response",
  "postponed",
  "not_viable",
  "low_roi",
  "no_interest",
  "other",
] as const;
const DISQUALIFIED_REASONS = [
  "low_consumption",
  "no_money",
  "region",
  "structure",
  "no_intent",
  "research_only",
  "other",
] as const;
const CANCELLED_REASONS = [
  "client_request",
  "duplicate",
  "internal_error",
  "project_cancelled",
  "other",
] as const;

const REASON_LABEL_PT: Record<string, string> = {
  price: "Preço",
  competitor: "Concorrente",
  no_response: "Sem resposta",
  postponed: "Adiado",
  not_viable: "Não viável",
  low_roi: "Retorno baixo",
  no_interest: "Sem interesse",
  other: "Outro",
  low_consumption: "Consumo baixo",
  no_money: "Sem orçamento",
  region: "Região não atendida",
  structure: "Estrutura inadequada",
  no_intent: "Sem intenção de compra",
  research_only: "Apenas pesquisa",
  client_request: "Solicitação do cliente",
  duplicate: "Duplicado",
  internal_error: "Erro interno",
  project_cancelled: "Projeto cancelado",
};

function titleForStatus(status: ClosedDealStatus | null): string {
  switch (status) {
    case "won":
      return "Negociação ganha";
    case "lost":
      return "Negociação perdida";
    case "disqualified":
      return "Negociação desqualificada";
    case "postponed":
      return "Negociação adiada";
    case "cancelled":
      return "Negociação cancelada";
    default:
      return "Fechar negociação";
  }
}

function stageLabel(stage: DealStage | undefined): string {
  switch (stage) {
    case "novo":
      return "Novo";
    case "contato":
      return "Contato";
    case "proposta":
      return "Proposta";
    case "negociacao":
      return "Negociação";
    case "fechado":
      return "Fechado";
    default:
      return "—";
  }
}

function closedStatusLabel(status: ClosedDealStatus | null | undefined): string {
  switch (status) {
    case "won":
      return "Ganho";
    case "lost":
      return "Perdido";
    case "disqualified":
      return "Desqualificado";
    case "postponed":
      return "Adiado";
    case "cancelled":
      return "Cancelado";
    default:
      return "—";
  }
}

export function CloseDealModal({
  open,
  deal,
  fromStage,
  fromStatus,
  status,
  onClose,
  onConfirm,
}: CloseDealModalProps): JSX.Element {
  const [finalValueInput, setFinalValueInput] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [postponedDate, setPostponedDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFinalValueInput(null);
    setReason("");
    setOtherReason("");
    setPostponedDate("");
    setNote("");
    const t = window.setTimeout(() => firstInputRef.current?.focus(), 70);
    return () => window.clearTimeout(t);
  }, [open, status]);

  const reasons = useMemo(() => {
    if (status === "lost") return LOST_REASONS;
    if (status === "disqualified") return DISQUALIFIED_REASONS;
    if (status === "cancelled") return CANCELLED_REASONS;
    return [] as readonly string[];
  }, [status]);

  const requiresReason = status === "lost" || status === "disqualified" || status === "cancelled";
  const requiresOtherReasonText = requiresReason && reason === "other";
  const canConfirm =
    Boolean(deal && status) &&
    (!requiresReason || Boolean(reason)) &&
    (!requiresOtherReasonText || Boolean(otherReason.trim()));

  async function handleConfirm() {
    if (!deal || !status || !canConfirm) return;
    setSaving(true);
    try {
      const parsedFinalValue = finalValueInput ?? undefined;
      await onConfirm({
        id: deal.id,
        status,
        reason: reason === "other" ? otherReason.trim() : reason || undefined,
        finalValue: Number.isFinite(parsedFinalValue ?? NaN) ? parsedFinalValue : undefined,
        postponedDate: postponedDate || undefined,
        note: note.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>{titleForStatus(status)}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
        <Box
          sx={{
            border: "1px solid var(--color-border)",
            borderRadius: 2,
            px: 1.5,
            py: 1.25,
            backgroundColor: "var(--color-muted)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip
              size="small"
              variant="outlined"
              label={`De: ${stageLabel(fromStage)}${fromStage === "fechado" ? `/${closedStatusLabel(fromStatus)}` : ""}`}
              sx={{
                borderColor: "var(--color-border)",
                color: "var(--color-muted-foreground)",
                backgroundColor: "transparent",
              }}
            />
            <span style={{ color: "var(--color-muted-foreground)", fontSize: 12 }}>→</span>
            <Chip
              size="small"
              variant="outlined"
              label={`Para: Fechado/${closedStatusLabel(status)}`}
              sx={{
                borderColor: "var(--color-border)",
                color: "var(--color-foreground)",
                backgroundColor: "var(--color-card)",
              }}
            />
          </Box>
          {deal ? (
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
              Negociação:{" "}
              <strong className="text-[var(--color-foreground)]">{deal.clientName}</strong>
            </p>
          ) : null}
        </Box>

        {status === "won" ? (
          <CurrencyInput
            ref={firstInputRef}
            label="Valor final (opcional)"
            value={finalValueInput}
            onValueChange={setFinalValueInput}
          />
        ) : null}

        {requiresReason ? (
          <FormControl fullWidth>
            <InputLabel id="close-reason-label">Motivo</InputLabel>
            <Select
              labelId="close-reason-label"
              label="Motivo"
              value={reason}
              onChange={(e) => setReason(String(e.target.value))}
              inputRef={firstInputRef}
            >
              {reasons.map((r) => (
                <MenuItem key={r} value={r}>
                  {REASON_LABEL_PT[r] ?? r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}

        {requiresOtherReasonText ? (
          <TextField
            label="Detalhes do motivo"
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            multiline
            minRows={3}
          />
        ) : null}

        {status === "postponed" ? (
          <>
            <TextField
              inputRef={firstInputRef}
              label="Nova data"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={postponedDate}
              onChange={(e) => setPostponedDate(e.target.value)}
            />
            <TextField
              label="Nota (opcional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={3}
            />
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={saving}
          color="inherit"
          sx={{ color: "var(--color-muted-foreground)" }}
        >
          Cancelar
        </Button>
        <Button
          onClick={() => void handleConfirm()}
          disabled={!canConfirm || saving}
          variant="contained"
        >
          {saving ? "Salvando..." : "Confirmar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
