"use client";

import { Box, MenuItem, TextField } from "@mui/material";
import { useFormContext, Controller } from "react-hook-form";
import { NumberSpecField } from "./NumberSpecField";

export function SpecsOffGridInverterForm(): JSX.Element {
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
              } else if (val === "biphasic_127_220") {
                setValue("specs.grid_standard", "US");
                setValue("specs.output_voltage_v", "127V/220V");
              } else if (val === "mono_127") {
                setValue("specs.grid_standard", "US");
                setValue("specs.output_voltage_v", "127V");
              } else if (val === "tri_220") {
                setValue("specs.grid_standard", "TRI_220");
                setValue("specs.output_voltage_v", "220V");
              } else if (val === "tri_380") {
                setValue("specs.grid_standard", "TRI_380");
                setValue("specs.output_voltage_v", "380V/220V");
              }
            }}
            label="Padrão de Rede / Tensão de Saída CA"
            select
            fullWidth
            size="small"
          >
            <MenuItem value="mono_220">Monofásico 220V — Modelo EU (220V)</MenuItem>
            <MenuItem value="biphasic_127_220">
              Bifásico 127V/220V — Modelo US (Split-Phase 127V/220V)
            </MenuItem>
            <MenuItem value="mono_127">Monofásico 127V</MenuItem>
            <MenuItem value="tri_220">Trifásico 220V</MenuItem>
            <MenuItem value="tri_380">Trifásico 380V</MenuItem>
          </TextField>
        )}
      />

      <NumberSpecField
        name="specs.nominal_power_w"
        label="Potência Contínua CA (W) — ex: 3000, 5000"
        integer
      />
      <NumberSpecField
        name="specs.peak_power_w"
        label="Potência de Pico / Partida (W) — ex: 6000, 10000"
        integer
      />
      <NumberSpecField
        name="specs.battery_nominal_voltage_v"
        label="Tensão do Banco de Baterias (V) — ex: 12, 24, 48"
        integer
      />
      <NumberSpecField
        name="specs.max_pv_power_w"
        label="Potência Máx. Painéis Solar (W) — ex: 4000, 6000"
        integer
      />
      <NumberSpecField
        name="specs.max_dc_voltage"
        label="Tensão DC Máx. Solar (V) — ex: 150, 450, 500"
        integer
      />
      <NumberSpecField name="specs.mppt_voltage_min" label="Tensão MPPT Mín. (V) — ex: 60, 120" />
      <NumberSpecField name="specs.mppt_voltage_max" label="Tensão MPPT Máx. (V) — ex: 430, 450" />
      <NumberSpecField
        name="specs.ac_output_voltage"
        label="Tensão de Saída CA (V) — ex: 127 ou 220"
        integer
      />

      <Controller
        name="specs.waveform"
        control={control}
        defaultValue="pure_sine"
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value || "pure_sine"}
            label="Tipo de Onda CA"
            select
            fullWidth
            size="small"
          >
            <MenuItem value="pure_sine">Onda Senoidal Pura</MenuItem>
            <MenuItem value="modified_sine">Onda Senoidal Modificada</MenuItem>
          </TextField>
        )}
      />

      <NumberSpecField
        name="specs.warranty_years"
        label="Garantia de fábrica (anos) — ex: 2, 5"
        integer
      />
    </Box>
  );
}
