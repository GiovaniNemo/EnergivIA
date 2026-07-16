"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import type { DealStage, DealWithProposals } from "@/lib/leads-api";
import { patchDeal } from "@/lib/leads-api";
import { DEAL_STAGES, STAGE_LABEL } from "./lead-detail-utils";

type DealCardProps = {
  organizationId: string;
  leadDeals: DealWithProposals[];
  deal: DealWithProposals | null;
  onUpdated: () => void;
  onManualCreate?: () => void;
};

export function DealCard({
  organizationId,
  leadDeals: _leadDeals,
  deal,
  onUpdated,
  onManualCreate,
}: DealCardProps): JSX.Element {
  const [editOpen, setEditOpen] = useState(false);
  const [stageAnchor, setStageAnchor] = useState<null | HTMLElement>(null);
  const [nextOpen, setNextOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [valueStr, setValueStr] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [nextType, setNextType] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const openEdit = useCallback(() => {
    if (!deal) return;
    setTitle(deal.title);
    setValueStr(deal.value != null && deal.value !== "" ? String(deal.value) : "");
    setErr(null);
    setEditOpen(true);
  }, [deal]);

  const openNext = useCallback(() => {
    if (!deal) return;
    setNextType(deal.nextActionType ?? "");
    if (deal.nextActionAt) {
      const d = new Date(deal.nextActionAt);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      setNextAt(local.toISOString().slice(0, 16));
    } else {
      setNextAt("");
    }
    setErr(null);
    setNextOpen(true);
  }, [deal]);

  const saveEdit = useCallback(async () => {
    if (!deal) return;
    setBusy(true);
    setErr(null);
    try {
      let value: number | null | undefined = undefined;
      if (valueStr.trim() === "") {
        value = null;
      } else {
        const n = Number(valueStr.replace(",", "."));
        if (!Number.isFinite(n)) {
          setErr("Valor inválido.");
          setBusy(false);
          return;
        }
        value = n;
      }
      await patchDeal(organizationId, deal.id, { title: title.trim() || deal.title, value });
      setEditOpen(false);
      onUpdated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }, [deal, organizationId, onUpdated, title, valueStr]);

  const saveNext = useCallback(async () => {
    if (!deal) return;
    setBusy(true);
    setErr(null);
    try {
      await patchDeal(organizationId, deal.id, {
        nextActionAt: nextAt ? new Date(nextAt).toISOString() : null,
        nextActionType: nextType.trim() || null,
      });
      setNextOpen(false);
      onUpdated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }, [deal, nextAt, nextType, organizationId, onUpdated]);

  const applyStage = useCallback(
    async (stage: DealStage) => {
      if (!deal) return;
      setStageAnchor(null);
      setBusy(true);
      try {
        await patchDeal(organizationId, deal.id, { stage });
        onUpdated();
      } finally {
        setBusy(false);
      }
    },
    [deal, organizationId, onUpdated]
  );

  if (!deal) {
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: "1px dashed var(--color-border)",
          bgcolor: "var(--color-accent)",
          p: 3,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "var(--color-foreground)" }}>
          Ainda não há oportunidade comercial
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: "var(--color-muted-foreground)" }}>
          Registre um negócio para acompanhar valor, pipeline, temperatura e follow-up. Se já tiver
          simulação, o sistema pode preencher título e valor automaticamente pelo botão principal ou
          pela simulação.
        </Typography>
        {onManualCreate ? (
          <Button variant="outlined" sx={{ mt: 2, fontWeight: 600 }} onClick={onManualCreate}>
            Criar oportunidade (manual)
          </Button>
        ) : null}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "1px solid var(--color-border)",
        bgcolor: "var(--color-card)",
        p: 2.5,
        height: "100%",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: 1, color: "var(--color-muted-foreground)" }}
        >
          Oportunidade
        </Typography>
        <CheckCircleOutlineIcon
          sx={{ fontSize: 18, color: "var(--color-success)", opacity: 0.9 }}
        />
      </Stack>

      <Typography
        variant="h6"
        sx={{ fontWeight: 700, color: "var(--color-foreground)", lineHeight: 1.35 }}
      >
        {deal.title}
      </Typography>

      <Typography
        variant="body2"
        sx={{ mt: 1.5, color: "var(--color-muted-foreground)", lineHeight: 1.55 }}
      >
        Estágio, valor e temperatura estão no resumo acima. Aqui você ajusta título, pipeline e
        follow-up.
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2.5 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditOutlinedIcon />}
          onClick={openEdit}
          disabled={busy}
          sx={{
            borderColor: "var(--color-border)",
            color: "var(--color-foreground)",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Editar negócio
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SwapHorizOutlinedIcon />}
          onClick={(e) => setStageAnchor(e.currentTarget)}
          disabled={busy}
          sx={{
            borderColor: "var(--color-border)",
            color: "var(--color-foreground)",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Mover estágio
        </Button>
        <Button
          size="small"
          variant="text"
          onClick={openNext}
          disabled={busy}
          sx={{ color: "var(--color-ring)", textTransform: "none", fontWeight: 600 }}
        >
          Agendar follow-up
        </Button>
      </Stack>

      <Menu anchorEl={stageAnchor} open={Boolean(stageAnchor)} onClose={() => setStageAnchor(null)}>
        {DEAL_STAGES.map((s) => (
          <MenuItem key={s} selected={deal.stage === s} onClick={() => void applyStage(s)}>
            {STAGE_LABEL[s]}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Editar negócio</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label="Valor estimado (R$)"
            value={valueStr}
            onChange={(e) => setValueStr(e.target.value)}
            placeholder="45000"
            fullWidth
          />
          {err ? (
            <Typography variant="caption" color="error">
              {err}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveEdit()} disabled={busy}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={nextOpen} onClose={() => setNextOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Próxima ação comercial</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Tipo (ex.: Ligar, WhatsApp)"
            value={nextType}
            onChange={(e) => setNextType(e.target.value)}
            fullWidth
          />
          <TextField
            label="Data e hora"
            type="datetime-local"
            value={nextAt}
            onChange={(e) => setNextAt(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          {err ? (
            <Typography variant="caption" color="error">
              {err}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNextOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveNext()} disabled={busy}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
