"use client";

import { Box, MenuItem, TextField } from "@mui/material";
import { useFormContext, Controller } from "react-hook-form";
import { NumberSpecField } from "./NumberSpecField";

const fields: Array<{ name: string; label: string; helperText?: string; integer?: boolean }> = [
  { name: "nominal_power_w", label: "Potência Nominal CA (W)", integer: true },
  {
    name: "warranty_years",
    label: "Garantia de fábrica (anos)",
    helperText: "Garantia em anos (ex: 5, 10, 12 ou 15)",
    integer: true,
  },
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
              if (val === "mono_220") {
                setValue("specs.grid_standard", "EU");
                setValue("specs.output_voltage_v", "220V");
              } else if (val === "tri_220") {
                setValue("specs.grid_standard", "TRI_220");
                setValue("specs.output_voltage_v", "220V");
              } else if (val === "tri_380") {
                setValue("specs.grid_standard", "TRI_380");
                setValue("specs.output_voltage_v", "380V/220V");
              }
            }}
            label="Padrão de Rede / Tensão CA do Inversor"
            helperText="Inversores On-Grid são Monofásicos 220V até 10kW. Acima de 10kW são Trifásicos 220V ou 380V."
            select
            fullWidth
            size="small"
          >
            <MenuItem value="mono_220">Monofásico 220V (Padrão On-Grid até 10kW)</MenuItem>
            <MenuItem value="tri_220">Trifásico 220V (Rede 127/220V)</MenuItem>
            <MenuItem value="tri_380">Trifásico 380V (Rede 220/380V)</MenuItem>
          </TextField>
        )}
      />

      {fields.map(({ name, label, integer }) => (
        <NumberSpecField key={name} name={`specs.${name}`} label={label} integer={integer} />
      ))}
    </Box>
  );
}
