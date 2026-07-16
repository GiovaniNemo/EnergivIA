"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { EnergyBillRecord, LeadDetail } from "@/lib/leads-api";
import { formatCpfCnpjDigits, maskWhatsappBr } from "@energivia/utils";

function truncateFileName(name: string, max = 40): string {
  const t = name.trim();
  if (t.length <= max) return t;
  const head = Math.max(12, Math.ceil(max / 2) - 2);
  const tail = Math.max(8, Math.floor(max / 2) - 3);
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

type LeadSidebarProps = {
  lead: LeadDetail;
  bills: EnergyBillRecord[] | undefined;
};

export function LeadSidebar({ lead, bills }: LeadSidebarProps): JSX.Element {
  const latest = bills?.[0];

  return (
    <Box
      sx={{
        position: { lg: "sticky" },
        top: { lg: 16 },
        borderRadius: 2,
        border: "1px solid var(--color-border)",
        bgcolor: "var(--color-card)",
        p: 2,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
        Dados do cliente
      </Typography>
      <Stack spacing={1}>
        <Typography variant="body2">
          <Box component="span" sx={{ color: "var(--color-muted-foreground)" }}>
            WhatsApp:{" "}
          </Box>
          {maskWhatsappBr(lead.whatsapp)}
        </Typography>
        <Typography variant="body2">
          <Box component="span" sx={{ color: "var(--color-muted-foreground)" }}>
            E-mail:{" "}
          </Box>
          {lead.email?.trim() ? (
            lead.email.trim()
          ) : (
            <Box
              component="span"
              sx={{ fontStyle: "italic", color: "var(--color-muted-foreground)" }}
            >
              Não informado
            </Box>
          )}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
          <Box component="span" sx={{ color: "var(--color-muted-foreground)" }}>
            CPF/CNPJ:{" "}
          </Box>
          {lead.cpfCnpj ? (
            formatCpfCnpjDigits(lead.cpfCnpj)
          ) : (
            <Box
              component="span"
              sx={{ fontStyle: "italic", color: "var(--color-muted-foreground)" }}
            >
              Não informado
            </Box>
          )}
        </Typography>
      </Stack>

      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Conta de luz
      </Typography>
      {latest ? (
        <Stack spacing={1}>
          <Typography
            variant="body2"
            sx={{ color: "var(--color-muted-foreground)", wordBreak: "break-all" }}
          >
            <Box component="span" title={latest.fileName}>
              {truncateFileName(latest.fileName)}
            </Box>
            {" · "}
            {latest.extractionStatus === "COMPLETED"
              ? "Analisada"
              : latest.extractionStatus === "FAILED"
                ? "Falha na leitura"
                : "Processando"}
          </Typography>
          <Button
            href={latest.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="small"
          >
            Ver arquivo
          </Button>
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: "var(--color-muted-foreground)" }}>
          Nenhuma fatura anexada ainda.
        </Typography>
      )}

      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
        Dados adicionais
      </Typography>
      <Typography variant="body2">
        <Box component="span" sx={{ color: "var(--color-muted-foreground)" }}>
          Origem:{" "}
        </Box>
        {lead.source ?? "—"}
      </Typography>
    </Box>
  );
}
