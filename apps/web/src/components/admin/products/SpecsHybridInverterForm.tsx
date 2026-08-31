"use client";

import { Box, MenuItem, TextField } from "@mui/material";
import { useFormContext, Controller } from "react-hook-form";
import { NumberSpecField } from "./NumberSpecField";

export function SpecsHybridInverterForm(): JSX.Element {
  const { control } = useFormContext();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <NumberSpecField
        name="specs.nominal_power_w"
        label="Potência Nominal CA (W) — ex: 5000, 8000"
        integer
      />
      <NumberSpecField name="specs.max_dc_power" label="Potência DC Máx. Painéis (W)" integer />
      <NumberSpecField
        name="specs.max_dc_voltage"
        label="Tensão DC Máx. (V) — ex: 550, 600, 1000"
        integer
      />
      <NumberSpecField name="specs.mppt_count" label="Nº de MPPTs" integer />
      <NumberSpecField name="specs.max_strings_per_mppt" label="Strings por MPPT" integer />
      <NumberSpecField name="specs.mppt_voltage_min" label="Tensão MPPT Mín. (V)" />
      <NumberSpecField name="specs.mppt_voltage_max" label="Tensão MPPT Máx. (V)" />
      <NumberSpecField name="specs.max_input_current" label="Corrente Máx. Entrada MPPT (A)" />

      <Controller
        name="specs.battery_voltage_type"
        control={control}
        defaultValue="low_voltage"
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value || "low_voltage"}
            label="Tipo de Bateria Suportada"
            select
            fullWidth
            size="small"
          >
            <MenuItem value="low_voltage">Baixa Tensão (LV - 48V / 51.2V)</MenuItem>
            <MenuItem value="high_voltage">Alta Tensão (HV - 150V a 600V)</MenuItem>
          </TextField>
        )}
      />

      <NumberSpecField
        name="specs.battery_nominal_voltage_v"
        label="Tensão Nominal Bateria (V) — ex: 48, 51.2"
      />
      <NumberSpecField
        name="specs.max_charge_current_a"
        label="Corrente Máx. de Carga da Bateria (A) — ex: 100"
      />
      <NumberSpecField
        name="specs.max_discharge_current_a"
        label="Corrente Máx. de Descarga (A) — ex: 100"
      />
      <NumberSpecField
        name="specs.eps_nominal_power_w"
        label="Potência de Backup / EPS (W) — ex: 5000"
        integer
      />
      <NumberSpecField
        name="specs.warranty_years"
        label="Garantia de fábrica (anos) — ex: 5, 10"
        integer
      />
    </Box>
  );
}
