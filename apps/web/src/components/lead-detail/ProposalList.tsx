"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { Send, Copy, ExternalLink, FileText, Check } from "lucide-react";
import type { ProposalSummary } from "@/lib/leads-api";
import { proposalStatusLabel } from "@/lib/proposal-card-meta";

type ProposalListProps = {
  organizationId: string;
  proposals: ProposalSummary[];
  onChanged: () => void;
  onSendWhatsApp?: (proposal: ProposalSummary) => void;
};

export function ProposalList({ proposals, onSendWhatsApp }: ProposalListProps): JSX.Element {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyProposalUrl = (id: string) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://app.energivia.com.br";
    const url = `${origin}/proposta/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!proposals.length) {
    return (
      <Box
        sx={{
          borderRadius: 2.5,
          border: "1px dashed var(--color-border)",
          bgcolor: "var(--color-card)",
          p: 3,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "var(--color-foreground)" }}>
          Propostas Comerciais
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: "var(--color-muted-foreground)" }}>
          Crie sua proposta a partir do estudo energético acima para apresentar valores e kits ao
          cliente.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 2.5,
        border: "1px solid var(--color-border)",
        bgcolor: "var(--color-card)",
        p: 2.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: 1, color: "var(--color-muted-foreground)", fontWeight: 700 }}
        >
          Propostas Comerciais ({proposals.length})
        </Typography>
      </Box>

      <Stack spacing={2}>
        {proposals.map((p) => {
          const origin =
            typeof window !== "undefined" ? window.location.origin : "https://app.energivia.com.br";
          const publicUrl = `${origin}/proposta/${p.id}`;

          return (
            <Box
              key={p.id}
              sx={{
                borderRadius: 2,
                border: "1px solid var(--color-border)",
                p: 2,
                bgcolor: "var(--color-background)",
                transition: "border-color 0.2s ease",
                "&:hover": {
                  borderColor: "var(--color-primary-400)",
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ color: "var(--color-foreground)" }}
                >
                  {p.title || "Proposta Fotovoltaica"}
                </Typography>
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.25,
                    borderRadius: 10,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    bgcolor: "var(--color-accent)",
                    color: "var(--color-foreground)",
                  }}
                >
                  {proposalStatusLabel(p.status)}
                  {typeof p.clientViewCount === "number" && p.clientViewCount > 0
                    ? ` · ${p.clientViewCount} visualização${p.clientViewCount > 1 ? "ões" : ""}`
                    : ""}
                </Box>
              </Box>

              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }} alignItems="center">
                {onSendWhatsApp && (
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<Send size={14} />}
                    onClick={() => onSendWhatsApp(p)}
                    sx={{ textTransform: "none", borderRadius: 1.5, fontWeight: 600 }}
                  >
                    Enviar no WhatsApp
                  </Button>
                )}

                <Tooltip title={copiedId === p.id ? "Link copiado!" : "Copiar link público"}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      copiedId === p.id ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )
                    }
                    onClick={() => copyProposalUrl(p.id)}
                    sx={{ textTransform: "none", borderRadius: 1.5 }}
                  >
                    {copiedId === p.id ? "Copiado!" : "Copiar Link"}
                  </Button>
                </Tooltip>

                <Button
                  component="a"
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="outlined"
                  startIcon={<ExternalLink size={14} />}
                  sx={{ textTransform: "none", borderRadius: 1.5 }}
                >
                  Visualizar Proposta
                </Button>

                <Button
                  component={Link}
                  href={`/propostas/${p.id}`}
                  size="small"
                  variant="text"
                  sx={{
                    textTransform: "none",
                    borderRadius: 1.5,
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  Editar Proposta
                </Button>

                {p.pdfUrl && (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<FileText size={14} />}
                    href={p.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    component="a"
                    sx={{ textTransform: "none", borderRadius: 1.5 }}
                  >
                    Baixar PDF
                  </Button>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
