"use client";

import { Box } from "@mui/material";
import { NumberSpecField } from "./NumberSpecField";

const fields: Array<{ name: string; label: string; helperText?: string; integer?: boolean }> = [
  { name: "channels", label: "Canais", helperText: "Módulos por microinversor", integer: true },
  { name: "max_input_voltage", label: "Tensão entrada máx. (V)" },
  { name: "max_input_current", label: "Corrente entrada máx. (A)" },
  { name: "max_module_power", label: "Potência módulo máx. (W)" },
  { name: "min_module_power", label: "Potência módulo mín. (W)" },
];

export function SpecsMicroInverterForm(): JSX.Element {
  return (
    <Box display="flex" flexDirection="column" gap={2}>
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
