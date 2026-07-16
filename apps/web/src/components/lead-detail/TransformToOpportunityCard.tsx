"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type TransformToOpportunityCardProps = {
  onCreateFromSimulation: () => void;
  onManualCreate: () => void;
  busy?: boolean;
};

export function TransformToOpportunityCard({
  onCreateFromSimulation,
  onManualCreate,
  busy,
}: TransformToOpportunityCardProps): JSX.Element {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "2px solid var(--color-primary)",
        bgcolor: "var(--color-card)",
        p: { xs: 2.5, sm: 3 },
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: "var(--color-primary)", fontWeight: 700, letterSpacing: 0.8 }}
      >
        Oportunidade comercial
      </Typography>
      <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: "var(--color-foreground)" }}>
        Transformar em oportunidade
      </Typography>
      <Typography
        variant="body2"
        sx={{ mt: 1.5, color: "var(--color-muted-foreground)", lineHeight: 1.6 }}
      >
        Use essa simulação para acompanhar e fechar a venda — valor, estágio, propostas e follow-up
        no mesmo lugar.
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 2.5 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={busy}
          onClick={onCreateFromSimulation}
          sx={{
            py: 1.25,
            fontWeight: 700,
            bgcolor: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            boxShadow: "none",
            "&:hover": { boxShadow: "none", filter: "brightness(0.96)" },
          }}
        >
          {busy ? "Criando…" : "Criar oportunidade"}
        </Button>
        <Typography
          variant="body2"
          sx={{ textAlign: "center", color: "var(--color-muted-foreground)" }}
        >
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={onManualCreate}
            sx={{ fontWeight: 600, cursor: "pointer" }}
          >
            Prefere definir título e valor manualmente?
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}
