"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { MessageSquare, PhoneCall, Calendar } from "lucide-react";
import { appendLeadActivity, patchDeal, type DealWithProposals } from "@/lib/leads-api";

type QuickFollowUpDialogProps = {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  leadId: string;
  leadName: string;
  deal: DealWithProposals | null;
  onSuccess: () => void;
};

export function QuickFollowUpDialog({
  open,
  onClose,
  organizationId,
  leadId,
  leadName,
  deal,
  onSuccess,
}: QuickFollowUpDialogProps): JSX.Element {
  const [note, setNote] = useState("");
  const [nextStepDate, setNextStepDate] = useState("");
  const [nextStepType, setNextStepType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!note.trim()) {
      setError("Descreva o que foi conversado no follow-up.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // 1. Salvar nota na linha do tempo
      await appendLeadActivity(organizationId, leadId, {
        kind: "NOTE",
        text: `[Follow-up realizado] ${note.trim()}`,
      });

      // 2. Atualizar data de último contato e próximo passo no negócio
      if (deal) {
        await patchDeal(organizationId, deal.id, {
          lastContactAt: new Date().toISOString(),
          stage: deal.stage === "PROPOSAL" ? "NEGOTIATION" : deal.stage,
          ...(nextStepDate ? { nextActionAt: new Date(nextStepDate).toISOString() } : {}),
          ...(nextStepType.trim() ? { nextActionType: nextStepType.trim() } : {}),
        });
      }

      onSuccess();
      onClose();
      setNote("");
      setNextStepDate("");
      setNextStepType("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar contato.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Registrar Follow-up / Contato — {leadName}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          <TextField
            label="Resumo do contato"
            required
            multiline
            rows={3}
            fullWidth
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: Liguei para o cliente, ele gostou da proposta de 3 kWp e pediu para retornar na sexta-feira após falar com o sócio."
            autoFocus
            InputProps={{
              startAdornment: (
                <MessageSquare size={18} className="mr-2 mt-1 text-muted-foreground self-start" />
              ),
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label="Agendar próximo passo (opcional)"
              type="datetime-local"
              fullWidth
              value={nextStepDate}
              onChange={(e) => setNextStepDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <Calendar size={18} className="mr-2 text-muted-foreground" />,
              }}
            />

            <TextField
              label="Tipo do próximo passo"
              fullWidth
              value={nextStepType}
              onChange={(e) => setNextStepType(e.target.value)}
              placeholder="Ex.: Ligar para fechar contrato"
              InputProps={{
                startAdornment: <PhoneCall size={18} className="mr-2 text-muted-foreground" />,
              }}
            />
          </div>

          {error ? (
            <Typography variant="caption" color="error" sx={{ mt: -1 }}>
              {error}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving} variant="text">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? "Salvando..." : "Concluir Follow-up"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
