"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Box, TextField, MenuItem } from "@mui/material";
import { roofTypeOptions } from "@/lib/admin/schemas";
import { NumberSpecField } from "./NumberSpecField";

export function SpecsStructureForm(): JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const roofLabels: Record<(typeof roofTypeOptions)[number], string> = {
    ceramic: "Colonial / cerâmico",
    metal: "Metálico (mini trilho)",
    fibromadeira: "Fibromadeira",
    fibrometal: "Fibrometal (autobrocante)",
    ground: "Solo",
    laje: "Laje",
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Controller
        name="specs.roof_type"
        control={control}
        render={({ field }) => (
          <TextField
            select
            label="Tipo de telhado"
            value={(field.value as string | undefined) ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            error={Boolean(
              (errors["specs"] as Record<string, { message?: string }> | undefined)?.["roof_type"]
            )}
            helperText={
              (errors["specs"] as Record<string, { message?: string }> | undefined)?.["roof_type"]
                ?.message
            }
            fullWidth
            size="small"
          >
            {roofTypeOptions.map((value) => (
              <MenuItem key={value} value={value}>
                {roofLabels[value]}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <NumberSpecField
        name="specs.max_modules"
        label="Máx. módulos"
        helperText="Capacidade máxima de módulos do kit"
        integer
      />
    </Box>
  );
}
