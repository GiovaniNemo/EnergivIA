"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
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
  Grid,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BrandingWatermarkOutlinedIcon from "@mui/icons-material/BrandingWatermarkOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import {
  fetchProducts,
  fetchBrands,
  fetchCategories,
  updateProduct,
  deleteProduct,
  type Product,
  type QueryProductsParams,
} from "@/lib/admin-api";

const CATEGORY_LABELS: Record<string, string> = {
  connector: "Conector",
  dc_cable: "Cabo CC",
  inverter: "Inversor",
  microinverter: "Microinversor",
  module: "Módulo",
  structure_kit: "Estrutura",
  profile: "Perfil",
  string_box: "String Box",
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

function getProductPowerBadge(product: Product): string | null {
  const specs = product.specs as Record<string, unknown> | undefined;
  if (!specs) return null;
  const cat = product.category?.name;
  if (cat === "module" && specs["power_w"]) {
    return `${specs["power_w"]} Wp`;
  }
  if (cat === "inverter" && specs["nominal_power_w"]) {
    const kw = Number(specs["nominal_power_w"]) / 1000;
    return `${kw} kW`;
  }
  if (cat === "microinverter" && specs["max_module_power"]) {
    return `${specs["max_module_power"]} W`;
  }
  return null;
}

export default function AdminProductsPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBrand = searchParams?.get("brand") ?? undefined;
  const initialCategory = searchParams?.get("category") ?? undefined;
  const queryClient = useQueryClient();

  const [params, setParams] = useState<QueryProductsParams>({
    page: 1,
    pageSize: 25,
    brand: initialBrand,
    category: initialCategory,
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

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  const columns: GridColDef<Product>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Nome do Produto",
        flex: 1,
        minWidth: 260,
        renderCell: (cellParams: GridRenderCellParams<Product>) => {
          const imageSrc = cellParams.row.imageUrl ?? cellParams.row.brand?.imageUrl ?? undefined;
          const powerBadge = getProductPowerBadge(cellParams.row);

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
              <Avatar
                src={imageSrc}
                alt={cellParams.row.name}
                variant="rounded"
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  bgcolor: "action.selected",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {cellParams.row.name.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ overflow: "hidden" }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "text.primary" }}
                    noWrap
                  >
                    {cellParams.row.name}
                  </Typography>
                  {powerBadge && (
                    <Chip
                      icon={<BoltIcon sx={{ fontSize: "0.9rem !important" }} />}
                      label={powerBadge}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {cellParams.row.brand?.name ?? "Marca não informada"}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "category",
        headerName: "Categoria",
        width: 150,
        renderCell: (cellParams: GridRenderCellParams<Product>) => (
          <Chip
            label={formatCategoryLabel(cellParams.row.category?.name)}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
        ),
      },
      {
        field: "active",
        headerName: "Status",
        width: 110,
        renderCell: (cellParams: GridRenderCellParams<Product, boolean>) =>
          cellParams.value ? (
            <Chip label="Ativo" size="small" color="success" sx={{ fontWeight: 600 }} />
          ) : (
            <Chip label="Inativo" size="small" variant="outlined" sx={{ color: "text.disabled" }} />
          ),
      },
      {
        field: "actions",
        headerName: "Ações",
        width: 130,
        sortable: false,
        renderCell: (cellParams: GridRenderCellParams<Product>) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Editar Produto">
              <IconButton
                size="small"
                onClick={() => router.push(`/admin/produtos/${cellParams.row.id}`)}
                aria-label="Editar"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {cellParams.row.active ? (
              <Tooltip title="Desativar">
                <IconButton
                  size="small"
                  onClick={() => deactivateMutation.mutate({ id: cellParams.row.id })}
                  aria-label="Desativar"
                >
                  <VisibilityOffIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            <Tooltip title="Excluir">
              <IconButton
                size="small"
                onClick={() => {
                  if (
                    window.confirm(`Deseja realmente excluir o produto "${cellParams.row.name}"?`)
                  ) {
                    deleteMutation.mutate({ id: cellParams.row.id });
                  }
                }}
                color="error"
                aria-label="Excluir"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [router, deactivateMutation, deleteMutation]
  );

  const handleFilterApply = () => {
    setParams((prev) => ({
      ...prev,
      search: searchInput.trim() || undefined,
      page: 1,
    }));
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setParams((prev) => {
        const newSearch = searchInput.trim() || undefined;
        if (prev.search === newSearch) return prev;
        return {
          ...prev,
          search: newSearch,
          page: 1,
        };
      });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* KPI Stats */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Avatar sx={{ bgcolor: "primary.main", color: "#fff", width: 44, height: 44 }}>
              <Inventory2OutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Total de Produtos
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {productsData?.total ?? 0}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Avatar sx={{ bgcolor: "success.main", color: "#fff", width: 44, height: 44 }}>
              <CheckCircleOutlineIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Disponíveis no Catálogo
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {productsData?.data?.filter((p) => p.active).length ?? 0}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Avatar sx={{ bgcolor: "info.main", color: "#fff", width: 44, height: 44 }}>
              <BrandingWatermarkOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Marcas Parceiras
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {brands.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Avatar sx={{ bgcolor: "warning.main", color: "#fff", width: 44, height: 44 }}>
              <CategoryOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Segmentos & Tipos
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {categories.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {isError && (
        <Alert severity="error" variant="filled">
          Não foi possível carregar os produtos. Verifique se a API está rodando.{" "}
          {error instanceof Error ? error.message : ""}
        </Alert>
      )}

      {/* Filter Bar & DataGrid */}
      <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
        <Box
          display="flex"
          flexWrap="wrap"
          gap={2}
          alignItems="center"
          sx={{ p: 2, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
        >
          <TextField
            size="small"
            placeholder="Buscar por nome do produto..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFilterApply()}
            sx={{ minWidth: 240 }}
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
            <MenuItem value="">Todas as Categorias</MenuItem>
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
            <MenuItem value="">Todas as Marcas</MenuItem>
            {brands.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.name}
              </MenuItem>
            ))}
          </TextField>
          {(params.category || params.brand || searchInput) && (
            <Button
              variant="text"
              onClick={() => {
                setSearchInput("");
                setParams({ page: 1, pageSize: 25 });
              }}
              sx={{ textTransform: "none" }}
            >
              Limpar Filtros
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push("/admin/produtos/new")}
            sx={{ ml: "auto", textTransform: "none", fontWeight: 600 }}
          >
            Novo Produto
          </Button>
        </Box>

        <Box
          sx={{
            height: 540,
            width: "100%",
            minHeight: 400,
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-columnHeaders": (theme) => ({
              backgroundColor: alpha(theme.palette.action.hover, 0.6),
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
            onRowDoubleClick={(rowParams) => router.push(`/admin/produtos/${rowParams.row.id}`)}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
            localeText={{
              noRowsLabel: "Nenhum produto cadastrado.",
              noResultsOverlayLabel: "Nenhum resultado encontrado.",
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
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Nenhum produto cadastrado
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Cadastre novos produtos no Catálogo Global com ficha técnica e inteligência
                      artificial.
                    </Typography>
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<AddIcon />}
                      onClick={() => router.push("/admin/produtos/new")}
                      sx={{ mt: 2, textTransform: "none" }}
                    >
                      Cadastrar Primeiro Produto
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
