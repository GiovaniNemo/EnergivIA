"use client";

import { useMemo, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { Box, Button, Paper, Typography } from "@mui/material";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { buildProductSchema, categoryNames, type CategoryName } from "@/lib/admin/schemas";
import { fetchBrands, fetchCategories, fetchProduct, updateProduct } from "@/lib/admin-api";

type FormValues = {
  name: string;
  brand_id: string;
  category_id: string;
  image_url?: string;
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
    },
  });

  const onSubmit = (values: FormValues) => {
    const schema = buildProductSchema(effectiveCategoryName);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const err = parsed.error.flatten();
      Object.entries(err.fieldErrors).forEach(([key, messages]) => {
        const msg = Array.isArray(messages) ? messages[0] : messages;
        if (msg) methods.setError(key as keyof FormValues, { message: msg });
      });
      return;
    }
    updateMutation.mutate({
      name: parsed.data.name,
      brand_id: parsed.data.brand_id,
      category_id: parsed.data.category_id,
      image_url: parsed.data.image_url,
      active: parsed.data.active,
      specs: parsed.data.specs ?? {},
    });
  };

  if (isLoading || !product) {
    return <Typography>Carregando...</Typography>;
  }

  return (
    <FormProvider {...methods}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Editar produto
        </Typography>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <ProductForm
            categories={categories}
            brands={brands}
            categoryName={effectiveCategoryName}
          />
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outlined" onClick={() => router.push("/admin/produtos")}>
              Cancelar
            </Button>
          </Box>
        </form>
      </Paper>
    </FormProvider>
  );
}
