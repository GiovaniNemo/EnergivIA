"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Typography,
  Paper,
  Avatar,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import {
  fetchProducts,
  fetchBrands,
  fetchCategories,
  updateProduct,
  type Product,
  type QueryProductsParams,
} from "@/lib/admin-api";

const CATEGORY_LABELS: Record<string, string> = {
  connector: "Conector",
  dc_cable: "Cabo CC",
  inverter: "Inversor",
  microinverter: "Microinversor",
  module: "Módulo",
};

function formatCategoryLabel(value?: string): string {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  if (CATEGORY_LABELS[normalized]) return CATEGORY_LABELS[normalized];
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminProductsPage(): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<QueryProductsParams>({
    page: 1,
    pageSize: 25,
  });
  const [searchInput, setSearchInput] = useState("");

  const {
    data: productsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "products", params],
    queryFn: () => fetchProducts(params),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: fetchBrands,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => updateProduct(id, { active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  const columns: GridColDef<Product>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Nome",
        flex: 1,
        minWidth: 220,
        renderCell: (cellParams: GridRenderCellParams<Product>) => {
          const imageSrc = cellParams.row.imageUrl ?? cellParams.row.brand?.imageUrl ?? undefined;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar
                src={imageSrc}
                alt={cellParams.row.name}
                variant="rounded"
                sx={{ width: 28, height: 28, fontSize: "0.75rem" }}
              >
                {cellParams.row.name.slice(0, 1).toUpperCase()}
              </Avatar>
              <Typography variant="body2">{cellParams.row.name}</Typography>
            </Box>
          );
        },
      },
      {
        field: "brand",
        headerName: "Marca",
        width: 140,
        valueGetter: (_, row) => row.brand?.name ?? "",
      },
      {
        field: "category",
        headerName: "Categoria",
        width: 130,
        valueGetter: (_, row) => formatCategoryLabel(row.category?.name),
      },
      {
        field: "active",
        headerName: "Status",
        width: 100,
        renderCell: (cellParams: GridRenderCellParams<Product, boolean>) =>
          cellParams.value ? (
            <Chip label="Ativo" size="small" color="success" variant="outlined" />
          ) : (
            <Chip label="Inativo" size="small" variant="outlined" />
          ),
      },
      {
        field: "actions",
        headerName: "Ações",
        width: 120,
        sortable: false,
        renderCell: (cellParams: GridRenderCellParams<Product>) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => router.push(`/admin/produtos/${cellParams.row.id}`)}
              aria-label="Editar"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            {cellParams.row.active && (
              <IconButton
                size="small"
                onClick={() => deactivateMutation.mutate({ id: cellParams.row.id })}
                aria-label="Desativar"
              >
                <VisibilityOffIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ),
      },
    ],
    [router]
  );

  const handleFilterApply = () => {
    setParams((prev) => ({
      ...prev,
      search: searchInput.trim() || undefined,
      page: 1,
    }));
  };

  return (
    <Box>
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }} variant="filled">
          Não foi possível carregar os produtos. Verifique se a API está rodando em{" "}
          {process.env["NEXT_PUBLIC_API_URL"] ?? "/api"}.{" "}
          {error instanceof Error ? error.message : ""}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box
          display="flex"
          flexWrap="wrap"
          gap={2}
          alignItems="center"
          sx={{ p: 2, borderBottom: 1, borderColor: "divider", bgcolor: "var(--color-card)" }}
        >
          <TextField
            size="small"
            placeholder="Buscar por nome"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFilterApply()}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            size="small"
            label="Categoria"
            value={params.category ?? ""}
            onChange={(e) =>
              setParams((prev) => ({ ...prev, category: e.target.value || undefined, page: 1 }))
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.name}>
                {formatCategoryLabel(c.name)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Marca"
            value={params.brand ?? ""}
            onChange={(e) =>
              setParams((prev) => ({ ...prev, brand: e.target.value || undefined, page: 1 }))
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {brands.map((b) => (
              <MenuItem key={b.id} value={b.name}>
                {b.name}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" onClick={handleFilterApply}>
            Filtrar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push("/admin/produtos/new")}
            sx={{ ml: "auto" }}
          >
            Novo produto
          </Button>
        </Box>

        <Box
          sx={{
            height: 520,
            width: "100%",
            minHeight: 400,
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-columnHeaders": (theme) => ({
              backgroundColor: "var(--color-card)",
              borderBottom: `1px solid ${theme.palette.divider}`,
            }),
            "& .MuiDataGrid-columnHeaderTitle": (theme) => ({
              fontWeight: 600,
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: theme.palette.text.secondary,
            }),
            "& .MuiDataGrid-row:hover": {
              backgroundColor: alpha("#0d9488", 0.08),
            },
            "& .MuiDataGrid-cell": (theme) => ({
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            }),
          }}
        >
          <DataGrid
            rows={productsData?.data ?? []}
            columns={columns}
            loading={isLoading}
            rowCount={productsData?.total ?? 0}
            paginationMode="server"
            paginationModel={{
              page: (params.page ?? 1) - 1,
              pageSize: params.pageSize ?? 25,
            }}
            onPaginationModelChange={(model) =>
              setParams((prev) => ({
                ...prev,
                page: model.page + 1,
                pageSize: model.pageSize,
              }))
            }
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
            localeText={{
              noRowsLabel: "Nenhum produto cadastrado.",
              noResultsOverlayLabel: "Nenhum resultado.",
            }}
            slots={{
              noRowsOverlay: () =>
                !isLoading && (productsData?.data?.length ?? 0) === 0 ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      gap: 1,
                      color: "text.secondary",
                    }}
                  >
                    <Inventory2OutlinedIcon
                      sx={{ fontSize: 48, color: "action.disabled", mb: 0.5 }}
                    />
                    <Typography variant="body1">Nenhum produto cadastrado</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Use o botão &quot;Novo produto&quot; para cadastrar ou rode o seed da API.
                    </Typography>
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<AddIcon />}
                      onClick={() => router.push("/admin/produtos/new")}
                      sx={{ mt: 2 }}
                    >
                      Criar primeiro produto
                    </Button>
                  </Box>
                ) : null,
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
