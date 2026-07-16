"use client";

import { Box } from "@mui/material";
import { NumberSpecField } from "./NumberSpecField";

const fields: Array<{ name: string; label: string; helperText?: string; integer?: boolean }> = [
  {
    name: "power_w",
    label: "Potência (W)",
    helperText: "Potência nominal do módulo em watts",
    integer: true,
  },
  { name: "voc", label: "Voc (V)", helperText: "Tensão de circuito aberto" },
  { name: "vmp", label: "Vmp (V)", helperText: "Tensão no ponto de máxima potência" },
  { name: "isc", label: "Isc (A)", helperText: "Corrente de curto-circuito" },
  { name: "imp", label: "Imp (A)", helperText: "Corrente no ponto de máxima potência" },
  { name: "efficiency", label: "Eficiência (%)", helperText: "Eficiência do módulo" },
  {
    name: "max_system_voltage",
    label: "Tensão máx. sistema (V)",
    helperText: "Tensão máxima do sistema",
    integer: true,
  },
  { name: "width_mm", label: "Largura (mm)", integer: true },
  { name: "height_mm", label: "Altura (mm)", integer: true },
];

export function SpecsModuleForm(): JSX.Element {
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
