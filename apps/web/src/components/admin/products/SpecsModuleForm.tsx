"use client";

import { Box, Paper, Typography, FormControlLabel, Switch, Chip } from "@mui/material";
import { Controller, useFormContext } from "react-hook-form";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import { NumberSpecField } from "./NumberSpecField";

const fields: Array<{ name: string; label: string; helperText?: string; integer?: boolean }> = [
  {
    name: "power_w",
    label: "Potência (W)",
    helperText: "Potência nominal do módulo em watts",
    integer: true,
  },
  {
    name: "warranty_years",
    label: "Garantia (anos)",
    helperText: "Tempo de garantia de fábrica/desempenho em anos (ex: 25 ou 30)",
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
  const { control } = useFormContext();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Controller
        name="specs.is_tier_1"
        control={control}
        defaultValue={false}
        render={({ field }) => (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: field.value ? "rgba(16, 185, 129, 0.04)" : "background.paper",
              borderColor: field.value ? "success.light" : "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              transition: "all 0.2s ease-in-out",
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                component="img"
                src="/badges/tier1.jpeg"
                alt="Selo Tier 1"
                sx={{
                  height: 38,
                  width: "auto",
                  borderRadius: 1,
                  objectFit: "contain",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              />
              <Box>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                    Módulo Tier 1 (BloombergNEF)
                  </Typography>
                  {field.value && (
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<VerifiedOutlinedIcon fontSize="small" />}
                      label="Selo Ativo"
                      sx={{ height: 22, fontSize: "0.72rem" }}
                    />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.25 }}
                >
                  Indica se o fabricante é classificado como Tier 1 pela BloombergNEF. Esse selo é
                  exibido no orçamento e nas opções de kits para o integrador.
                </Typography>
              </Box>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(field.value)}
                  onChange={(e) => field.onChange(e.target.checked)}
                  color="success"
                />
              }
              label={field.value ? "Sim" : "Não"}
              sx={{ m: 0, flexShrink: 0 }}
            />
          </Paper>
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
