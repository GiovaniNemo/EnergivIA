"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  OutlinedInput,
  Chip,
  Avatar,
  Typography,
  Tooltip,
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ChecklistIcon from "@mui/icons-material/Checklist";
import SearchIcon from "@mui/icons-material/Search";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import BrandingWatermarkOutlinedIcon from "@mui/icons-material/BrandingWatermarkOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandSchema, type BrandFormValues, categoryNames } from "@/lib/admin/schemas";
import { fetchBrands, createBrand, updateBrand, deleteBrand, type Brand } from "@/lib/admin-api";
import { ImageUpload } from "@/components/admin/products/ImageUpload";

const categoryLabels: Record<string, string> = {
  module: "Painéis / Módulos",
  inverter: "Inversores",
  microinverter: "Microinversores",
  structure_kit: "Estruturas",
  dc_cable: "Cabos CC",
  connector: "Conectores",
  profile: "Perfis",
  string_box: "String Box",
};

export default function AdminBrandsPage(): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: fetchBrands,
  });

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: "", country: "", image_url: "", categories: [] },
  });

  const createMutation = useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
      setDialogOpen(false);
      form.reset({ name: "", country: "", image_url: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; country?: string; image_url?: string; categories?: string[] };
    }) => updateBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
      setEditingBrand(null);
      form.reset({ name: "", country: "", image_url: "", categories: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
    onError: (err: Error) => {
      alert(err.message || "Erro ao excluir a marca. Talvez haja produtos vinculados a ela.");
    },
  });

  const [bulkLoading, setBulkLoading] = useState(false);
  const handleBulkSubmit = async () => {
    const lines = bulkInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        lines.map((name) => createBrand({ name, categories: [] }))
      );

      const failedCount = results.filter((r) => r.status === "rejected").length;

      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
      setBulkDialogOpen(false);
      setBulkInput("");

      if (failedCount > 0) {
        alert(
          `Processo concluído, mas ${failedCount} marca(s) falharam (talvez já existissem no sistema).`
        );
      }
    } catch {
      alert("Houve um erro inesperado ao importar as marcas.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingBrand(null);
    form.reset({ name: "", country: "", image_url: "", categories: [] });
    setDialogOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setEditingBrand(brand);
    form.reset({
      name: brand.name,
      country: brand.country ?? "",
      image_url: brand.imageUrl ?? "",
      categories: brand.categories ?? [],
    });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingBrand(null);
    form.reset({ name: "", country: "", image_url: "", categories: [] });
  };

  const onSubmit = (values: BrandFormValues) => {
    const normalizedImageUrl = values.image_url?.trim() ?? "";
    const payload = {
      ...values,
      country: values.country?.trim() || undefined,
      image_url: normalizedImageUrl,
      categories: values.categories || [],
    };
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const matchSearch =
        brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (brand.country && brand.country.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [brands, searchTerm]);

  // Statistics KPIs
  const stats = useMemo(() => {
    const total = brands.length;
    const withLogo = brands.filter((b) => Boolean(b.imageUrl)).length;
    const allCategories = new Set<string>();
    let totalProducts = 0;
    brands.forEach((b) => {
      (b.categories || []).forEach((c) => allCategories.add(c));
      if (b._count?.products) totalProducts += b._count.products;
    });
    return {
      total,
      withLogo,
      categoriesCount: allCategories.size,
      totalProducts,
    };
  }, [brands]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* KPI Stats Header */}
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
              <BrandingWatermarkOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Total de Marcas
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.total}
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
              <PublicOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Com Identidade / Logo
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.withLogo}{" "}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({stats.total > 0 ? Math.round((stats.withLogo / stats.total) * 100) : 0}%)
                </Typography>
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
              <CategoryOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Segmentos Cobertos
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.categoriesCount}
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
              <Inventory2OutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Produtos Vinculados
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.totalProducts}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Actions & Filters */}
      <Box
        display="flex"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        alignItems="center"
      >
        <TextField
          placeholder="Pesquisar marcas ou países..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 280, bgcolor: "background.paper" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
        <Box display="flex" gap={1.5}>
          <Button
            variant="outlined"
            startIcon={<ChecklistIcon />}
            onClick={() => setBulkDialogOpen(true)}
            size="medium"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Importar em lote
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            size="medium"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Nova marca
          </Button>
        </Box>
      </Box>

      {/* Brands Table */}
      <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Marca</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Categorias Fabricadas</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>País de Origem</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Produtos
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ py: 6, textAlign: "center", color: "text.secondary" }}
                  >
                    Carregando marcas…
                  </TableCell>
                </TableRow>
              ) : filteredBrands.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ py: 6, textAlign: "center", color: "text.secondary" }}
                  >
                    Nenhuma marca encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBrands.map((brand) => {
                  const productCount = brand._count?.products ?? 0;
                  return (
                    <TableRow
                      key={brand.id}
                      hover
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar
                            src={brand.imageUrl || undefined}
                            alt={brand.name}
                            variant="rounded"
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: "action.selected",
                              color: "text.primary",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            {brand.name.slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {brand.name}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {brand.categories && brand.categories.length > 0 ? (
                            brand.categories.map((cat) => (
                              <Chip
                                key={cat}
                                label={categoryLabels[cat] || cat}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  bgcolor: "background.default",
                                }}
                              />
                            ))
                          ) : (
                            <Typography
                              variant="body2"
                              color="text.disabled"
                              sx={{ fontStyle: "italic" }}
                            >
                              Nenhuma categoria associada
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {brand.country || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={`Ver produtos de ${brand.name} no Catálogo`}>
                          <Chip
                            label={`${productCount} produto(s)`}
                            size="small"
                            color={productCount > 0 ? "primary" : "default"}
                            variant={productCount > 0 ? "filled" : "outlined"}
                            onClick={() => router.push(`/admin/produtos?brand=${brand.id}`)}
                            deleteIcon={<ArrowForwardIcon fontSize="small" />}
                            onDelete={() => router.push(`/admin/produtos?brand=${brand.id}`)}
                            sx={{ cursor: "pointer", fontWeight: 600 }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar Marca">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(brand)}
                            aria-label="Editar"
                            sx={{ color: "text.secondary" }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir Marca">
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (
                                window.confirm(`Deseja realmente excluir a marca ${brand.name}?`)
                              ) {
                                deleteMutation.mutate(brand.id);
                              }
                            }}
                            aria-label="Excluir"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Brand Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.25rem", pb: 1 }}>
          {editingBrand ? `Editar marca: ${editingBrand.name}` : "Nova marca fotovoltaica"}
        </DialogTitle>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Box display="flex" flexDirection="column" gap={2.5}>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nome da Marca / Fabricante"
                    placeholder="Ex: Canadian Solar, Growatt, DAH Solar"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                    required
                  />
                )}
              />
              <Controller
                name="categories"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                    <InputLabel id="categories-label">Categorias Fabricadas</InputLabel>
                    <Select
                      labelId="categories-label"
                      multiple
                      value={field.value || []}
                      onChange={field.onChange}
                      input={<OutlinedInput label="Categorias Fabricadas" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={categoryLabels[value] || value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {categoryNames.map((name) => (
                        <MenuItem key={name} value={name}>
                          {categoryLabels[name] || name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
              <Controller
                name="country"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="País de Origem"
                    placeholder="Ex: China, Alemanha, Brasil, Áustria"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                  />
                )}
              />
              <Controller
                name="image_url"
                control={form.control}
                render={({ field }) => (
                  <ImageUpload
                    value={(field.value as string | undefined) ?? ""}
                    onChange={(url) => field.onChange(url)}
                    folder="brands"
                    label="Logo oficial do fabricante (PNG / SVG / JPG)"
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
            <Button onClick={handleClose} sx={{ textTransform: "none" }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
              sx={{ textTransform: "none", fontWeight: 600, px: 3 }}
            >
              {editingBrand
                ? updateMutation.isPending
                  ? "Salvando..."
                  : "Salvar Alterações"
                : createMutation.isPending
                  ? "Criando..."
                  : "Criar Marca"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.25rem" }}>
          Adicionar várias marcas de uma vez
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cole uma lista de fabricantes abaixo (uma marca por linha). Elas serão cadastradas
            automaticamente.
          </Typography>
          <TextField
            multiline
            rows={8}
            fullWidth
            placeholder={"Jinko Solar\nLongi Solar\nSolis\nHuawei\nDeye\nSungrow"}
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            disabled={bulkLoading}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
          <Button
            onClick={() => setBulkDialogOpen(false)}
            disabled={bulkLoading}
            sx={{ textTransform: "none" }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleBulkSubmit}
            variant="contained"
            disabled={bulkLoading || !bulkInput.trim()}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {bulkLoading ? "Importando..." : "Importar em Lote"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
