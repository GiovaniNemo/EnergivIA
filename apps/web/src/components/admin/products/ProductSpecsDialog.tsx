"use client";

import { useMemo, useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { ProductForm } from "./ProductForm";
import {
  buildProductSchema,
  productBaseSchema,
  categoryNames,
  type CategoryName,
} from "@/lib/admin/schemas";
import {
  fetchBrands,
  fetchCategories,
  fetchProduct,
  updateProduct,
  lookupEquipmentHomologation,
} from "@/lib/admin-api";
import { getProductSpecsStatus, inferStructureSpecsFromName } from "@/lib/product-specs-status";

const defaultSpecsByCategory: Partial<Record<CategoryName, Record<string, unknown>>> = {
  inverter: { type: "string" },
  microinverter: { type: "micro" },
  structure_kit: { roof_type: "ceramic", max_modules: 20 },
  connector: { type: "mc4" },
};

type FormValues = {
  name: string;
  brand_id: string;
  category_id: string;
  image_url?: string;
  datasheet_url?: string;
  active: boolean;
  specs: Record<string, unknown>;
};

export interface ProductSpecsDialogProps {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onSaved?: () => void;
  defaultTab?: number;
}

export function ProductSpecsDialog({
  open,
  productId,
  onClose,
  onSaved,
  defaultTab = 1,
}: ProductSpecsDialogProps): JSX.Element {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: () => fetchProduct(productId!),
    enabled: Boolean(productId && open),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
    enabled: open,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: fetchBrands,
    enabled: open,
  });

  const categoryNameFromId = (catId: string): CategoryName | null => {
    const cat = categories.find((c) => c.id === catId);
    return cat && categoryNames.includes(cat.name as CategoryName)
      ? (cat.name as CategoryName)
      : null;
  };

  const methods = useForm<FormValues>({
    defaultValues: {
      name: "",
      brand_id: "",
      category_id: "",
      image_url: "",
      datasheet_url: "",
      active: true,
      specs: {},
    },
  });

  const watchCategoryId = methods.watch("category_id");
  const effectiveCategoryName = useMemo(
    () => categoryNameFromId(watchCategoryId ?? ""),
    [watchCategoryId, categories]
  );

  const watchedSpecs = methods.watch("specs");
  const specsStatus = useMemo(() => {
    return getProductSpecsStatus(
      effectiveCategoryName || product?.category?.name,
      (watchedSpecs || product?.specs) as Record<string, unknown>
    );
  }, [effectiveCategoryName, product?.category?.name, watchedSpecs, product?.specs]);

  useEffect(() => {
    if (product && open) {
      const initialSpecs = { ...((product.specs as Record<string, unknown>) ?? {}) };
      const cat = effectiveCategoryName || product.category?.name;
      if (cat === "structure_kit" || cat === "structure") {
        const inferred = inferStructureSpecsFromName(product.name);
        if (inferred.roof_type && !initialSpecs["roof_type"]) {
          initialSpecs["roof_type"] = inferred.roof_type;
        }
        if (inferred.max_modules && !initialSpecs["max_modules"]) {
          initialSpecs["max_modules"] = inferred.max_modules;
        }
      }

      if (cat === "microinverter" || cat?.toLowerCase().includes("micro")) {
        initialSpecs["type"] = "micro";
        if (!initialSpecs["channels"] && initialSpecs["mppt_count"]) {
          initialSpecs["channels"] = initialSpecs["mppt_count"];
        }
        if (!initialSpecs["max_input_voltage"] && initialSpecs["max_dc_voltage"]) {
          initialSpecs["max_input_voltage"] = initialSpecs["max_dc_voltage"];
        }
        if (!initialSpecs["max_module_power"]) {
          if (initialSpecs["max_dc_power"] && initialSpecs["channels"]) {
            initialSpecs["max_module_power"] = Math.round(
              Number(initialSpecs["max_dc_power"]) / Number(initialSpecs["channels"])
            );
          } else if (initialSpecs["nominal_power_w"] && initialSpecs["channels"]) {
            initialSpecs["max_module_power"] = Math.round(
              (Number(initialSpecs["nominal_power_w"]) * 1.4) / Number(initialSpecs["channels"])
            );
          }
        }
        if (!initialSpecs["min_module_power"] && initialSpecs["max_module_power"]) {
          initialSpecs["min_module_power"] = Math.round(
            Number(initialSpecs["max_module_power"]) * 0.5
          );
        }
      }

      methods.reset({
        name: product.name,
        brand_id: product.brandId,
        category_id: product.categoryId,
        image_url: product.imageUrl ?? "",
        datasheet_url: product.datasheetUrl ?? "",
        active: product.active,
        specs: initialSpecs,
      });
      setSuccessMsg(null);
      setErrorMsg(null);
    } else if (!open) {
      methods.reset({
        name: "",
        brand_id: "",
        category_id: "",
        image_url: "",
        datasheet_url: "",
        active: true,
        specs: {},
      });
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [product, open, methods, effectiveCategoryName]);

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateProduct>[1]) => updateProduct(productId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "product-distributors"] });
      setSuccessMsg("Ficha técnica e especificações atualizadas com sucesso!");
      onSaved?.();
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Erro ao salvar alterações do produto.");
    },
  });

  const onSubmit = (values: FormValues) => {
    setErrorMsg(null);
    const cat = effectiveCategoryName || (product?.category?.name as CategoryName);
    if (cat && defaultSpecsByCategory[cat]) {
      values.specs = { ...defaultSpecsByCategory[cat], ...values.specs };
    }
    if ((cat === "inverter" || cat?.toLowerCase().includes("inv")) && values.specs) {
      values.specs["type"] = "string";
      const nom = Number(values.specs["nominal_power_w"]);
      if (nom > 0) {
        if (!values.specs["max_dc_power"] || Number(values.specs["max_dc_power"]) <= 0) {
          values.specs["max_dc_power"] = Math.round(nom * 1.5);
        }
        if (!values.specs["recommended_dc_ac_ratio_min"]) {
          values.specs["recommended_dc_ac_ratio_min"] = 1.05;
        }
        if (!values.specs["recommended_dc_ac_ratio_max"]) {
          values.specs["recommended_dc_ac_ratio_max"] = 1.5;
        }
      }
      if (!values.specs["max_strings_per_mppt"]) {
        values.specs["max_strings_per_mppt"] = 2;
      }
    }
    if (
      (cat === "hybrid_inverter" ||
        cat?.toLowerCase().includes("hibr") ||
        cat?.toLowerCase().includes("híbr")) &&
      values.specs
    ) {
      values.specs["type"] = "hybrid";
      const nom = Number(values.specs["nominal_power_w"]);
      if (nom > 0) {
        if (!values.specs["max_dc_power"] || Number(values.specs["max_dc_power"]) <= 0) {
          values.specs["max_dc_power"] = Math.round(nom * 1.5);
        }
      }
      if (!values.specs["max_strings_per_mppt"]) {
        values.specs["max_strings_per_mppt"] = 2;
      }
    }
    if ((cat === "microinverter" || cat?.toLowerCase().includes("micro")) && values.specs) {
      values.specs["type"] = "micro";
      if (!values.specs["channels"] && values.specs["mppt_count"]) {
        values.specs["channels"] = Number(values.specs["mppt_count"]);
      }
      if (!values.specs["max_input_voltage"] && values.specs["max_dc_voltage"]) {
        values.specs["max_input_voltage"] = Number(values.specs["max_dc_voltage"]);
      }
      if (!values.specs["min_module_power"] && values.specs["max_module_power"]) {
        values.specs["min_module_power"] = Math.round(
          Number(values.specs["max_module_power"]) * 0.5
        );
      }
      if (values.specs["channels"]) {
        values.specs["mppt_count"] = Number(values.specs["channels"]);
      }
      if (values.specs["max_input_voltage"]) {
        values.specs["max_dc_voltage"] = Number(values.specs["max_input_voltage"]);
      }
    }

    // Se o produto está sendo desativado (active: false), não bloqueamos por especificações incompletas
    const isDeactivating = values.active === false;
    const schema = isDeactivating ? productBaseSchema : buildProductSchema(cat);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldLabels: Record<string, string> = {
        name: "Nome do produto (Aba Informações Gerais)",
        brand_id: "Marca / Fabricante (Aba Informações Gerais)",
        category_id: "Categoria (Aba Informações Gerais)",
        "specs.nominal_power_w": "Potência Nominal CA (W)",
        "specs.max_dc_voltage": "Tensão DC Máx (V)",
        "specs.mppt_count": "Nº de MPPTs",
        "specs.max_strings_per_mppt": "Strings por MPPT",
        "specs.mppt_voltage_min": "Tensão MPPT Mín (V)",
        "specs.mppt_voltage_max": "Tensão MPPT Máx (V)",
        "specs.max_input_current": "Corrente Entrada Máx (A)",
        "specs.max_dc_power": "Potência DC Máx (W)",
        "specs.recommended_dc_ac_ratio_min": "Ratio DC/AC Mín",
        "specs.recommended_dc_ac_ratio_max": "Ratio DC/AC Máx",
        "specs.channels": "Canais (Nº de Módulos por micro)",
        "specs.max_input_voltage": "Tensão de Entrada Máx (V)",
        "specs.max_module_power": "Potência Máxima do Módulo (W)",
        "specs.min_module_power": "Potência Mínima do Módulo (W)",
      };

      parsed.error.issues.forEach((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        methods.setError(path as import("react-hook-form").FieldPath<FormValues>, {
          message: issue.message,
        });
      });

      const missingList = parsed.error.issues.map((i) => {
        const p = i.path.join(".");
        return fieldLabels[p] || p;
      });

      setErrorMsg(`Campos pendentes ou inválidos para salvar: ${missingList.join(", ")}`);
      return;
    }

    updateMutation.mutate({
      name: parsed.data.name,
      brand_id: parsed.data.brand_id,
      category_id: parsed.data.category_id,
      image_url: parsed.data.image_url,
      datasheet_url: parsed.data.datasheet_url,
      specs:
        (isDeactivating
          ? (values.specs as Record<string, unknown>)
          : (parsed.data as { specs?: Record<string, unknown> }).specs) ?? {},
    });
  };

  const handleLookupHomologation = async () => {
    if (!product?.name) return;
    setIsLookingUp(true);
    setErrorMsg(null);
    try {
      const match = await lookupEquipmentHomologation(product.name);
      if (match && match.specs) {
        const currentSpecs = (methods.getValues("specs") || {}) as Record<string, unknown>;
        const mergedSpecs = { ...currentSpecs, ...match.specs };
        methods.setValue("specs", mergedSpecs, {
          shouldDirty: true,
          shouldValidate: true,
        });

        Object.entries(match.specs).forEach(([k, v]) => {
          methods.setValue(`specs.${k}` as Parameters<typeof methods.setValue>[0], v, {
            shouldDirty: true,
            shouldValidate: true,
          });
        });

        // Vincula a marca correspondente se identificada (ex: Growatt, GoodWe, SAJ, etc.)
        if (match.brand) {
          const matchedBrand = brands.find(
            (b) => b.name.trim().toUpperCase() === match.brand!.trim().toUpperCase()
          );
          if (matchedBrand) {
            methods.setValue("brand_id", matchedBrand.id, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        }

        methods.trigger();

        setSuccessMsg(
          `Especificações oficiais preenchidas com sucesso via Catálogo Homologado (${match.brand ? `${match.brand} - ` : ""}${match.model})!`
        );
      } else {
        setErrorMsg(
          "Nenhuma homologação exata encontrada para este modelo no catálogo oficial. Você pode preencher manualmente os campos abaixo."
        );
      }
    } catch {
      setErrorMsg("Erro ao consultar catálogo oficial de equipamentos.");
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          pb: 1.5,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5} overflow="hidden">
          <DescriptionOutlinedIcon
            sx={{
              color: specsStatus.isComplete ? "#10b981" : "#ef4444",
            }}
          />
          <Box overflow="hidden">
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                {product?.name ? `Ficha Técnica · ${product.name}` : "Ficha Técnica do Produto"}
              </Typography>
              <Chip
                size="small"
                label={
                  specsStatus.isComplete
                    ? "Ficha Completa"
                    : `Incompleta (${specsStatus.missingFields.length} pendentes)`
                }
                sx={{
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 22,
                  color: specsStatus.isComplete ? "#10b981" : "#ef4444",
                  bgcolor: specsStatus.isComplete
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${
                    specsStatus.isComplete ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                  }`,
                }}
              />
            </Box>
            {product?.brand?.name && (
              <Typography variant="caption" color="text.secondary">
                Fabricante: {product.brand.name}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Fechar">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {loadingProduct || !product ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={260}>
            <CircularProgress size={36} />
          </Box>
        ) : (
          <FormProvider {...methods} key={product.id}>
            <form id="product-specs-dialog-form" onSubmit={methods.handleSubmit(onSubmit)}>
              {successMsg && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {successMsg}
                </Alert>
              )}
              {errorMsg && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMsg}
                </Alert>
              )}

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  mb: 2,
                  bgcolor: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  borderRadius: 2,
                  gap: 1.5,
                  flexWrap: { xs: "wrap", sm: "nowrap" },
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                    ⚡ Auto-Preenchimento Homologado & Datasheet
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Preencher tensões, MPPTs, potências e ratio CC/CA oficiais para evitar erros de
                    cálculo.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleLookupHomologation}
                  disabled={isLookingUp}
                  startIcon={
                    isLookingUp ? <CircularProgress size={16} color="inherit" /> : undefined
                  }
                  sx={{
                    whiteSpace: "nowrap",
                    textTransform: "none",
                    fontWeight: 700,
                    bgcolor: "#2563eb",
                    "&:hover": { bgcolor: "#1d4ed8" },
                  }}
                >
                  {isLookingUp ? "Consultando..." : "Buscar Ficha Oficial"}
                </Button>
              </Box>

              {!specsStatus.isComplete && specsStatus.totalRequired > 0 && (
                <Alert
                  severity="warning"
                  sx={{
                    mb: 2.5,
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    bgcolor: "rgba(245, 158, 11, 0.08)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#d97706" }}>
                    ⚠️ Parâmetros pendentes para dimensionamento solar:
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.75 }}
                  >
                    Ao puxar da planilha, apenas dados básicos vieram no nome. Preencha os campos
                    abaixo para que as propostas e cálculos funcionem sem erros:
                  </Typography>
                  <Box
                    component="ul"
                    sx={{ m: 0, pl: 2.5, fontSize: "0.82rem", color: "text.primary" }}
                  >
                    {specsStatus.missingFields.map((field) => (
                      <li key={field}>
                        <strong>{field}</strong>
                      </li>
                    ))}
                  </Box>
                </Alert>
              )}
              <ProductForm
                categories={categories}
                brands={brands}
                categoryName={effectiveCategoryName || (product?.category?.name as CategoryName)}
                productId={productId ?? undefined}
                defaultTab={defaultTab}
              />
            </form>
          </FormProvider>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="product-specs-dialog-form"
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loadingProduct || updateMutation.isPending}
          sx={{ textTransform: "none", fontWeight: 600, px: 3 }}
        >
          {updateMutation.isPending ? "Salvando..." : "Salvar Ficha Técnica"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
