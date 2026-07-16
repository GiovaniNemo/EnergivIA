"use client";

import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Calculator,
  Eye,
  FileText,
  MessageSquare,
  Phone,
  Send,
  UserPlus,
} from "lucide-react";
import {
  appendLeadActivity,
  listLeadActivity,
  type LeadActivityRow,
  waMeUrl,
} from "@/lib/leads-api";
import { useCallback, useEffect, useMemo, useState } from "react";

type ActivityTimelineProps = {
  organizationId: string;
  leadId: string;
  leadName: string;
  whatsappDigits: string;
  refreshSignal?: number;
};

function activityPresentation(kind: string): {
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  railColor: string;
} {
  switch (kind) {
    case "LEAD_CREATED":
      return {
        Icon: UserPlus,
        iconBg: "var(--color-accent)",
        iconColor: "var(--color-primary-700)",
        railColor: "var(--color-primary-300)",
      };
    case "SIMULATION_ADDED":
      return {
        Icon: Calculator,
        iconBg: "var(--color-primary-50)",
        iconColor: "var(--color-primary-700)",
        railColor: "var(--color-primary-300)",
      };
    case "DEAL_CREATED":
      return {
        Icon: Briefcase,
        iconBg: "var(--color-secondary-100)",
        iconColor: "var(--color-secondary-700)",
        railColor: "var(--color-secondary-300)",
      };
    case "PROPOSAL_CREATED":
      return {
        Icon: FileText,
        iconBg: "var(--color-primary-50)",
        iconColor: "var(--color-success-dark)",
        railColor: "var(--color-primary-400)",
      };
    case "PROPOSAL_SENT":
      return {
        Icon: Send,
        iconBg: "var(--color-primary-100)",
        iconColor: "var(--color-primary-800)",
        railColor: "var(--color-primary-500)",
      };
    case "PROPOSAL_VIEWED":
      return {
        Icon: Eye,
        iconBg: "var(--color-muted)",
        iconColor: "var(--color-ring)",
        railColor: "var(--color-primary-300)",
      };
    case "NOTE_ADDED":
      return {
        Icon: MessageSquare,
        iconBg: "var(--color-secondary-100)",
        iconColor: "var(--color-secondary-700)",
        railColor: "var(--color-secondary-300)",
      };
    case "CALL_LOGGED":
      return {
        Icon: Phone,
        iconBg: "var(--color-primary-50)",
        iconColor: "var(--color-primary-600)",
        railColor: "var(--color-primary-300)",
      };
    default:
      return {
        Icon: FileText,
        iconBg: "var(--color-muted)",
        iconColor: "var(--color-muted-foreground)",
        railColor: "var(--color-border)",
      };
  }
}

function formatOccurredAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ActivityTimeline({
  organizationId,
  leadId,
  leadName,
  whatsappDigits,
  refreshSignal = 0,
}: ActivityTimelineProps): JSX.Element {
  const [rows, setRows] = useState<LeadActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"note" | "call" | null>(null);
  const [draft, setDraft] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  const waHref = useMemo(
    () =>
      waMeUrl(
        whatsappDigits,
        `Olá ${leadName}, tudo bem? Estou entrando em contato sobre sua oportunidade com a gente.`
      ),
    [leadName, whatsappDigits]
  );

  const reload = useCallback(async () => {
    if (!organizationId || !leadId) return;
    setLoadError(null);
    try {
      const data = await listLeadActivity(organizationId, leadId);
      setRows(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar histórico");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, leadId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload, refreshSignal]);

  const saveEntry = useCallback(async () => {
    const text = draft.trim();
    if (!text || !organizationId || !leadId) return;
    setSaveBusy(true);
    try {
      await appendLeadActivity(organizationId, leadId, {
        kind: dialog === "call" ? "CALL" : "NOTE",
        text,
      });
      setDraft("");
      setDialog(null);
      await reload();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaveBusy(false);
    }
  }, [dialog, draft, leadId, organizationId, reload]);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "1px solid var(--color-border)",
        bgcolor: "var(--color-card)",
        p: { xs: 2, sm: 2.5 },
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <Typography
        variant="overline"
        sx={{
          letterSpacing: "0.12em",
          color: "var(--color-muted-foreground)",
          fontWeight: 700,
          fontSize: "0.65rem",
        }}
      >
        Histórico
      </Typography>
      {loading ? (
        <Typography variant="body2" sx={{ mt: 2, color: "var(--color-muted-foreground)" }}>
          Carregando…
        </Typography>
      ) : loadError ? (
        <Typography variant="body2" sx={{ mt: 2, color: "error.main" }}>
          {loadError}
        </Typography>
      ) : rows.length === 0 ? (
        <Typography
          variant="body2"
          sx={{ mt: 2, color: "var(--color-muted-foreground)", lineHeight: 1.6 }}
        >
          Ainda não há eventos registados. Crie o cliente, simulações e propostas para preencher o
          histórico automaticamente, ou anote ligações e notas abaixo.
        </Typography>
      ) : (
        <Stack spacing={0} sx={{ mt: 2 }}>
          {rows.map((e, index) => {
            const v = activityPresentation(e.kind);
            const Icon = v.Icon;
            const isLast = index === rows.length - 1;
            return (
              <Box
                key={e.id}
                sx={{
                  display: "flex",
                  gap: 1.75,
                  alignItems: "stretch",
                }}
              >
                {}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 40,
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: v.iconBg,
                      color: v.iconColor,
                      border: `1px solid ${v.railColor}`,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden />
                  </Box>
                  {!isLast ? (
                    <Box
                      aria-hidden
                      sx={{
                        width: 2,
                        flex: 1,
                        minHeight: 12,
                        mt: 0,
                        borderRadius: 1,
                        bgcolor: "var(--color-border)",
                        alignSelf: "center",
                      }}
                    />
                  ) : null}
                </Box>
                <Stack
                  spacing={0.5}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    pt: 0.25,
                    pb: isLast ? 0 : 2.25,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "var(--color-muted-foreground)",
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      display: "block",
                    }}
                  >
                    {formatOccurredAt(e.occurredAt)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "var(--color-foreground)",
                      lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    {e.label}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      <Stack
        direction="row"
        flexWrap="wrap"
        gap={1}
        sx={{ mt: 2.5, pt: 2, borderTop: "1px solid var(--color-border)" }}
      >
        <Button
          component="a"
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          color="primary"
          size="small"
        >
          Enviar WhatsApp
        </Button>
        <Button
          startIcon={<AddCommentOutlinedIcon />}
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => {
            setDraft("");
            setDialog("note");
          }}
          disabled={!organizationId}
        >
          Adicionar nota
        </Button>
        <Button
          startIcon={<CallOutlinedIcon />}
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => {
            setDraft("");
            setDialog("call");
          }}
          disabled={!organizationId}
        >
          Registrar ligação
        </Button>
      </Stack>

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog === "call" ? "Registrar ligação" : "Nova nota"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={dialog === "call" ? "Resumo da ligação" : "O que aconteceu?"}
            fullWidth
            multiline
            minRows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setDialog(null)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void saveEntry()}
            disabled={!draft.trim() || saveBusy}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
