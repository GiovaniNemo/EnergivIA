"use client";

import { Box, MenuItem, TextField } from "@mui/material";
import { useFormContext, Controller } from "react-hook-form";
import { NumberSpecField } from "./NumberSpecField";

const fields: Array<{ name: string; label: string; helperText?: string; integer?: boolean }> = [
  { name: "channels", label: "Canais", helperText: "Módulos por microinversor", integer: true },
  {
    name: "warranty_years",
    label: "Garantia de fábrica (anos)",
    helperText: "Garantia em anos (ex: 12, 15 ou 25)",
    integer: true,
  },
  { name: "max_input_voltage", label: "Tensão entrada máx. (V)" },
  { name: "max_input_current", label: "Corrente entrada máx. (A)" },
  { name: "max_module_power", label: "Potência módulo máx. (W)" },
  { name: "min_module_power", label: "Potência módulo mín. (W)" },
];

export function SpecsMicroInverterForm(): JSX.Element {
  const { control, setValue } = useFormContext();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Controller
        name="specs.grid_topology"
        control={control}
        defaultValue="mono_220"
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value || "mono_220"}
            onChange={(e) => {
              const val = e.target.value;
              field.onChange(val);
              setValue("specs.grid_standard", "EU");
              setValue("specs.output_voltage_v", "220V");
            }}
            label="Padrão de Rede / Tensão CA do Microinversor"
            helperText="Microinversores atendem Monofásico 220V (F+N ou F+F 220V)."
            select
            fullWidth
            size="small"
          >
            <MenuItem value="mono_220">Monofásico 220V (Fase-Neutro ou Fase-Fase 220V)</MenuItem>
          </TextField>
        )}
      />
      {fields.map(({ name, label, helperText, integer }) => (
        <NumberSpecField
          key={name}
          name={`specs.${name}`}
          label={label}
          helperText={helperText}
          integer={integer}
        />
      ))}
    </Box>
  );
}
