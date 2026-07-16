"use client";

import { useFormContext } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Box, TextField, MenuItem } from "@mui/material";
import { connectorTypeOptions } from "@/lib/admin/schemas";

export function SpecsConnectorForm(): JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Controller
        name="specs.type"
        control={control}
        render={({ field }) => (
          <TextField
            select
            label="Tipo de conector"
            value={(field.value as string | undefined) ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            error={Boolean(
              (errors["specs"] as Record<string, { message?: string }> | undefined)?.["type"]
            )}
            helperText={
              (errors["specs"] as Record<string, { message?: string }> | undefined)?.["type"]
                ?.message
            }
            fullWidth
            size="small"
          >
            {connectorTypeOptions.map((value) => (
              <MenuItem key={value} value={value}>
                {value.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </Box>
  );
}
