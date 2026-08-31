"use client";

import { useMemo, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Button,
  Paper,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import { ProductForm } from "@/components/admin/products/ProductForm";
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

export default function EditProductPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const id = params["id"] as string | undefined;
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["admin", "product", id],
    queryFn: () => fetchProduct(id!),
    enabled: Boolean(id),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: fetchBrands,
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
    if (product) {
      methods.reset({
        name: product.name,
        brand_id: product.brandId,
        category_id: product.categoryId,
        image_url: product.imageUrl ?? "",
        datasheet_url: product.datasheetUrl ?? "",
        active: product.active,
        specs: (product.specs as Record<string, unknown>) ?? {},
      });
    }
  }, [product, methods]);

  const watchCategoryId = methods.watch("category_id");
  const effectiveCategoryName = useMemo(
    () => categoryNameFromId(watchCategoryId ?? ""),
    [watchCategoryId, categories]
  );

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateProduct>[1]) => updateProduct(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "product", id] });
      alert("Produto atualizado com sucesso!");
    },
  });

  const onSubmit = (values: FormValues) => {
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

  if (isLoading || !product) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <FormProvider {...methods}>
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Header with Navigation */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Breadcrumbs sx={{ mb: 0.5 }}>
              <MuiLink
                component="button"
                variant="body2"
                onClick={() => router.push("/admin/produtos")}
                sx={{ color: "text.secondary", textDecoration: "none", cursor: "pointer" }}
              >
                Catálogo Global
              </MuiLink>
              <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                {product.name}
              </Typography>
            </Breadcrumbs>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Editar Produto
            </Typography>
          </Box>
          <Box display="flex" gap={1.5}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push("/admin/produtos")}
              sx={{ textTransform: "none" }}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={methods.handleSubmit(onSubmit)}
              disabled={updateMutation.isPending}
              sx={{ textTransform: "none", fontWeight: 600, px: 3 }}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </Box>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper" }}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <ProductForm
              categories={categories}
              brands={brands}
              categoryName={effectiveCategoryName}
              productId={id}
            />
          </form>
        </Paper>
      </Box>
    </FormProvider>
  );
}
