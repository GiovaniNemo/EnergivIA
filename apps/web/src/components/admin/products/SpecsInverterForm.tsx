"use client";

import { Box } from "@mui/material";
import { NumberSpecField } from "./NumberSpecField";

const fields: Array<{ name: string; label: string; integer?: boolean }> = [
  { name: "max_dc_voltage", label: "Tensão DC máx. (V)" },
  { name: "mppt_count", label: "Nº de MPPTs", integer: true },
  { name: "max_strings_per_mppt", label: "Strings por MPPT", integer: true },
  { name: "mppt_voltage_min", label: "Tensão MPPT mín. (V)" },
  { name: "mppt_voltage_max", label: "Tensão MPPT máx. (V)" },
  { name: "max_input_current", label: "Corrente entrada máx. (A)" },
  { name: "max_dc_power", label: "Potência DC máx. (W)" },
  { name: "recommended_dc_ac_ratio_min", label: "Ratio DC/AC mín. recomendado" },
  { name: "recommended_dc_ac_ratio_max", label: "Ratio DC/AC máx. recomendado" },
];

export function SpecsInverterForm(): JSX.Element {
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {fields.map(({ name, label, integer }) => (
        <NumberSpecField key={name} name={`specs.${name}`} label={label} integer={integer} />
      ))}
    </Box>
  );
}
