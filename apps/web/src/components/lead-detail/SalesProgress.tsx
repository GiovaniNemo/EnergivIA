"use client";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { getRecommendedSalesBlock } from "./lead-detail-utils";

export type SalesProgressState = {
  leadCreated: boolean;
  simulationDone: boolean;
  dealCreated: boolean;
  proposalDone: boolean;
  followUpDone: boolean;
};

type RowProps = { done: boolean; label: string; delay: number };

function ProgressRow({ done, label, delay }: RowProps): JSX.Element {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);

  return (
    <Collapse in={show} timeout={320}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
        {done ? (
          <CheckCircleIcon sx={{ color: "var(--color-success)", fontSize: 22 }} />
        ) : (
          <RadioButtonUncheckedIcon
            sx={{ color: "var(--color-muted-foreground)", fontSize: 22, opacity: 0.6 }}
          />
        )}
        <Typography
          variant="body2"
          sx={{
            color: done ? "var(--color-foreground)" : "var(--color-muted-foreground)",
            fontWeight: done ? 600 : 400,
            transition: "color 0.25s ease",
          }}
        >
          {label}
        </Typography>
      </Stack>
    </Collapse>
  );
}

type SalesProgressProps = {
  progress: SalesProgressState;
  onRecommendedAction?: () => void;
  recommendedBusy?: boolean;
};

export function SalesProgress({
  progress,
  onRecommendedAction,
  recommendedBusy,
}: SalesProgressProps): JSX.Element {
  const rec = getRecommendedSalesBlock(progress);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "1px solid var(--color-border)",
        bgcolor: "var(--color-card)",
        p: 2.5,
        height: "100%",
      }}
    >
      <Typography
        variant="overline"
        sx={{ letterSpacing: 1, color: "var(--color-muted-foreground)" }}
      >
        Progresso da venda
      </Typography>

      <Box
        sx={{
          mt: 1.5,
          p: 2,
          borderRadius: 1,
          border: "1px solid var(--color-border)",
          bgcolor: "var(--color-background)",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: "var(--color-foreground)",
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <span aria-hidden>🚀</span> Próximo passo recomendado
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 1, fontWeight: 600, color: "var(--color-foreground)" }}
        >
          {rec.stepTitle}
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 0.75, color: "var(--color-muted-foreground)", lineHeight: 1.55 }}
        >
          {rec.stepDescription}
        </Typography>
        {rec.showAction && onRecommendedAction ? (
          <Button
            variant="contained"
            color="primary"
            size="small"
            disabled={recommendedBusy}
            onClick={onRecommendedAction}
            sx={{ mt: 2 }}
          >
            {recommendedBusy ? "Carregando…" : "Fazer agora"}
          </Button>
        ) : null}
      </Box>

      <Stack sx={{ mt: 2 }}>
        <ProgressRow done={progress.leadCreated} label="Lead criado" delay={0} />
        <ProgressRow done={progress.simulationDone} label="Simulação criada" delay={60} />
        <ProgressRow
          done={progress.dealCreated}
          label="Oportunidade (negócio) criada"
          delay={120}
        />
        <ProgressRow done={progress.proposalDone} label="Proposta criada" delay={180} />
        <ProgressRow done={progress.followUpDone} label="Follow-up realizado" delay={240} />
      </Stack>
    </Box>
  );
}
