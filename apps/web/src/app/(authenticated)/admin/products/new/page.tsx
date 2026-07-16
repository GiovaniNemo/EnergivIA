"use client";

import { useMemo, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Box, Button, Paper, Typography } from "@mui/material";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { buildProductSchema, categoryNames, type CategoryName } from "@/lib/admin/schemas";
import { fetchBrands, fetchCategories, createProduct } from "@/lib/admin-api";

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
  active: boolean;
  specs: Record<string, unknown>;
};

export default function NewProductPage(): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: fetchBrands,
  });

  const categoryNameFromId = (id: string): CategoryName | null => {
    const cat = categories.find((c) => c.id === id);
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

  const watchCategoryId = methods.watch("category_id");
  const effectiveCategoryName = useMemo(
    () => categoryNameFromId(watchCategoryId ?? ""),
    [watchCategoryId, categories]
  );

  useEffect(() => {
    if (effectiveCategoryName === "inverter") methods.setValue("specs.type", "string");
    if (effectiveCategoryName === "microinverter") methods.setValue("specs.type", "micro");
  }, [effectiveCategoryName, methods]);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      router.push("/admin/produtos");
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
      if (err.formErrors[0]) methods.setError("root", { message: err.formErrors[0] });
      return;
    }
    let specs = parsed.data.specs ?? {};
    if (effectiveCategoryName && defaultSpecsByCategory[effectiveCategoryName]) {
      specs = { ...defaultSpecsByCategory[effectiveCategoryName], ...specs };
    }
    createMutation.mutate({
      name: parsed.data.name,
      brand_id: parsed.data.brand_id,
      category_id: parsed.data.category_id,
      image_url: parsed.data.image_url,
      active: parsed.data.active,
      specs,
    });
  };

  return (
    <FormProvider {...methods}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Novo produto
        </Typography>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <ProductForm
            categories={categories}
            brands={brands}
            categoryName={effectiveCategoryName}
          />
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Criar produto"}
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
