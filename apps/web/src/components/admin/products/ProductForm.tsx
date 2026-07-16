"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Alert, Box, TextField, MenuItem, FormControlLabel, Switch } from "@mui/material";
import { SpecsModuleForm } from "./SpecsModuleForm";
import { SpecsInverterForm } from "./SpecsInverterForm";
import { SpecsMicroInverterForm } from "./SpecsMicroInverterForm";
import { SpecsStructureForm } from "./SpecsStructureForm";
import { SpecsCableForm } from "./SpecsCableForm";
import { SpecsConnectorForm } from "./SpecsConnectorForm";
import { SpecsPreviewCard } from "./SpecsPreviewCard";
import { ImageUpload } from "./ImageUpload";
import type { CategoryName } from "@/lib/admin/schemas";

const CATEGORY_LABELS: Record<string, string> = {
  module: "Módulo",
  inverter: "Inversor",
  microinverter: "Microinversor",
  structure_kit: "Estrutura",
  dc_cable: "Cabo CC",
  connector: "Conector",
};

function formatCategoryLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (CATEGORY_LABELS[normalized]) return CATEGORY_LABELS[normalized];
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const categoryToSpecForm: Record<CategoryName, () => JSX.Element> = {
  module: SpecsModuleForm,
  inverter: SpecsInverterForm,
  microinverter: SpecsMicroInverterForm,
  structure_kit: SpecsStructureForm,
  dc_cable: SpecsCableForm,
  connector: SpecsConnectorForm,
};

interface ProductFormProps {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  categoryName: CategoryName | null;
}

export function ProductForm({ categories, brands, categoryName }: ProductFormProps): JSX.Element {
  const {
    register,
    control,
    formState: { errors, submitCount },
  } = useFormContext();
  const SpecForm = categoryName ? categoryToSpecForm[categoryName] : null;
  const hasErrors = submitCount > 0 && Object.keys(errors).length > 0;

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {hasErrors ? (
        <Alert severity="error">Corrija os campos destacados antes de salvar.</Alert>
      ) : null}
      <Box component="section">
        <Box sx={{ typography: "subtitle1", fontWeight: 600, mb: 2 }}>Informações gerais</Box>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            {...register("name")}
            label="Nome do produto"
            error={Boolean(errors["name"])}
            helperText={errors["name"]?.message as string | undefined}
            fullWidth
            size="small"
          />
          <Controller
            name="brand_id"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                select
                label="Marca"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                fullWidth
                size="small"
              >
                {brands.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="category_id"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                select
                label="Categoria"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                fullWidth
                size="small"
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {formatCategoryLabel(c.name)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="image_url"
            control={control}
            render={({ field }) => (
              <ImageUpload
                value={(field.value as string | undefined) ?? ""}
                onChange={(url) => field.onChange(url)}
                folder="products"
                productCategory={categoryName ?? undefined}
              />
            )}
          />
          {errors["image_url"] && (
            <Box sx={{ color: "error.main", typography: "caption" }}>
              {errors["image_url"]?.message as string}
            </Box>
          )}
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label="Ativo"
              />
            )}
          />
        </Box>
      </Box>

      {categoryName && (
        <Box component="section">
          <Box sx={{ typography: "subtitle1", fontWeight: 600, mb: 2 }}>
            Especificações técnicas
          </Box>
          <Box display="flex" gap={3} flexWrap="wrap">
            <Box flex="1" minWidth={280}>
              {SpecForm && <SpecForm />}
            </Box>
            <Box minWidth={220}>
              <SpecsPreviewCard categoryName={categoryName} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
