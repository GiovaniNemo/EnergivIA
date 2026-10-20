"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  OutlinedInput,
  Chip,
  Typography,
  CircularProgress,
} from "@mui/material";
import {
  Award,
  Sparkles,
  Globe,
  Boxes,
  Plus,
  Search,
  FileSpreadsheet,
  Trash2,
  Pencil,
  ArrowRight,
  Layers,
  X,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandSchema, type BrandFormValues, categoryNames } from "@/lib/admin/schemas";
import { fetchBrands, createBrand, updateBrand, deleteBrand, type Brand } from "@/lib/admin-api";
import { ImageUpload } from "@/components/admin/products/ImageUpload";

const categoryLabels: Record<string, string> = {
  module: "Módulos",
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
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
      form.reset({ name: "", country: "", image_url: "", categories: [] });
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

      if (!matchSearch) return false;

      if (selectedCategory !== "ALL") {
        return (brand.categories || []).includes(selectedCategory);
      }

      return true;
    });
  }, [brands, searchTerm, selectedCategory]);

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

  const isAllSelected =
    filteredBrands.length > 0 && filteredBrands.every((b) => selectedIds.includes(b.id));
  const isSomeSelected = filteredBrands.some((b) => selectedIds.includes(b.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const currentFilteredIds = new Set(filteredBrands.map((b) => b.id));
      setSelectedIds((prev) => prev.filter((id) => !currentFilteredIds.has(id)));
    } else {
      const allFilteredIds = filteredBrands.map((b) => b.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(selectedIds.map((id) => deleteBrand(id)));
      const succeededCount = results.filter((r) => r.status === "fulfilled").length;
      const failedCount = results.filter((r) => r.status === "rejected").length;

      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
      setSelectedIds([]);
      setDeleteConfirmOpen(false);

      if (failedCount === 0) {
        alert(`${succeededCount} marca(s) excluída(s) com sucesso!`);
      } else if (succeededCount === 0) {
        alert(
          `Nenhuma das ${failedCount} marca(s) selecionada(s) pôde ser excluída, pois possuem produtos cadastrados no catálogo.`
        );
      } else {
        alert(
          `${succeededCount} marca(s) excluída(s) com sucesso. ${failedCount} marca(s) não puderam ser excluídas pois possuem produtos vinculados no catálogo.`
        );
      }
    } catch {
      alert("Houve um erro inesperado ao excluir as marcas selecionadas.");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats Header */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Total de Fabricantes
            </p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Com Identidade / Logo
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats.withLogo}</span>
              <span className="text-xs text-zinc-400">
                ({stats.total > 0 ? Math.round((stats.withLogo / stats.total) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Segmentos Cobertos
            </p>
            <p className="text-2xl font-bold text-white">{stats.categoriesCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Produtos Vinculados
            </p>
            <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
          </div>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Pesquisar marcas ou países de origem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 transition-colors focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm text-zinc-300 focus:border-emerald-500/60 focus:outline-none"
          >
            <option value="ALL">Todas as Categorias</option>
            {categoryNames.map((name) => (
              <option key={name} value={name}>
                {categoryLabels[name] || name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBulkDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
            <span>Importar em lote</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-950 transition-all hover:bg-emerald-500 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Marca</span>
          </button>
        </div>
      </div>

      {/* Barra de Ações em Massa */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-emerald-300">
              {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "marca selecionada" : "marcas selecionadas"}
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline"
            >
              Desmarcar todas
            </button>
          </div>

          <button
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={bulkDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Excluir selecionadas ({selectedIds.length})</span>
          </button>
        </div>
      )}

      {/* Brands Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="w-12 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    aria-label="Selecionar todas as marcas"
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                  />
                </th>
                <th className="px-4 py-3.5 font-semibold">Marca / Fabricante</th>
                <th className="px-4 py-3.5 font-semibold">Categorias Atendidas</th>
                <th className="px-4 py-3.5 font-semibold">Origem</th>
                <th className="px-4 py-3.5 text-center font-semibold">Catálogo</th>
                <th className="px-4 py-3.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <CircularProgress size={24} className="mb-2 text-emerald-400" />
                    <p>Carregando marcas cadastradas...</p>
                  </td>
                </tr>
              ) : filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Award className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                    <p className="font-medium text-white">Nenhuma marca encontrada</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Tente ajustar seus termos de busca ou filtros.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => {
                  const productCount = brand._count?.products ?? 0;
                  const isRowSelected = selectedIds.includes(brand.id);

                  return (
                    <tr
                      key={brand.id}
                      className={`group transition-colors ${
                        isRowSelected ? "bg-emerald-500/[0.08]" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => handleToggleSelectRow(brand.id)}
                          aria-label={`Selecionar marca ${brand.name}`}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-700/60 bg-zinc-900 p-1">
                            {brand.imageUrl ? (
                              <img
                                src={brand.imageUrl}
                                alt={brand.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="text-xs font-bold text-zinc-400 uppercase">
                                {brand.name.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                              {brand.name}
                            </p>
                            {brand.country && (
                              <p className="text-xs text-zinc-500 flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                <span>{brand.country}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {brand.categories && brand.categories.length > 0 ? (
                            brand.categories.map((cat) => (
                              <span
                                key={cat}
                                className="inline-flex items-center rounded-md border border-zinc-700/60 bg-zinc-800/80 px-2 py-0.5 text-xs font-medium text-zinc-300"
                              >
                                {categoryLabels[cat] || cat}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs italic text-zinc-500">
                              Sem categorias vinculadas
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-zinc-300">{brand.country || "—"}</td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => router.push(`/admin/produtos?brand=${brand.id}`)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                            productCount > 0
                              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          }`}
                        >
                          <span>
                            {productCount} {productCount === 1 ? "item" : "itens"}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(brand)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                            title="Editar Marca"
                            aria-label={`Editar marca ${brand.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(`Deseja realmente excluir a marca ${brand.name}?`)
                              ) {
                                deleteMutation.mutate(brand.id);
                              }
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
                            title="Excluir Marca"
                            aria-label={`Excluir marca ${brand.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brand Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: "1.25rem",
            pb: 1,
            bgcolor: "background.paper",
            color: "text.primary",
          }}
        >
          {editingBrand ? `Editar marca: ${editingBrand.name}` : "Nova marca fotovoltaica"}
        </DialogTitle>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogContent sx={{ pt: 1, bgcolor: "background.paper" }}>
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
          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, bgcolor: "background.paper" }}>
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
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: "1.25rem",
            bgcolor: "background.paper",
            color: "text.primary",
          }}
        >
          Adicionar várias marcas de uma vez
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "background.paper" }}>
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
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, bgcolor: "background.paper" }}>
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

      {/* Dialog de Confirmação de Exclusão em Massa */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !bulkDeleting && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: "1.15rem",
            bgcolor: "background.paper",
            color: "text.primary",
          }}
        >
          Excluir {selectedIds.length} {selectedIds.length === 1 ? "marca" : "marcas"}?
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "background.paper" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Tem certeza que deseja excluir as {selectedIds.length} marcas selecionadas? Esta ação
            não pode ser desfeita.
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
            * Por segurança do catálogo, marcas com produtos vinculados não serão removidas.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "background.paper" }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={bulkDeleting}
            sx={{ textTransform: "none" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            startIcon={
              bulkDeleting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )
            }
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {bulkDeleting ? "Excluindo..." : "Sim, excluir marcas"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
