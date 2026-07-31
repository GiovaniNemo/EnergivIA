"use client";

import { Box, MenuItem, TextField } from "@mui/material";
import { useFormContext } from "react-hook-form";
import { NumberSpecField } from "./NumberSpecField";

export function SpecsCableForm(): JSX.Element {
  const { register } = useFormContext();
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <NumberSpecField
        name="specs.section_mm2"
        label="Seção (mm²)"
        helperText="Seção transversal do cabo"
      />
      <NumberSpecField name="specs.max_voltage" label="Tensão máxima (V)" />
      <TextField
        {...register("specs.color")}
        select
        label="Cor"
        fullWidth
        size="small"
        defaultValue="preto"
      >
        <MenuItem value="preto">Preto</MenuItem>
        <MenuItem value="vermelho">Vermelho</MenuItem>
      </TextField>
      <NumberSpecField
        name="specs.roll_length_m"
        label="Tamanho da bobina (metros)"
        helperText="Deixe vazio ou 1 se for vendido por metro."
      />
    </Box>
  );
}
