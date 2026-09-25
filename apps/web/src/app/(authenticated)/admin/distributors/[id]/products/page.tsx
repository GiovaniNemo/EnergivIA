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
  Avatar,
  Stack,
  Menu,
  FormControlLabel,
  Checkbox,
  Switch,
  Tooltip,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SyncIcon from "@mui/icons-material/Sync";
import SearchIcon from "@mui/icons-material/Search";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import { ProductSpecsDialog } from "@/components/admin/products/ProductSpecsDialog";
import { ImportAuditModal } from "@/components/admin/distributors/ImportAuditModal";
import { getProductSpecsStatus } from "@/lib/product-specs-status";
import {
  fetchDistributor,
  fetchDistributorProducts,
  fetchCategories,
  fetchProducts,
  addDistributorProduct,
  updateDistributorProduct,
  deleteDistributorProduct,
  uploadDistributorSpreadsheet,
  bulkUpdateDistributorProductsActive,
  type DistributorProduct,
  type DistributorImportLog,
} from "@/lib/admin-api";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { distributorProductSchema, type DistributorProductFormValues } from "@/lib/admin/schemas";

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
  price: undefined as unknown as number,
  stock_quantity: undefined,
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
  const [specsFilter, setSpecsFilter] = useState<"all" | "incomplete" | "complete">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DistributorProduct | null>(null);
  const [specsProductId, setSpecsProductId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState<{ id: string; value: string } | null>(null);
  const [inlineStock, setInlineStock] = useState<{ id: string; value: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importFeedback, setImportFeedback] = useState<{
    severity: "success" | "warning" | "error";
    message: string;
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
    setSelectedIds([]);
  }, [debouncedSearch, categoryId, specsFilter]);

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
      8 +
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

  const displayRows = useMemo(() => {
    const list = inventory?.data || [];
    if (specsFilter === "all") return list;
    return list.filter((row) => {
      const status = getProductSpecsStatus(
        row.product?.category?.name,
        row.product?.specs as Record<string, unknown>
      );
      if (specsFilter === "incomplete") return !status.isComplete;
      if (specsFilter === "complete") return status.isComplete;
      return true;
    });
  }, [inventory?.data, specsFilter]);

  const addMutation = useMutation({
    mutationFn: (values: DistributorProductFormValues) =>
      addDistributorProduct(id, {
        product_id: values.product_id,
        distributor_sku: values.distributor_sku || undefined,
        price: values.price,
        stock_quantity: values.stock_quantity ?? 0,
        lead_time_days: values.lead_time_days,
        minimum_order_quantity: values.minimum_order_quantity ?? 1,
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
        active?: boolean;
      };
    }) => updateDistributorProduct(dpId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
      setEditingRow(null);
      setInlinePrice(null);
      setInlineStock(null);
    },
  });

  const bulkActiveMutation = useMutation({
    mutationFn: ({ ids, active }: { ids: string[]; active: boolean }) =>
      bulkUpdateDistributorProductsActive(id, ids, active),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
      setSelectedIds([]);
      setImportFeedback({
        severity: "success",
        message: `${variables.ids.length} produto(s) ${variables.active ? "ativado(s)" : "pausado(s)"} para cotação com sucesso.`,
      });
    },
    onError: (err: Error) => {
      setImportFeedback({
        severity: "error",
        message: "Erro ao atualizar itens selecionados: " + err.message,
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((dpId) => deleteDistributorProduct(dpId)));
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
      setSelectedIds([]);
      setImportFeedback({
        severity: "success",
        message: `${ids.length} produto(s) excluído(s) do catálogo deste fornecedor.`,
      });
    },
    onError: (err: Error) => {
      setImportFeedback({
        severity: "error",
        message: "Erro ao excluir itens selecionados: " + err.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDistributorProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
    },
  });

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogData, setAuditLogData] = useState<DistributorImportLog | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const uploadSpreadsheetMutation = useMutation({
    mutationFn: (file: File) => uploadDistributorSpreadsheet(id, file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      setImportFeedback({
        severity: "success",
        message: result.message,
      });
      if (result.summary && result.details) {
        setAuditLogData({
          id: result.logId || id,
          distributorId: id,
          fileName: uploadedFileName,
          summary: result.summary,
          details: result.details,
          createdAt: new Date().toISOString(),
        });
      } else {
        setAuditLogData(null);
      }
      setAuditModalOpen(true);
    },
    onError: (err: Error) => {
      setImportFeedback({
        severity: "error",
        message: err.message || "Falha ao processar e importar planilha.",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    uploadSpreadsheetMutation.mutate(file);
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
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        mb={2}
        sx={{ py: 0.5 }}
      >
        <Box display="flex" alignItems="center" gap={1}>
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
        {distributor && (
          <Chip
            size="small"
            label={
              distributor.active !== false
                ? "Fornecedor Ativo para Cotações"
                : "Fornecedor Pausado nas Cotações"
            }
            color={distributor.active !== false ? "success" : "default"}
            variant={distributor.active !== false ? "filled" : "outlined"}
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {distributor?.active === false && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
          Este fornecedor está atualmente <strong>pausado</strong> para cotações gerais na lista de
          parceiros. Os itens abaixo não serão incluídos nas cotações automáticas enquanto o status
          do fornecedor estiver pausado.
        </Alert>
      )}

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
            <TextField
              select
              size="small"
              label="Ficha Técnica"
              value={specsFilter}
              onChange={(e) => {
                setSpecsFilter(e.target.value as "all" | "incomplete" | "complete");
                setPage(1);
              }}
              sx={{ minWidth: 190, width: { xs: "100%", sm: "auto" } }}
            >
              <MenuItem value="all">Todas as Fichas</MenuItem>
              <MenuItem value="incomplete" sx={{ color: "#ef4444", fontWeight: 600 }}>
                🔴 Incompletas (Pendentes)
              </MenuItem>
              <MenuItem value="complete" sx={{ color: "#10b981", fontWeight: 600 }}>
                🟢 100% Completas
              </MenuItem>
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
                color="secondary"
                startIcon={<SyncIcon />}
                onClick={() => setSyncModalOpen(true)}
              >
                Sincronizar API
              </Button>
              <Button
                variant="outlined"
                startIcon={
                  uploadSpreadsheetMutation.isPending ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <UploadFileIcon />
                  )
                }
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadSpreadsheetMutation.isPending}
              >
                {uploadSpreadsheetMutation.isPending
                  ? "Importando Planilha..."
                  : "Importar Planilha / CSV"}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AssessmentOutlinedIcon />}
                onClick={() => {
                  setAuditLogData(null);
                  setAuditModalOpen(true);
                }}
                sx={{
                  whiteSpace: "nowrap",
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                Auditoria da Importação
              </Button>
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleFileUpload}
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
                  : "Nenhum produto neste fornecedor."
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
                label="SKU do fornecedor"
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

        {selectedIds.length > 0 && (
          <Paper
            variant="outlined"
            sx={{
              mx: 2,
              mb: 2,
              p: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(2, 136, 209, 0.12)" : "info.50",
              borderColor: "info.main",
              borderRadius: 2,
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Chip
                label={`${selectedIds.length} selecionado(s)`}
                color="info"
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Ações em lote para os itens selecionados:
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button
                variant="contained"
                color="success"
                size="small"
                disabled={bulkActiveMutation.isPending}
                onClick={() => bulkActiveMutation.mutate({ ids: selectedIds, active: true })}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Ativar nas Cotações
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                disabled={bulkActiveMutation.isPending}
                onClick={() => bulkActiveMutation.mutate({ ids: selectedIds, active: false })}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Pausar nas Cotações
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                disabled={bulkDeleteMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Excluir definitivamente ${selectedIds.length} produto(s) deste fornecedor?`
                    )
                  ) {
                    bulkDeleteMutation.mutate(selectedIds);
                  }
                }}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Excluir Selecionados
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => setSelectedIds([])}
                sx={{ textTransform: "none", color: "text.secondary" }}
              >
                Limpar seleção
              </Button>
            </Stack>
          </Paper>
        )}

        <TableContainer
          sx={{ overflowX: "auto", maxHeight: { xs: "none", md: "min(70vh, 720px)" } }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    indeterminate={
                      selectedIds.length > 0 &&
                      Boolean(inventory?.data?.length) &&
                      selectedIds.length < (inventory?.data?.length ?? 0)
                    }
                    checked={
                      Boolean(inventory?.data?.length) &&
                      inventory!.data.every((r) => selectedIds.includes(r.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked && inventory?.data) {
                        setSelectedIds(inventory.data.map((r) => r.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>Produto</TableCell>
                <TableCell>Marca</TableCell>
                <TableCell>Tipo</TableCell>
                {optionalColumns.sku ? <TableCell>SKU fornec.</TableCell> : null}
                <TableCell align="right">Preço</TableCell>
                <TableCell align="right">Estoque</TableCell>
                {optionalColumns.leadTime ? (
                  <TableCell align="right">Lead time (d)</TableCell>
                ) : null}
                {optionalColumns.moq ? <TableCell align="right">MOQ</TableCell> : null}
                {optionalColumns.bestPrice ? <TableCell>Melhor preço</TableCell> : null}
                {optionalColumns.lastUpdate ? <TableCell>Últ. atualização</TableCell> : null}
                <TableCell align="center">Status nas Cotações</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingDist || loadingInv ? (
                <TableRow>
                  <TableCell colSpan={visibleColCount}>Carregando...</TableCell>
                </TableRow>
              ) : !displayRows.length ? (
                <TableRow>
                  <TableCell colSpan={visibleColCount}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      {debouncedSearch || categoryId || specsFilter !== "all"
                        ? "Nenhum produto corresponde aos filtros ou busca selecionada."
                        : 'Nenhum produto neste fornecedor. Use "Adicionar produto" para começar.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((row) => {
                  const isItemActive = row.active !== false;
                  const specsStatus = getProductSpecsStatus(
                    row.product.category?.name,
                    row.product.specs as Record<string, unknown>
                  );

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      selected={selectedIds.includes(row.id)}
                      sx={{
                        "&:last-child td, &:last-child th": { borderBottom: 0 },
                        opacity: isItemActive ? 1 : 0.65,
                        transition: "opacity 0.2s ease",
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selectedIds.includes(row.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, row.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((i) => i !== row.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 340 }}>
                        <Box
                          onClick={() => setSpecsProductId(row.product.id)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.2,
                            minWidth: 0,
                            cursor: "pointer",
                            "&:hover .product-name-text": {
                              color: "primary.main",
                              textDecoration: "underline",
                            },
                          }}
                        >
                          <Avatar
                            src={row.product.imageUrl ?? row.product.brand.imageUrl ?? undefined}
                            alt={row.product.name}
                            variant="rounded"
                            sx={{ width: 32, height: 32, fontSize: "0.75rem", flexShrink: 0 }}
                          >
                            {row.product.name.slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box
                            sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 0.3 }}
                          >
                            <Tooltip
                              title={`Ver ficha técnica de: ${row.product.name}`}
                              placement="top-start"
                            >
                              <Typography
                                className="product-name-text"
                                variant="body2"
                                sx={{ fontWeight: 600, transition: "color 0.2s ease" }}
                                noWrap
                              >
                                {row.product.name}
                              </Typography>
                            </Tooltip>
                            {!specsStatus.isComplete && specsStatus.totalRequired > 0 && (
                              <Tooltip
                                arrow
                                title={`Faltam dados essenciais: ${specsStatus.missingFields.join(", ")}`}
                              >
                                <Chip
                                  size="small"
                                  label={`Ficha incompleta (${specsStatus.filledCount}/${specsStatus.totalRequired})`}
                                  sx={{
                                    height: 18,
                                    fontSize: "0.62rem",
                                    fontWeight: 700,
                                    color: "#ef4444",
                                    bgcolor: "rgba(239, 68, 68, 0.08)",
                                    border: "1px solid rgba(239, 68, 68, 0.25)",
                                    width: "fit-content",
                                    cursor: "pointer",
                                  }}
                                />
                              </Tooltip>
                            )}
                          </Box>
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
                      <TableCell align="center">
                        <Tooltip
                          title={
                            isItemActive
                              ? "Ativo para cotações (será ofertado para integradores)"
                              : "Pausado (não aparecerá nas cotações ou propostas)"
                          }
                        >
                          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                            <Switch
                              size="small"
                              checked={isItemActive}
                              disabled={updateMutation.isPending}
                              onChange={(e) =>
                                updateMutation.mutate({
                                  dpId: row.id,
                                  data: { active: e.target.checked },
                                })
                              }
                              color="success"
                            />
                            <Chip
                              size="small"
                              label={isItemActive ? "Ativo" : "Pausado"}
                              color={isItemActive ? "success" : "default"}
                              variant={isItemActive ? "filled" : "outlined"}
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.72rem",
                                height: 22,
                                minWidth: 56,
                              }}
                            />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                          <Tooltip
                            arrow
                            title={
                              <Box sx={{ p: 0.5, maxWidth: 320 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    display: "block",
                                    color: specsStatus.isComplete ? "#34d399" : "#f87171",
                                  }}
                                >
                                  {specsStatus.isComplete
                                    ? "🟢 Ficha Técnica Completa"
                                    : "🔴 Ficha Técnica Incompleta"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ display: "block", mt: 0.25, color: "text.secondary" }}
                                >
                                  {specsStatus.tooltipText}
                                </Typography>
                                {!specsStatus.isComplete && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      mt: 0.75,
                                      color: "#fbbf24",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Clique para preencher os dados faltantes
                                  </Typography>
                                )}
                              </Box>
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() => setSpecsProductId(row.product.id)}
                              aria-label="Ficha Técnica"
                              sx={{
                                color: specsStatus.isComplete ? "#10b981" : "#ef4444",
                                bgcolor: specsStatus.isComplete
                                  ? "rgba(16, 185, 129, 0.08)"
                                  : "rgba(239, 68, 68, 0.08)",
                                border: `1px solid ${
                                  specsStatus.isComplete
                                    ? "rgba(16, 185, 129, 0.35)"
                                    : "rgba(239, 68, 68, 0.35)"
                                }`,
                                "&:hover": {
                                  bgcolor: specsStatus.isComplete
                                    ? "rgba(16, 185, 129, 0.18)"
                                    : "rgba(239, 68, 68, 0.18)",
                                },
                                transition: "all 0.2s ease",
                              }}
                            >
                              <DescriptionOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
                          <Tooltip title="Remover do fornecedor">
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (window.confirm("Remover este produto do fornecedor?")) {
                                  deleteMutation.mutate(row.id);
                                }
                              }}
                              aria-label="Excluir"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
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

      {importFeedback && (
        <Alert
          severity={importFeedback.severity}
          onClose={() => setImportFeedback(null)}
          sx={{ mt: 2 }}
        >
          <Typography variant="subtitle2">{importFeedback.message}</Typography>
        </Alert>
      )}

      <Dialog open={syncModalOpen} onClose={() => setSyncModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Sincronizar via API do Fornecedor</DialogTitle>
        <DialogContent dividers>
          <Box py={1}>
            <Typography variant="body1" paragraph>
              A integração via API permite atualizar automaticamente{" "}
              <strong>preços, estoque em tempo real e fichas técnicas</strong> de materiais,
              conectando-se diretamente ao sistema do fornecedor.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Para implementar o funcionamento real deste botão, você precisará nos fornecer as{" "}
              <strong>Credenciais (API Keys, Tokens)</strong> e a{" "}
              <strong>Documentação (Manual de Integração)</strong> fornecidas pelo parceiro /
              fornecedor (ex: Aldo Solar, Amara, etc.).
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              Integração pendente: Aguardando as chaves de acesso dos fornecedores.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncModalOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled startIcon={<SyncIcon />}>
            Sincronizar Agora
          </Button>
        </DialogActions>
      </Dialog>

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
                    label="SKU do fornecedor"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                    value={field.value ?? ""}
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
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
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
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
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
                    onChange={(e) => field.onChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
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
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
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
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                  <TextField
                    label="Produto"
                    value={editingRow.product.name}
                    size="small"
                    fullWidth
                    disabled
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DescriptionOutlinedIcon />}
                    onClick={() => {
                      const pid = editingRow.product.id;
                      setEditingRow(null);
                      setSpecsProductId(pid);
                    }}
                    sx={{ whiteSpace: "nowrap", textTransform: "none", height: 40, flexShrink: 0 }}
                  >
                    Ficha Técnica
                  </Button>
                </Box>
                <Controller
                  name="distributor_sku"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="SKU do fornecedor"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      fullWidth
                      size="small"
                      value={field.value ?? ""}
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
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onFocus={(e) => e.target.select()}
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
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onFocus={(e) => e.target.select()}
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
                      onChange={(e) => field.onChange(e.target.value)}
                      onFocus={(e) => e.target.select()}
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
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onFocus={(e) => e.target.select()}
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

      {/* Product Specs & Datasheet Modal */}
      <ProductSpecsDialog
        open={Boolean(specsProductId)}
        productId={specsProductId}
        onClose={() => setSpecsProductId(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
        }}
        defaultTab={1}
      />

      <ImportAuditModal
        open={auditModalOpen}
        onClose={() => {
          setAuditModalOpen(false);
          setAuditLogData(null);
        }}
        distributorId={id}
        distributorName={distributor?.name}
        initialLog={auditLogData}
        onOpenSpecs={(pId) => setSpecsProductId(pId)}
        onBrandUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id, "products"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
        }}
      />
    </Box>
  );
}
