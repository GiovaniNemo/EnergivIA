"use client";

import { useMemo, useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Paper,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
  Snackbar,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
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
  datasheet_url?: string;
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

  useEffect(() => {
    if (effectiveCategoryName === "inverter") methods.setValue("specs.type", "string");
    if (effectiveCategoryName === "microinverter") methods.setValue("specs.type", "micro");
  }, [effectiveCategoryName, methods]);

  const [feedback, setFeedback] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setFeedback({
        message: "Produto cadastrado com sucesso!",
        severity: "success",
      });
      setTimeout(() => {
        router.push("/admin/produtos?created=true");
      }, 700);
    },
    onError: (err: Error) => {
      setFeedback({
        message: err.message || "Falha ao cadastrar produto.",
        severity: "error",
      });
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
    const specs = parsed.data.specs ?? {};
    createMutation.mutate({
      name: parsed.data.name,
      brand_id: parsed.data.brand_id,
      category_id: parsed.data.category_id,
      image_url: parsed.data.image_url,
      datasheet_url: parsed.data.datasheet_url,
      active: parsed.data.active,
      specs,
    });
  };

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
                Novo Produto
              </Typography>
            </Breadcrumbs>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Cadastrar Novo Produto
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
          </Box>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper" }}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <ProductForm
              categories={categories}
              brands={brands}
              categoryName={effectiveCategoryName}
            />

            {/* Linha de ações no rodapé do formulário */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
              sx={{ pt: 3, mt: 3, borderTop: 1, borderColor: "divider" }}
            >
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push("/admin/produtos")}
                sx={{ textTransform: "none" }}
              >
                Voltar ao Catálogo
              </Button>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                startIcon={<SaveIcon />}
                disabled={createMutation.isPending}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  px: 4,
                  py: 1.2,
                  fontSize: "0.95rem",
                }}
              >
                {createMutation.isPending ? "Salvando..." : "Salvar Produto"}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {feedback ? (
          <Alert
            severity={feedback.severity}
            onClose={() => setFeedback(null)}
            sx={{ width: "100%", boxShadow: 3, fontWeight: 500 }}
          >
            {feedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </FormProvider>
  );
}
