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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { ProductForm } from "./ProductForm";
import { buildProductSchema, categoryNames, type CategoryName } from "@/lib/admin/schemas";
import { fetchBrands, fetchCategories, fetchProduct, updateProduct } from "@/lib/admin-api";

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

  useEffect(() => {
    if (product && open) {
      methods.reset({
        name: product.name,
        brand_id: product.brandId,
        category_id: product.categoryId,
        image_url: product.imageUrl ?? "",
        datasheet_url: product.datasheetUrl ?? "",
        active: product.active,
        specs: (product.specs as Record<string, unknown>) ?? {},
      });
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [product, open, methods]);

  const watchCategoryId = methods.watch("category_id");
  const effectiveCategoryName = useMemo(
    () => categoryNameFromId(watchCategoryId ?? ""),
    [watchCategoryId, categories]
  );

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
    if (effectiveCategoryName && defaultSpecsByCategory[effectiveCategoryName]) {
      values.specs = { ...defaultSpecsByCategory[effectiveCategoryName], ...values.specs };
    }

    const schema = buildProductSchema(effectiveCategoryName);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        methods.setError(path as import("react-hook-form").FieldPath<FormValues>, {
          message: issue.message,
        });
      });
      return;
    }

    updateMutation.mutate({
      name: parsed.data.name,
      brand_id: parsed.data.brand_id,
      category_id: parsed.data.category_id,
      image_url: parsed.data.image_url,
      datasheet_url: parsed.data.datasheet_url,
      active: parsed.data.active,
      specs: parsed.data.specs ?? {},
    });
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
          <DescriptionOutlinedIcon color="primary" />
          <Box overflow="hidden">
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
              {product?.name ? `Ficha Técnica · ${product.name}` : "Ficha Técnica do Produto"}
            </Typography>
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
          <FormProvider {...methods}>
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
              <ProductForm
                categories={categories}
                brands={brands}
                categoryName={effectiveCategoryName}
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
