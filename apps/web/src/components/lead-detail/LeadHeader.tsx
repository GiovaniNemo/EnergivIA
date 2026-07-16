"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import type { DealStage, DealWithProposals, LeadDetail } from "@/lib/leads-api";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  FileText,
  Handshake,
  Phone,
  Sparkles,
  Thermometer,
  Trophy,
  TrendingDown,
  Wallet,
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
};

export function LeadHeader({
  lead,
  activeDeal,
  primaryCta,
  onPrimaryCta,
  primaryBusy,
}: LeadHeaderProps): JSX.Element {
  const soonest = pickSoonestNextDeal(lead.deals);
  const nextLine = nextActionDisplay(activeDeal, soonest);

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
        Clientes
      </Link>
      <Typography
        variant="h4"
        component="h1"
        sx={{
          mt: 1.5,
          fontWeight: 700,
          color: "var(--color-foreground)",
          letterSpacing: "-0.02em",
        }}
      >
        {lead.name}
      </Typography>
      {lead.company ? (
        <Typography variant="body2" sx={{ mt: 0.5, color: "var(--color-muted-foreground)" }}>
          {lead.company}
        </Typography>
      ) : null}

      {activeDeal ? (
        <>
          <DealSummaryCard deal={activeDeal} />

          <Typography
            variant="body2"
            sx={{ mt: 2, color: "var(--color-muted-foreground)", lineHeight: 1.55 }}
          >
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
        background:
          "linear-gradient(165deg, var(--color-card) 0%, var(--color-secondary-50) 42%, var(--color-muted) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.65)",
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
