"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Stack,
  Menu,
  FormControlLabel,
  Checkbox,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SearchIcon from "@mui/icons-material/Search";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import {
  fetchDistributor,
  fetchDistributorProducts,
  fetchCategories,
  fetchProducts,
  addDistributorProduct,
  updateDistributorProduct,
  deleteDistributorProduct,
  bulkUpsertDistributorProducts,
  type DistributorProduct,
} from "@/lib/admin-api";
import { parseBulkInventoryCSV } from "@/lib/csv-parse";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { distributorProductSchema, type DistributorProductFormValues } from "@/lib/admin/schemas";

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

const COLUMN_PREFS_KEY = "energivia.admin.distributor-products.columns";

type OptionalColumnId = "sku" | "leadTime" | "moq" | "bestPrice" | "lastUpdate";

const DEFAULT_OPTIONAL_COLUMNS: Record<OptionalColumnId, boolean> = {
  sku: true,
  leadTime: false,
  moq: false,
  bestPrice: true,
  lastUpdate: false,
};

function loadOptionalColumns(): Record<OptionalColumnId, boolean> {
  if (typeof window === "undefined") return DEFAULT_OPTIONAL_COLUMNS;
  try {
    const raw = window.localStorage.getItem(COLUMN_PREFS_KEY);
    if (!raw) return DEFAULT_OPTIONAL_COLUMNS;
    const parsed = JSON.parse(raw) as Partial<Record<OptionalColumnId, boolean>>;
    return { ...DEFAULT_OPTIONAL_COLUMNS, ...parsed };
  } catch {
    return DEFAULT_OPTIONAL_COLUMNS;
  }
}

function EmptyCell(): JSX.Element {
  return (
    <Typography component="span" variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
      —
    </Typography>
  );
}

const defaultFormValues: DistributorProductFormValues = {
  product_id: "",
  distributor_sku: "",
  price: 0,
  stock_quantity: 0,
  lead_time_days: undefined,
  minimum_order_quantity: 1,
};

export default function DistributorInventoryPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = useMemo(() => params["id"] as string, [params]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [optionalColumns, setOptionalColumns] =
    useState<Record<OptionalColumnId, boolean>>(DEFAULT_OPTIONAL_COLUMNS);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [categoryId, setCategoryId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DistributorProduct | null>(null);
  const [inlinePrice, setInlinePrice] = useState<{ id: string; value: string } | null>(null);
  const [inlineStock, setInlineStock] = useState<{ id: string; value: string } | null>(null);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    updated: number;
    skipped: { index: number; reason: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setOptionalColumns(loadOptionalColumns());
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const persistOptionalColumns = (next: Record<OptionalColumnId, boolean>) => {
    setOptionalColumns(next);
    try {
      window.localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(next));
    } catch {}
  };

  const toggleOptionalColumn = (id: OptionalColumnId, checked: boolean) => {
    persistOptionalColumns({ ...optionalColumns, [id]: checked });
  };

  const visibleColCount = useMemo(
    () =>
      6 +
      (optionalColumns.sku ? 1 : 0) +
      (optionalColumns.leadTime ? 1 : 0) +
      (optionalColumns.moq ? 1 : 0) +
      (optionalColumns.bestPrice ? 1 : 0) +
      (optionalColumns.lastUpdate ? 1 : 0),
    [optionalColumns]
  );

  const limit = 50;

  const { data: distributor, isLoading: loadingDist } = useQuery({
    queryKey: ["admin", "distributors", id],
    queryFn: () => fetchDistributor(id),
    enabled: Boolean(id),
  });

  const { data: inventory, isLoading: loadingInv } = useQuery({
    queryKey: ["admin", "distributors", id, "products", page, debouncedSearch, categoryId],
    queryFn: () =>
      fetchDistributorProducts(id, {
        page,
        limit,
        search: debouncedSearch || undefined,
        category_id: categoryId || undefined,
      }),
    enabled: Boolean(id),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
  });

  const { data: productsData } = useQuery({
    queryKey: ["admin", "products", "all"],
    queryFn: () => fetchProducts({ pageSize: 500 }),
    enabled: modalOpen,
  });

  const products = productsData?.data ?? [];

  const addMutation = useMutation({
    mutationFn: (values: DistributorProductFormValues) =>
      addDistributorProduct(id, {
        product_id: values.product_id,
        distributor_sku: values.distributor_sku || undefined,
        price: values.price,
        stock_quantity: values.stock_quantity,
        lead_time_days: values.lead_time_days,
        minimum_order_quantity: values.minimum_order_quantity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      dpId,
      data,
    }: {
      dpId: string;
      data: {
        price?: number;
        stock_quantity?: number;
        distributor_sku?: string;
        lead_time_days?: number;
        minimum_order_quantity?: number;
      };
    }) => updateDistributorProduct(dpId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
      setEditingRow(null);
      setInlinePrice(null);
      setInlineStock(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDistributorProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (rows: Parameters<typeof bulkUpsertDistributorProducts>[1]) =>
      bulkUpsertDistributorProducts(id, rows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
      setBulkResult(result);
    },
  });

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = parseBulkInventoryCSV(text);
      if (rows.length === 0) {
        setBulkResult({
          created: 0,
          updated: 0,
          skipped: [{ index: 0, reason: "Nenhuma linha válida no CSV." }],
        });
        return;
      }
      bulkMutation.mutate(rows);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const form = useForm<DistributorProductFormValues>({
    resolver: zodResolver(distributorProductSchema),
    defaultValues: defaultFormValues,
  });

  const openAddModal = () => {
    form.reset(defaultFormValues);
    setModalOpen(true);
  };

  const saveInlinePrice = (dp: DistributorProduct) => {
    if (inlinePrice?.id === dp.id) {
      const num = Number(inlinePrice.value);
      if (!Number.isNaN(num) && num >= 0) {
        updateMutation.mutate({ dpId: dp.id, data: { price: num } });
      }
      setInlinePrice(null);
    }
    if (inlineStock?.id === dp.id) {
      const num = Number(inlineStock.value);
      if (!Number.isNaN(num) && num >= 0) {
        updateMutation.mutate({ dpId: dp.id, data: { stock_quantity: Math.floor(num) } });
      }
      setInlineStock(null);
    }
  };

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  if (!id) return <Box />;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2} sx={{ py: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => router.push("/admin/distribuidores")}
          aria-label="Voltar"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h2" sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
          Estoque · {distributor?.name ?? "…"}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack
          spacing={1}
          sx={{ p: 2, borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}
        >
          <Stack
            direction={{ xs: "column", lg: "row" }}
            flexWrap="wrap"
            alignItems={{ xs: "stretch", lg: "center" }}
            gap={2}
          >
            <TextField
              size="small"
              placeholder="Buscar por nome do produto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 220, flex: { lg: "1 1 240px" } }}
            />
            <TextField
              select
              size="small"
              label="Tipo de produto"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 180, width: { xs: "100%", sm: "auto" } }}
            >
              <MenuItem value="">Todos</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {formatCategoryLabel(c.name)}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Tooltip title="Escolher colunas da tabela">
                <IconButton
                  onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                  aria-label="Colunas visíveis"
                  size="small"
                  sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}
                >
                  <ViewColumnIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={bulkMutation.isPending}
              >
                Importar CSV
              </Button>
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleCSVUpload}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openAddModal}
              sx={{ width: { xs: "100%", lg: "auto" }, ml: { lg: "auto" } }}
            >
              Adicionar produto
            </Button>
          </Stack>
          {!loadingInv && inventory ? (
            <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0 }}>
              {inventory.data.length === 0
                ? debouncedSearch || categoryId
                  ? "Nenhum resultado com os filtros atuais."
                  : "Nenhum produto neste distribuidor."
                : `Mostrando ${inventory.data.length} de ${inventory.total} produto${inventory.total === 1 ? "" : "s"} nesta página.`}
            </Typography>
          ) : null}
        </Stack>

        <Menu
          anchorEl={columnMenuAnchor}
          open={Boolean(columnMenuAnchor)}
          onClose={() => setColumnMenuAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Box sx={{ px: 2, py: 1, maxWidth: 280 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Colunas opcionais
            </Typography>
            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={optionalColumns.sku}
                    onChange={(_, c) => toggleOptionalColumn("sku", c)}
                  />
                }
                label="SKU do distribuidor"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={optionalColumns.leadTime}
                    onChange={(_, c) => toggleOptionalColumn("leadTime", c)}
                  />
                }
                label="Lead time (dias)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={optionalColumns.moq}
                    onChange={(_, c) => toggleOptionalColumn("moq", c)}
                  />
                }
                label="MOQ"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={optionalColumns.bestPrice}
                    onChange={(_, c) => toggleOptionalColumn("bestPrice", c)}
                  />
                }
                label="Melhor preço"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={optionalColumns.lastUpdate}
                    onChange={(_, c) => toggleOptionalColumn("lastUpdate", c)}
                  />
                }
                label="Última atualização"
              />
            </Stack>
          </Box>
        </Menu>

        <TableContainer
          sx={{ overflowX: "auto", maxHeight: { xs: "none", md: "min(70vh, 720px)" } }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell>Marca</TableCell>
                <TableCell>Tipo</TableCell>
                {optionalColumns.sku ? <TableCell>SKU distrib.</TableCell> : null}
                <TableCell align="right">Preço</TableCell>
                <TableCell align="right">Estoque</TableCell>
                {optionalColumns.leadTime ? (
                  <TableCell align="right">Lead time (d)</TableCell>
                ) : null}
                {optionalColumns.moq ? <TableCell align="right">MOQ</TableCell> : null}
                {optionalColumns.bestPrice ? <TableCell>Melhor preço</TableCell> : null}
                {optionalColumns.lastUpdate ? <TableCell>Últ. atualização</TableCell> : null}
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingDist || loadingInv ? (
                <TableRow>
                  <TableCell colSpan={visibleColCount}>Carregando...</TableCell>
                </TableRow>
              ) : !inventory?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={visibleColCount}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      {debouncedSearch || categoryId
                        ? "Nenhum produto corresponde à busca ou ao tipo selecionado."
                        : 'Nenhum produto neste distribuidor. Use "Adicionar produto" para começar.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                inventory.data.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ "&:last-child td, &:last-child th": { borderBottom: 0 } }}
                  >
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Avatar
                          src={row.product.imageUrl ?? row.product.brand.imageUrl ?? undefined}
                          alt={row.product.name}
                          variant="rounded"
                          sx={{ width: 28, height: 28, fontSize: "0.75rem", flexShrink: 0 }}
                        >
                          {row.product.name.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Tooltip title={row.product.name} placement="top-start">
                          <Typography variant="body2" noWrap>
                            {row.product.name}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>{row.product.brand.name}</TableCell>
                    <TableCell>{formatCategoryLabel(row.product.category.name)}</TableCell>
                    {optionalColumns.sku ? (
                      <TableCell>
                        {row.distributorSku ? row.distributorSku : <EmptyCell />}
                      </TableCell>
                    ) : null}
                    <TableCell align="right">
                      {inlinePrice?.id === row.id ? (
                        <TextField
                          size="small"
                          type="number"
                          value={inlinePrice.value}
                          onChange={(e) => setInlinePrice({ id: row.id, value: e.target.value })}
                          onBlur={() => saveInlinePrice(row)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlinePrice(row)}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 100 }}
                          autoFocus
                        />
                      ) : (
                        <Box
                          component="span"
                          onClick={() => setInlinePrice({ id: row.id, value: String(row.price) })}
                          sx={{ cursor: "pointer", textDecoration: "underline" }}
                        >
                          {formatCurrency(row.price)}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {inlineStock?.id === row.id ? (
                        <TextField
                          size="small"
                          type="number"
                          value={inlineStock.value}
                          onChange={(e) => setInlineStock({ id: row.id, value: e.target.value })}
                          onBlur={() => saveInlinePrice(row)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlinePrice(row)}
                          inputProps={{ min: 0, step: 1 }}
                          sx={{ width: 80 }}
                          autoFocus
                        />
                      ) : (
                        <Box
                          component="span"
                          onClick={() =>
                            setInlineStock({ id: row.id, value: String(row.stockQuantity) })
                          }
                          sx={{ cursor: "pointer", textDecoration: "underline" }}
                        >
                          {row.stockQuantity}
                        </Box>
                      )}
                    </TableCell>
                    {optionalColumns.leadTime ? (
                      <TableCell align="right">
                        {row.leadTimeDays != null ? row.leadTimeDays : <EmptyCell />}
                      </TableCell>
                    ) : null}
                    {optionalColumns.moq ? (
                      <TableCell align="right">{row.minimumOrderQuantity}</TableCell>
                    ) : null}
                    {optionalColumns.bestPrice ? (
                      <TableCell>
                        {row.isCheapestOffer ? (
                          <Chip label="Sim" size="small" color="success" variant="outlined" />
                        ) : (
                          <Chip
                            label="Não"
                            size="small"
                            variant="outlined"
                            sx={{ color: "text.secondary", borderColor: "divider" }}
                          />
                        )}
                      </TableCell>
                    ) : null}
                    {optionalColumns.lastUpdate ? (
                      <TableCell>
                        {row.lastPriceUpdate || row.updatedAt ? (
                          formatDate(row.lastPriceUpdate ?? row.updatedAt)
                        ) : (
                          <EmptyCell />
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell align="right">
                      <Tooltip title="Editar oferta">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingRow(row);
                            form.reset({
                              product_id: row.product.id,
                              distributor_sku: row.distributorSku ?? "",
                              price: row.price,
                              stock_quantity: row.stockQuantity,
                              lead_time_days: row.leadTimeDays ?? undefined,
                              minimum_order_quantity: row.minimumOrderQuantity,
                            });
                          }}
                          aria-label="Editar"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remover do distribuidor">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (window.confirm("Remover este produto do distribuidor?")) {
                              deleteMutation.mutate(row.id);
                            }
                          }}
                          aria-label="Excluir"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {inventory && inventory.total > limit ? (
          <Box display="flex" justifyContent="center" gap={1} mt={2}>
            <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Typography variant="body2" sx={{ alignSelf: "center" }}>
              Página {page} · {inventory.total} itens
            </Typography>
            <Button
              size="small"
              disabled={page * limit >= inventory.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </Box>
        ) : null}
      </Paper>

      {}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar produto</DialogTitle>
        <form onSubmit={form.handleSubmit((values) => addMutation.mutate(values))}>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <Controller
                name="product_id"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    options={products}
                    getOptionLabel={(opt) => `${opt.name} (${opt.brand?.name ?? ""})`}
                    value={products.find((p) => p.id === field.value) ?? null}
                    onChange={(_, val) => field.onChange(val?.id ?? "")}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Produto"
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                        size="small"
                      />
                    )}
                  />
                )}
              />
              <Controller
                name="distributor_sku"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="SKU do distribuidor"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                  />
                )}
              />
              <Controller
                name="price"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Preço"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: 0.01 }}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    value={field.value}
                  />
                )}
              />
              <Controller
                name="stock_quantity"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Quantidade em estoque"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    value={field.value}
                  />
                )}
              />
              <Controller
                name="lead_time_days"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Lead time (dias)"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                    }
                  />
                )}
              />
              <Controller
                name="minimum_order_quantity"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Quantidade mínima de pedido"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                    inputProps={{ min: 1 }}
                    onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                    value={field.value}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={addMutation.isPending}>
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {}
      {editingRow && (
        <Dialog
          open={Boolean(editingRow)}
          onClose={() => setEditingRow(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Editar oferta</DialogTitle>
          <form
            onSubmit={form.handleSubmit((values) => {
              updateMutation.mutate({
                dpId: editingRow.id,
                data: {
                  distributor_sku: values.distributor_sku || undefined,
                  price: values.price,
                  stock_quantity: values.stock_quantity,
                  lead_time_days: values.lead_time_days,
                  minimum_order_quantity: values.minimum_order_quantity,
                },
              });
            })}
          >
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2} pt={1}>
                <TextField
                  label="Produto"
                  value={editingRow.product.name}
                  size="small"
                  fullWidth
                  disabled
                />
                <Controller
                  name="distributor_sku"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="SKU do distribuidor"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      fullWidth
                      size="small"
                    />
                  )}
                />
                <Controller
                  name="price"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Preço"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      fullWidth
                      size="small"
                      inputProps={{ min: 0, step: 0.01 }}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      value={field.value}
                    />
                  )}
                />
                <Controller
                  name="stock_quantity"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Estoque"
                      error={Boolean(fieldState.error)}
                      fullWidth
                      size="small"
                      inputProps={{ min: 0 }}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      value={field.value}
                    />
                  )}
                />
                <Controller
                  name="lead_time_days"
                  control={form.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Lead time (dias)"
                      fullWidth
                      size="small"
                      inputProps={{ min: 0 }}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                      }
                    />
                  )}
                />
                <Controller
                  name="minimum_order_quantity"
                  control={form.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="MOQ"
                      fullWidth
                      size="small"
                      inputProps={{ min: 1 }}
                      onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                      value={field.value}
                    />
                  )}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingRow(null)}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
                Salvar
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {}
      <Dialog
        open={bulkResult !== null}
        onClose={() => setBulkResult(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resultado da importação CSV</DialogTitle>
        <DialogContent>
          {bulkResult && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Criados: <strong>{bulkResult.created}</strong> · Atualizados:{" "}
                <strong>{bulkResult.updated}</strong>
              </Alert>
              {bulkResult.skipped.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">
                    Linhas ignoradas ({bulkResult.skipped.length})
                  </Typography>
                  <List dense>
                    {bulkResult.skipped.slice(0, 10).map((s, i) => (
                      <ListItem key={i}>
                        <ListItemText primary={s.reason} secondary={`Linha ${s.index + 1}`} />
                      </ListItem>
                    ))}
                    {bulkResult.skipped.length > 10 && (
                      <ListItem>
                        <ListItemText
                          primary={`… e mais ${bulkResult.skipped.length - 10} linhas`}
                          primaryTypographyProps={{ variant: "body2" }}
                        />
                      </ListItem>
                    )}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkResult(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
