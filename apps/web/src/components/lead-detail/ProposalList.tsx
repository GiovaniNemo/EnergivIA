"use client";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SendIcon from "@mui/icons-material/Send";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import type { ProposalSummary } from "@/lib/leads-api";
import { sendProposalWithPdf } from "@/lib/leads-api";
import { proposalStatusLabel } from "@/lib/proposal-card-meta";
import { useCallback, useState } from "react";

type ProposalListProps = {
  organizationId: string;
  proposals: ProposalSummary[];
  onChanged: () => void;
};

export function ProposalList({
  organizationId,
  proposals,
  onChanged,
}: ProposalListProps): JSX.Element {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const resend = useCallback(
    async (p: ProposalSummary) => {
      if (!p.pdfUrl?.trim()) {
        setMsg("Gere o PDF no editor da proposta antes de reenviar.");
        return;
      }
      setBusyId(p.id);
      setMsg(null);
      try {
        await sendProposalWithPdf(organizationId, p.id, p.pdfUrl);
        setMsg("Proposta marcada como enviada.");
        onChanged();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Falha ao reenviar.");
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, onChanged]
  );

  if (!proposals.length) {
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: "1px dashed var(--color-border)",
          bgcolor: "var(--color-card)",
          p: 3,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Propostas
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: "var(--color-muted-foreground)" }}>
          Crie sua primeira proposta a partir da simulação para enviar ao cliente.
        </Typography>
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
      }}
    >
      <Typography
        variant="overline"
        sx={{ letterSpacing: 1, color: "var(--color-muted-foreground)" }}
      >
        Propostas (negócio ativo)
      </Typography>
      {msg ? (
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 1, color: "var(--color-muted-foreground)" }}
        >
          {msg}
        </Typography>
      ) : null}
      <Stack spacing={2} sx={{ mt: 1 }}>
        {proposals.map((p) => (
          <Box
            key={p.id}
            sx={{
              borderRadius: 1,
              border: "1px solid var(--color-border)",
              p: 1.5,
              bgcolor: "var(--color-background)",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              {p.title}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Status: {proposalStatusLabel(p.status)}
              {typeof p.clientViewCount === "number"
                ? ` · Visualizações: ${p.clientViewCount}`
                : ""}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
              <Button
                component={Link}
                href={`/propostas/${p.id}`}
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon />}
              >
                Abrir no editor
              </Button>
              {p.pdfUrl ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PictureAsPdfIcon />}
                  href={p.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  component="a"
                >
                  Ver PDF
                </Button>
              ) : null}
              <Button
                size="small"
                variant="text"
                startIcon={<SendIcon />}
                disabled={busyId === p.id}
                onClick={() => void resend(p)}
              >
                Reenviar
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
