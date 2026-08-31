"use client";

import { Box, FormControlLabel, Switch } from "@mui/material";
import { useFormContext, Controller } from "react-hook-form";
import { NumberSpecField } from "./NumberSpecField";

export function SpecsStringBoxForm(): JSX.Element {
  const { control } = useFormContext();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <NumberSpecField
        name="specs.inputs_count"
        label="Nº de Entradas (E) — ex: 1, 2, 3, 4"
        integer
      />
      <NumberSpecField
        name="specs.outputs_count"
        label="Nº de Saídas (S) — ex: 1, 2, 3, 4"
        integer
      />
      <NumberSpecField
        name="specs.max_voltage_v"
        label="Tensão Máxima CC (V) — ex: 600, 1000, 1500"
        integer
      />
      <NumberSpecField
        name="specs.max_current_a"
        label="Corrente Máxima por String (A) — ex: 15, 25, 32"
      />
      <NumberSpecField
        name="specs.warranty_years"
        label="Garantia de fábrica (anos)"
        helperText="Garantia em anos (ex: 2, 5 anos)"
        integer
      />

      <Box display="flex" flexDirection="column" gap={1} mt={1}>
        <Controller
          name="specs.dps_included"
          control={control}
          defaultValue={true}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={Boolean(field.value)} onChange={field.onChange} />}
              label="Possui DPS CC (Proteção contra Surtos)"
            />
          )}
        />
        <Controller
          name="specs.switch_included"
          control={control}
          defaultValue={true}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={Boolean(field.value)} onChange={field.onChange} />}
              label="Possui Chave Seccionadora CC"
            />
          )}
        />
        <Controller
          name="specs.fuses_included"
          control={control}
          defaultValue={true}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={Boolean(field.value)} onChange={field.onChange} />}
              label="Possui Porta-Fusíveis / Fusíveis CC"
            />
          )}
        />
      </Box>
    </Box>
  );
}
