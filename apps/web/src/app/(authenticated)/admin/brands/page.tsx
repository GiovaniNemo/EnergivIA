"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ChecklistIcon from "@mui/icons-material/Checklist";
import SearchIcon from "@mui/icons-material/Search";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandSchema, type BrandFormValues, categoryNames } from "@/lib/admin/schemas";
import { fetchBrands, createBrand, updateBrand, deleteBrand, type Brand } from "@/lib/admin-api";
import { ImageUpload } from "@/components/admin/products/ImageUpload";

const categoryLabels: Record<string, string> = {
  module: "Painéis/Módulos",
  inverter: "Inversores",
  microinverter: "Microinversores",
  structure_kit: "Estruturas",
  dc_cable: "Cabos DC",
  connector: "Conectores",
};

export default function AdminBrandsPage(): JSX.Element {
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
      await Promise.all(
        lines.map((name) => createBrand({ name, country: "", image_url: "", categories: [] }))
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
      setBulkDialogOpen(false);
      setBulkInput("");
    } catch {
      alert("Houve um erro ao importar algumas marcas.");
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

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
        <TextField
          placeholder="Pesquisar marcas..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 250, bgcolor: "background.paper" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<ChecklistIcon />}
            onClick={() => setBulkDialogOpen(true)}
            size="medium"
          >
            Adicionar várias
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            size="medium"
          >
            Nova marca
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Categorias</TableCell>
                <TableCell>País</TableCell>
                <TableCell align="right">Produtos</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ py: 4, textAlign: "center", color: "text.secondary" }}
                  >
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : filteredBrands.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ py: 4, textAlign: "center", color: "text.secondary" }}
                  >
                    Nenhuma marca encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>{brand.name}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {brand.categories && brand.categories.length > 0 ? (
                          brand.categories.map((cat) => (
                            <Chip
                              key={cat}
                              label={categoryLabels[cat] || cat}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.75rem" }}
                            />
                          ))
                        ) : (
                          <span style={{ color: "#aaa" }}>—</span>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{brand.country ?? "—"}</TableCell>
                    <TableCell align="right">
                      {"_count" in brand &&
                      typeof (brand as Brand & { _count?: { products: number } })._count
                        ?.products === "number"
                        ? (brand as Brand & { _count: { products: number } })._count.products
                        : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(brand)}
                        aria-label="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (window.confirm(`Deseja realmente excluir a marca ${brand.name}?`)) {
                            deleteMutation.mutate(brand.id);
                          }
                        }}
                        aria-label="Excluir"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, fontSize: "1.25rem" }}>
          {editingBrand ? "Editar marca" : "Nova marca"}
        </DialogTitle>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nome"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
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
                          {categoryLabels[name]}
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
                    label="País"
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
                    label="Logo da marca"
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingBrand ? "Salvar" : "Criar"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "1.25rem" }}>
          Adicionar várias marcas
        </DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <TextField
              multiline
              rows={10}
              fullWidth
              placeholder="Digite ou cole os nomes das marcas, um por linha..."
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              disabled={bulkLoading}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setBulkDialogOpen(false)} disabled={bulkLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleBulkSubmit}
            variant="contained"
            disabled={bulkLoading || !bulkInput.trim()}
          >
            {bulkLoading ? "Salvando..." : "Adicionar em lote"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
