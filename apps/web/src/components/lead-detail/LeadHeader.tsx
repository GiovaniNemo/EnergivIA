"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import type { DealStage, DealWithProposals, LeadDetail } from "@/lib/leads-api";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Edit2,
  FileText,
  Handshake,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Thermometer,
  Trophy,
  TrendingDown,
  Wallet,
  Check,
  Copy,
} from "lucide-react";
import {
  dealStageAccent,
  formatBrl,
  nextActionDisplay,
  pickSoonestNextDeal,
  stageStatusHeadline,
  temperatureBadgeStyle,
  temperatureLabel,
  type PrimaryCta,
} from "./lead-detail-utils";
import { DynamicCta } from "./DynamicCta";

function stageIconFor(stage: DealStage): LucideIcon {
  switch (stage) {
    case "NEW":
      return Sparkles;
    case "CONTACTED":
      return Phone;
    case "PROPOSAL":
      return FileText;
    case "NEGOTIATION":
      return Handshake;
    case "WON":
      return Trophy;
    case "LOST":
      return TrendingDown;
    default:
      return FileText;
  }
}

type LeadHeaderProps = {
  lead: LeadDetail;
  activeDeal: DealWithProposals | null;
  primaryCta: PrimaryCta;
  onPrimaryCta: () => void;
  primaryBusy?: boolean;
  onEditLead?: () => void;
  onQuickFollowUp?: () => void;
  onSendProposalWhatsApp?: () => void;
  onCopyProposalLink?: () => void;
};

export function LeadHeader({
  lead,
  activeDeal,
  primaryCta,
  onPrimaryCta,
  primaryBusy,
  onEditLead,
  onQuickFollowUp,
  onSendProposalWhatsApp,
  onCopyProposalLink,
}: LeadHeaderProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const soonest = pickSoonestNextDeal(lead.deals);
  const nextLine = nextActionDisplay(activeDeal, soonest);
  const hasProposals = Boolean(activeDeal && activeDeal.proposals.length > 0);

  const handleCopy = () => {
    onCopyProposalLink?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: "1px solid var(--color-border)",
        bgcolor: "var(--color-card)",
        p: { xs: 2, sm: 3 },
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 14px rgba(0, 0, 0, 0.04)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Link
          href="/clientes"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--color-muted-foreground)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
          Voltar para Clientes
        </Link>

        {onEditLead && (
          <Button
            variant="outlined"
            size="small"
            onClick={onEditLead}
            startIcon={<Edit2 size={14} />}
            sx={{ textTransform: "none", borderRadius: 2, fontSize: "0.8rem", py: 0.5, px: 1.5 }}
          >
            Editar dados do cliente
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.5, flexWrap: "wrap" }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            color: "var(--color-foreground)",
            letterSpacing: "-0.02em",
          }}
        >
          {lead.name}
        </Typography>

        {onEditLead && (
          <Tooltip title="Editar nome">
            <button
              type="button"
              onClick={onEditLead}
              className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:text-foreground hover:bg-[var(--color-muted)] transition"
              aria-label="Editar nome do cliente"
            >
              <Edit2 size={18} />
            </button>
          </Tooltip>
        )}
      </Box>

      {lead.company ? (
        <Typography variant="body2" sx={{ mt: 0.5, color: "var(--color-muted-foreground)" }}>
          {lead.company}
        </Typography>
      ) : null}

      {activeDeal ? (
        <>
          <DealSummaryCard deal={activeDeal} />

          <Box
            sx={{
              mt: 2,
              p: 1.75,
              borderRadius: 2,
              bgcolor: "var(--color-background)",
              border: "1px solid var(--color-border)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Typography variant="body2" sx={{ color: "var(--color-muted-foreground)" }}>
              <Box component="span" sx={{ color: "var(--color-foreground)", fontWeight: 600 }}>
                Próxima ação:{" "}
              </Box>
              {nextLine === "—" ? (
                <Box component="span" sx={{ fontStyle: "italic" }}>
                  Nenhuma agendada
                </Box>
              ) : (
                nextLine
              )}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {onQuickFollowUp && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MessageSquare size={14} />}
                  onClick={onQuickFollowUp}
                  sx={{ textTransform: "none", borderRadius: 1.5 }}
                >
                  Registrar Contato / Follow-up
                </Button>
              )}

              {hasProposals && onSendProposalWhatsApp && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<Send size={14} />}
                  onClick={onSendProposalWhatsApp}
                  sx={{ textTransform: "none", borderRadius: 1.5, fontWeight: 600 }}
                >
                  Enviar Proposta no WhatsApp
                </Button>
              )}

              {hasProposals && onCopyProposalLink && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={
                    copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />
                  }
                  onClick={handleCopy}
                  sx={{ textTransform: "none", borderRadius: 1.5 }}
                >
                  {copied ? "Link Copiado!" : "Copiar Link"}
                </Button>
              )}
            </Stack>
          </Box>
        </>
      ) : (
        <Typography
          variant="body2"
          sx={{ mt: 2, color: "var(--color-muted-foreground)", lineHeight: 1.65 }}
        >
          Você ainda não está acompanhando essa venda.{" "}
          <Box component="span" sx={{ color: "var(--color-foreground)", fontWeight: 600 }}>
            Crie uma oportunidade
          </Box>{" "}
          para controlar valor, estágio e follow-up — ou comece simulando economia sem precisar de
          negócio.
        </Typography>
      )}

      <DynamicCta cta={primaryCta} busy={primaryBusy} onClick={onPrimaryCta} />
    </Box>
  );
}

function DealSummaryCard({ deal }: { deal: DealWithProposals }): JSX.Element {
  const accent = dealStageAccent(deal);
  const StageIcon = stageIconFor(deal.stage);
  const tempStyle = temperatureBadgeStyle(deal.temperature);

  return (
    <Box
      sx={{
        mt: 2.5,
        borderRadius: 3,
        overflow: "hidden",
        display: "flex",
        alignItems: "stretch",
        border: "1px solid var(--color-border)",
        bgcolor: "var(--color-card)",
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 5,
          flexShrink: 0,
          bgcolor: accent.bar,
          borderRadius: "3px 0 0 3px",
        }}
      />
      <Stack spacing={2} sx={{ py: 2.25, px: { xs: 2, sm: 2.5 }, flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1.75}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: accent.iconBg,
              color: accent.iconColor,
              flexShrink: 0,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <StageIcon size={24} strokeWidth={2} aria-hidden />
          </Box>
          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
                color: "var(--color-muted-foreground)",
                fontSize: "0.65rem",
              }}
            >
              Estágio do negócio
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: "var(--color-foreground)",
                lineHeight: 1.35,
              }}
            >
              {stageStatusHeadline(deal)}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: "var(--color-border)", opacity: 0.9 }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2.25, sm: 0 }}
          sx={{ alignItems: { sm: "flex-start" } }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
                color: "var(--color-muted-foreground)",
                fontSize: "0.65rem",
              }}
            >
              Valor estimado
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 0.75 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "var(--color-primary-50)",
                  color: "var(--color-success-dark)",
                  flexShrink: 0,
                }}
              >
                <Wallet size={20} strokeWidth={2} aria-hidden />
              </Box>
              <Typography
                variant="h5"
                component="p"
                sx={{
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  letterSpacing: "-0.03em",
                  m: 0,
                  lineHeight: 1.2,
                }}
              >
                {formatBrl(deal.value)}
              </Typography>
            </Stack>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              display: { xs: "none", sm: "block" },
              borderColor: "var(--color-border)",
              alignSelf: "stretch",
              mx: 1,
            }}
          />

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              pt: { xs: 0.5, sm: 0 },
              borderTop: { xs: "1px solid var(--color-border)", sm: "none" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
                color: "var(--color-muted-foreground)",
                fontSize: "0.65rem",
              }}
            >
              Temperatura
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{ mt: 0.75 }}
              flexWrap="wrap"
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "var(--color-secondary-100)",
                  color: "var(--color-secondary-600)",
                  flexShrink: 0,
                }}
              >
                <Thermometer size={20} strokeWidth={2} aria-hidden />
              </Box>
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 10,
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  bgcolor: tempStyle.bg,
                  color: tempStyle.color,
                  border: tempStyle.border,
                }}
              >
                {temperatureLabel(deal.temperature)}
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
