"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SimulationListItem } from "@/lib/leads-api";
import { parseSimulationMetrics, pickBestSimulation } from "./lead-detail-utils";

type SimulationCardProps = {
  simulations: SimulationListItem[];
  onViewDetails: () => void;
  onDuplicate: () => void;
  busy?: boolean;
};

export function SimulationCard({
  simulations,
  onViewDetails,
  onDuplicate,
  busy,
}: SimulationCardProps): JSX.Element {
  const best = pickBestSimulation(simulations);
  const m = parseSimulationMetrics(best);

  if (!simulations.length) {
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
          Ainda não há simulação
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 1.5, color: "var(--color-foreground)", lineHeight: 1.65 }}
        >
          Gere uma simulação para começar a apresentar economia ao cliente.
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 1.5, color: "var(--color-muted-foreground)", lineHeight: 1.65 }}
        >
          Descubra quanto o cliente pode economizar por mês e o tempo de retorno do investimento.
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 2, color: "var(--color-muted-foreground)" }}
        >
          Use o botão principal no topo da página para simular — assim evitamos ações duplicadas e o
          foco fica num só próximo passo.
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
        Estudo energético (simulação)
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 1,
          bgcolor: "var(--color-accent)",
          border: "1px solid var(--color-border)",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "var(--color-muted-foreground)", fontWeight: 600 }}
          >
            Economia estimada
          </Typography>
          <Typography
            variant="h6"
            sx={{ mt: 0.5, fontWeight: 700, color: "var(--color-foreground)" }}
          >
            {m.monthlySavings}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "var(--color-muted-foreground)", fontWeight: 600 }}
          >
            Payback
          </Typography>
          <Typography
            variant="h6"
            sx={{ mt: 0.5, fontWeight: 700, color: "var(--color-foreground)" }}
          >
            {m.paybackYears}
          </Typography>
        </Box>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
        <Typography variant="body2">
          <Box component="span" sx={{ color: "var(--color-muted-foreground)" }}>
            Consumo:{" "}
          </Box>
          {m.consumptionKwh}
        </Typography>
        <Typography variant="body2">
          <Box component="span" sx={{ color: "var(--color-muted-foreground)" }}>
            Sistema:{" "}
          </Box>
          {m.systemKw}
        </Typography>
      </Stack>

      <Stack direction="row" gap={1} sx={{ mt: 2 }} flexWrap="wrap" alignItems="center">
        <Button variant="outlined" size="medium" onClick={onViewDetails} disabled={busy}>
          Ver detalhes da simulação
        </Button>
        <Button variant="text" size="small" onClick={onDuplicate} disabled={busy}>
          Duplicar
        </Button>
      </Stack>
    </Box>
  );
}
