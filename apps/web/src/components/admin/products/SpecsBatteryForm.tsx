"use client";

import { Box, MenuItem, TextField } from "@mui/material";
import { useFormContext, Controller } from "react-hook-form";
import { NumberSpecField } from "./NumberSpecField";

export function SpecsBatteryForm(): JSX.Element {
  const { control } = useFormContext();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <NumberSpecField
        name="specs.capacity_kwh"
        label="Capacidade Nominal (kWh) — ex: 5.12, 10.24"
      />
      <NumberSpecField
        name="specs.capacity_ah"
        label="Capacidade em Ampere-hora (Ah) — ex: 100, 200"
      />
      <NumberSpecField name="specs.nominal_voltage_v" label="Tensão Nominal (V) — ex: 48, 51.2" />

      <Controller
        name="specs.voltage_type"
        control={control}
        defaultValue="low_voltage"
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value || "low_voltage"}
            label="Classe de Tensão"
            select
            fullWidth
            size="small"
          >
            <MenuItem value="low_voltage">Baixa Tensão (LV - 48V / 51.2V)</MenuItem>
            <MenuItem value="high_voltage">Alta Tensão (HV - Módulos em Série)</MenuItem>
          </TextField>
        )}
      />

      <Controller
        name="specs.chemistry"
        control={control}
        defaultValue="lifepo4"
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value || "lifepo4"}
            label="Química / Tecnologia"
            select
            fullWidth
            size="small"
          >
            <MenuItem value="lifepo4">Lítio Ferro Fosfato (LiFePO4 / LFP)</MenuItem>
            <MenuItem value="lithium_ion">Íon de Lítio (NMC / Li-ion)</MenuItem>
            <MenuItem value="lead_carbon">Chumbo-Carbono / Chumbo-Ácido</MenuItem>
            <MenuItem value="other">Outra</MenuItem>
          </TextField>
        )}
      />

      <NumberSpecField name="specs.dod_percent" label="Profundidade de Descarga DoD (%) — ex: 90" />
      <NumberSpecField name="specs.cycles" label="Ciclos de Vida Útil — ex: 6000" integer />
      <NumberSpecField
        name="specs.max_charge_current_a"
        label="Corrente Máx. de Carga (A) — ex: 50, 100"
      />
      <NumberSpecField
        name="specs.max_discharge_current_a"
        label="Corrente Máx. de Descarga (A) — ex: 100"
      />
      <NumberSpecField
        name="specs.warranty_years"
        label="Garantia de fábrica (anos) — ex: 5, 10"
        integer
      />
    </Box>
  );
}
