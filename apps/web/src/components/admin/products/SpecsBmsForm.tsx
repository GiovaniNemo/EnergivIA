"use client";

import { Box, TextField } from "@mui/material";
import { useFormContext, Controller } from "react-hook-form";
import { NumberSpecField } from "./NumberSpecField";

export function SpecsBmsForm(): JSX.Element {
  const { control } = useFormContext();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <NumberSpecField
        name="specs.nominal_voltage_v"
        label="Tensão Nominal de Trabalho (V) — ex: 48, 200, 400"
      />
      <NumberSpecField name="specs.max_voltage_v" label="Tensão Máxima Suportada (V) — ex: 600" />
      <NumberSpecField
        name="specs.max_current_a"
        label="Corrente Máxima Contínua (A) — ex: 50, 100"
      />
      <NumberSpecField
        name="specs.supported_batteries_count"
        label="Nº Máximo de Módulos de Bateria Suportados"
        integer
      />

      <Controller
        name="specs.communication_protocol"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value || ""}
            label="Protocolo de Comunicação (ex: CAN / RS485)"
            fullWidth
            size="small"
          />
        )}
      />

      <NumberSpecField
        name="specs.warranty_years"
        label="Garantia de fábrica (anos) — ex: 5, 10"
        integer
      />
    </Box>
  );
}
