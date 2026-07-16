"use client";

import { Box } from "@mui/material";
import { NumberSpecField } from "./NumberSpecField";

export function SpecsCableForm(): JSX.Element {
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <NumberSpecField
        name="specs.section_mm2"
        label="Seção (mm²)"
        helperText="Seção transversal do cabo"
      />
      <NumberSpecField name="specs.max_voltage" label="Tensão máxima (V)" />
    </Box>
  );
}
