"use client";

import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import type { PrimaryCta } from "./lead-detail-utils";

type DynamicCtaProps = {
  cta: PrimaryCta;
  busy?: boolean;
  onClick: () => void;
};

export function DynamicCta({ cta, busy, onClick }: DynamicCtaProps): JSX.Element {
  return (
    <Box sx={{ mt: 2, display: "flex", justifyContent: { xs: "stretch", sm: "flex-start" } }}>
      <Button
        variant="contained"
        color="primary"
        size="large"
        disabled={busy}
        onClick={onClick}
        sx={{
          minWidth: { xs: "100%", sm: 300 },
          py: 1.5,
          px: 3,
          borderRadius: 3,
          fontSize: "1rem",
          letterSpacing: "0.01em",
          boxShadow: "0 2px 8px rgba(76, 175, 80, 0.28)",
          transition: "box-shadow 0.2s ease, transform 0.15s ease, filter 0.15s ease",
          "&:hover": {
            boxShadow: "0 6px 18px rgba(76, 175, 80, 0.38)",
            filter: "brightness(1.02)",
          },
          "&:active": {
            transform: "translateY(1px)",
          },
        }}
      >
        {busy ? "Carregando…" : cta.label}
      </Button>
    </Box>
  );
}
