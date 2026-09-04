"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import { Edit2, Phone, Mail, FileText, Building2, ExternalLink, FileCheck } from "lucide-react";
import type { EnergyBillRecord, LeadDetail } from "@/lib/leads-api";
import { formatCpfCnpjDigits, maskWhatsappBr } from "@energivia/utils";

function truncateFileName(name: string, max = 32): string {
  const t = name.trim();
  if (t.length <= max) return t;
  const head = Math.max(12, Math.ceil(max / 2) - 2);
  const tail = Math.max(8, Math.floor(max / 2) - 3);
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

type LeadSidebarProps = {
  lead: LeadDetail;
  bills: EnergyBillRecord[] | undefined;
  onEditLead?: () => void;
};

export function LeadSidebar({ lead, bills, onEditLead }: LeadSidebarProps): JSX.Element {
  const latest = bills?.[0];
  const cleanPhone = lead.whatsapp.replace(/\D/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}`
    : undefined;

  return (
    <Box
      sx={{
        position: { lg: "sticky" },
        top: { lg: 16 },
        borderRadius: 2.5,
        border: "1px solid var(--color-border)",
        bgcolor: "var(--color-card)",
        p: 2.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: "var(--color-foreground)" }}>
          Dados do cliente
        </Typography>
        {onEditLead && (
          <Tooltip title="Editar dados cadastrais">
            <Button
              variant="outlined"
              size="small"
              onClick={onEditLead}
              startIcon={<Edit2 size={14} />}
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                borderRadius: 1.5,
                py: 0.3,
                px: 1.2,
              }}
            >
              Editar
            </Button>
          </Tooltip>
        )}
      </Box>

      <Stack spacing={1.75}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Phone size={16} className="mt-0.5 text-emerald-500 shrink-0" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: "var(--color-muted-foreground)", display: "block" }}
            >
              WhatsApp / Telefone
            </Typography>
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                {maskWhatsappBr(lead.whatsapp)}
                <ExternalLink size={12} />
              </a>
            ) : (
              <Typography variant="body2" fontWeight={600}>
                {maskWhatsappBr(lead.whatsapp)}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Mail size={16} className="mt-0.5 text-blue-500 shrink-0" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: "var(--color-muted-foreground)", display: "block" }}
            >
              E-mail
            </Typography>
            {lead.email?.trim() ? (
              <a
                href={`mailto:${lead.email.trim()}`}
                className="text-sm text-foreground hover:underline break-all"
              >
                {lead.email.trim()}
              </a>
            ) : (
              <button
                type="button"
                onClick={onEditLead}
                className="text-xs italic text-[var(--color-muted-foreground)] hover:text-primary transition"
              >
                + Informar e-mail
              </button>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <FileText size={16} className="mt-0.5 text-purple-500 shrink-0" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: "var(--color-muted-foreground)", display: "block" }}
            >
              CPF / CNPJ
            </Typography>
            {lead.cpfCnpj ? (
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{ color: "var(--color-foreground)" }}
              >
                {formatCpfCnpjDigits(lead.cpfCnpj)}
              </Typography>
            ) : (
              <button
                type="button"
                onClick={onEditLead}
                className="text-xs italic text-[var(--color-muted-foreground)] hover:text-primary transition"
              >
                + Informar CPF/CNPJ
              </button>
            )}
          </Box>
        </Box>

        {lead.company && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Building2 size={16} className="mt-0.5 text-amber-500 shrink-0" />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                sx={{ color: "var(--color-muted-foreground)", display: "block" }}
              >
                Empresa
              </Typography>
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{ color: "var(--color-foreground)" }}
              >
                {lead.company}
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>

      <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid var(--color-border)" }}>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{ mb: 1.5, color: "var(--color-foreground)" }}
        >
          Fatura de Energia
        </Typography>
        {latest ? (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: "var(--color-background)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <FileCheck size={16} className="text-emerald-500 shrink-0" />
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={latest.fileName}
              >
                {truncateFileName(latest.fileName)}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{ color: "var(--color-muted-foreground)", display: "block", mb: 1.5 }}
            >
              Status:{" "}
              {latest.extractionStatus === "COMPLETED"
                ? "Leitura concluída com sucesso"
                : latest.extractionStatus === "FAILED"
                  ? "Falha no processamento"
                  : "Processando análise..."}
            </Typography>
            <Button
              href={latest.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<ExternalLink size={14} />}
              sx={{ textTransform: "none", fontSize: "0.8rem", borderRadius: 1.5 }}
            >
              Visualizar documento
            </Button>
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{ color: "var(--color-muted-foreground)", fontSize: "0.85rem" }}
          >
            Nenhuma fatura anexada neste cliente.
          </Typography>
        )}
      </Box>

      {lead.source && (
        <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid var(--color-border)" }}>
          <Typography
            variant="caption"
            sx={{ color: "var(--color-muted-foreground)", display: "block" }}
          >
            Canal de Origem
          </Typography>
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{ color: "var(--color-foreground)", mt: 0.25 }}
          >
            {lead.source}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
