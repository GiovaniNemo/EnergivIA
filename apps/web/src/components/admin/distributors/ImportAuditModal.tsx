"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RemoveShoppingCartIcon from "@mui/icons-material/RemoveShoppingCart";
import SellIcon from "@mui/icons-material/Sell";
import ConstructionIcon from "@mui/icons-material/Construction";
import CheckIcon from "@mui/icons-material/Check";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { ProductSpecsDialog } from "@/components/admin/products/ProductSpecsDialog";
import {
  fetchLatestImportLog,
  dismissGenericInLog,
  updateProductBrand,
  fetchBrands,
  type DistributorImportLog,
  type Brand,
} from "@/lib/admin-api";

interface ImportAuditModalProps {
  open: boolean;
  onClose: () => void;
  distributorId: string;
  distributorName?: string;
  initialLog?: DistributorImportLog | null;
  onBrandUpdated?: () => void;
  onOpenSpecs?: (productId: string) => void;
}

export function ImportAuditModal({
  open,
  onClose,
  distributorId,
  distributorName,
  initialLog,
  onBrandUpdated,
  onOpenSpecs,
}: ImportAuditModalProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [log, setLog] = useState<DistributorImportLog | null>(initialLog ?? null);
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<Record<string, string>>({});
  const [savingBrandId, setSavingBrandId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [dismissedLocal, setDismissedLocal] = useState<string[]>([]);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [specsProductId, setSpecsProductId] = useState<string | null>(null);

  // Load brands for selection
  useEffect(() => {
    if (open) {
      fetchBrands()
        .then((data) => setBrands(data || []))
        .catch(() => {});
    }
  }, [open]);

  // Load latest log if not supplied or when modal opens
  useEffect(() => {
    if (open) {
      if (initialLog) {
        setLog(initialLog);
        const existingDismissed = initialLog.details?.dismissedGenericIds || [];
        setDismissedLocal(existingDismissed);
      } else if (distributorId) {
        setLoading(true);
        fetchLatestImportLog(distributorId)
          .then((data) => {
            setLog(data);
            const existingDismissed = data?.details?.dismissedGenericIds || [];
            setDismissedLocal(existingDismissed);
          })
          .catch((err) => {
            console.error("Erro ao carregar log de importação:", err);
          })
          .finally(() => setLoading(false));
      }
    } else {
      setSuccessBanner(null);
    }
  }, [open, initialLog, distributorId]);

  const summary = log?.summary;
  const details = log?.details;

  // Filter brand review items that have not been dismissed
  const activeBrandItems = useMemo(() => {
    if (!details?.brandReviewItems) return [];
    return details.brandReviewItems.filter((item) => !dismissedLocal.includes(item.productId));
  }, [details?.brandReviewItems, dismissedLocal]);

  // Missing specs items
  const missingSpecsItems = useMemo(() => {
    return details?.missingSpecsItems || [];
  }, [details?.missingSpecsItems]);

  // Out of stock items
  const outOfStockItems = useMemo(() => {
    return details?.outOfStockItems || [];
  }, [details?.outOfStockItems]);

  // Price changes
  const priceChanges = useMemo(() => {
    return details?.priceChanges || [];
  }, [details?.priceChanges]);

  // Action: dismiss generic product
  const handleDismissGeneric = async (productId: string) => {
    if (!log) return;
    try {
      setDismissingId(productId);
      await dismissGenericInLog(log.id, productId);
      setDismissedLocal((prev) => [...prev, productId]);
      setSuccessBanner("Produto mantido como genérico e removido da lista de revisão.");
      setTimeout(() => setSuccessBanner(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      alert("Falha ao dispensar produto: " + msg);
    } finally {
      setDismissingId(null);
    }
  };

  // Action: update brand
  const handleSaveBrand = async (productId: string) => {
    const targetBrandId = selectedBrands[productId];
    if (!targetBrandId) {
      alert("Por favor selecione uma marca antes de salvar.");
      return;
    }
    try {
      setSavingBrandId(productId);
      await updateProductBrand(productId, targetBrandId);
      setDismissedLocal((prev) => [...prev, productId]);
      if (log) {
        await dismissGenericInLog(log.id, productId).catch(() => {});
      }
      setSuccessBanner("Marca do produto atualizada com sucesso.");
      setTimeout(() => setSuccessBanner(null), 3500);
      onBrandUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      alert("Falha ao salvar marca: " + msg);
    } finally {
      setSavingBrandId(null);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "background.paper",
          backgroundImage: "none",
          borderRadius: 2,
          boxShadow: 24,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            Auditoria da Última Importação
            {log?.fileName && (
              <Chip
                label={log.fileName}
                size="small"
                variant="outlined"
                sx={{ ml: 1, fontSize: "0.75rem", fontWeight: 500 }}
              />
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {distributorName ? `Fornecedor: ${distributorName}` : "Análise do catálogo e variações"}
            {log?.createdAt && (
              <span> • Importado em {new Date(log.createdAt).toLocaleString("pt-BR")}</span>
            )}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Fechar modal">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, flex: 1, overflowY: "auto" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
            <CircularProgress size={36} />
            <Typography sx={{ ml: 2 }}>Carregando dados da importação...</Typography>
          </Box>
        ) : !log ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              Nenhum relatório de importação disponível para este fornecedor.
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* KPI Summary Cards */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                gap: 1.5,
                mb: 3,
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 1.75,
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "neutral.900" : "grey.50"),
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  textTransform="uppercase"
                >
                  Total Processado
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                  {summary?.itemsProcessed ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {summary?.itemsCreated ?? 0} novos • {summary?.itemsUpdated ?? 0} atualizados
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 1.75,
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "neutral.900" : "grey.50"),
                  borderColor: activeBrandItems.length > 0 ? "warning.main" : "divider",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  textTransform="uppercase"
                >
                  Marcas a Revisar
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  sx={{
                    mt: 0.5,
                    color: activeBrandItems.length > 0 ? "warning.main" : "text.primary",
                  }}
                >
                  {activeBrandItems.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Produtos cadastrados com marca genérica
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 1.75,
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "neutral.900" : "grey.50"),
                  borderColor:
                    (summary?.criticalSpecsCount ?? 0) > 0
                      ? "error.main"
                      : missingSpecsItems.length > 0
                        ? "warning.main"
                        : "divider",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  textTransform="uppercase"
                >
                  Fichas Pendentes
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  sx={{
                    mt: 0.5,
                    color:
                      (summary?.criticalSpecsCount ?? 0) > 0
                        ? "error.main"
                        : missingSpecsItems.length > 0
                          ? "warning.main"
                          : "text.primary",
                  }}
                >
                  {missingSpecsItems.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {summary?.criticalSpecsCount ?? 0} essenciais p/ dimensionar
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 1.75,
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "neutral.900" : "grey.50"),
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  textTransform="uppercase"
                >
                  Esgotados / Mudanças
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                  {outOfStockItems.length + priceChanges.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {outOfStockItems.length} zerados • {priceChanges.length} alteração de preço
                </Typography>
              </Paper>
            </Box>

            {successBanner && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessBanner(null)}>
                {successBanner}
              </Alert>
            )}

            {/* Navigation Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs
                value={currentTab}
                onChange={(_, val) => setCurrentTab(val)}
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <SellIcon fontSize="small" />
                      <span>Marcas a Revisar</span>
                      <Chip
                        label={activeBrandItems.length}
                        size="small"
                        color={activeBrandItems.length > 0 ? "warning" : "default"}
                        sx={{ height: 20, fontSize: "0.75rem" }}
                      />
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ConstructionIcon fontSize="small" />
                      <span>Ficha Técnica Pendente</span>
                      <Chip
                        label={missingSpecsItems.length}
                        size="small"
                        color={
                          (summary?.criticalSpecsCount ?? 0) > 0
                            ? "error"
                            : missingSpecsItems.length > 0
                              ? "warning"
                              : "default"
                        }
                        sx={{ height: 20, fontSize: "0.75rem" }}
                      />
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <RemoveShoppingCartIcon fontSize="small" />
                      <span>Itens Esgotados / Ausentes</span>
                      <Chip
                        label={outOfStockItems.length}
                        size="small"
                        sx={{ height: 20, fontSize: "0.75rem" }}
                      />
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TrendingUpIcon fontSize="small" />
                      <span>Alterações de Preço & Saldo</span>
                      <Chip
                        label={priceChanges.length}
                        size="small"
                        sx={{ height: 20, fontSize: "0.75rem" }}
                      />
                    </Box>
                  }
                />
              </Tabs>
            </Box>

            {/* TAB 0: Marcas a Revisar */}
            {currentTab === 0 && (
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Itens novos ou importados com marca genérica. Atribua a marca correspondente ou
                    clique em
                    <strong> &ldquo;Manter Genérico&rdquo;</strong> para dispensá-lo da lista de
                    revisão.
                  </Typography>
                </Box>

                {activeBrandItems.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{ p: 4, textAlign: "center", borderRadius: 2, bgcolor: "background.paper" }}
                  >
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Tudo em ordem! Nenhuma marca pendente de revisão.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Todos os itens importados possuem marcas identificadas ou já foram mantidos
                      como genéricos.
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead
                        sx={{
                          bgcolor: (t) => (t.palette.mode === "dark" ? "neutral.800" : "grey.100"),
                        }}
                      >
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Produto / SKU</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Categoria</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Preço / Estoque</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>
                            Atribuir Marca
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activeBrandItems.map((item) => (
                          <TableRow key={item.productId} hover>
                            <TableCell>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                onClick={() => {
                                  if (onOpenSpecs) onOpenSpecs(item.productId);
                                  else setSpecsProductId(item.productId);
                                }}
                                sx={{
                                  cursor: "pointer",
                                  "&:hover": { color: "primary.main", textDecoration: "underline" },
                                }}
                              >
                                {item.productName}
                              </Typography>
                              {item.sku && (
                                <Typography variant="caption" color="text.secondary">
                                  SKU: {item.sku}
                                </Typography>
                              )}
                              {item.isNew && (
                                <Chip
                                  label="Novo"
                                  size="small"
                                  color="info"
                                  sx={{ ml: 1, height: 18, fontSize: "0.65rem" }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.categoryName || "Geral"}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: "0.75rem" }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {formatBRL(item.price)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.stock} un. em estoque
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" fullWidth>
                                <InputLabel id={`brand-select-${item.productId}`}>
                                  Selecionar Marca
                                </InputLabel>
                                <Select
                                  labelId={`brand-select-${item.productId}`}
                                  label="Selecionar Marca"
                                  value={selectedBrands[item.productId] || ""}
                                  onChange={(e) =>
                                    setSelectedBrands((prev) => ({
                                      ...prev,
                                      [item.productId]: e.target.value,
                                    }))
                                  }
                                >
                                  {brands.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>
                                      {b.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<CheckIcon fontSize="small" />}
                                disabled={
                                  !selectedBrands[item.productId] ||
                                  savingBrandId === item.productId ||
                                  dismissingId === item.productId
                                }
                                onClick={() => handleSaveBrand(item.productId)}
                                sx={{ mr: 1, textTransform: "none" }}
                              >
                                {savingBrandId === item.productId ? "Salvando..." : "Salvar"}
                              </Button>
                              <Tooltip title="Dispensar este item e mantê-lo como genérico">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="inherit"
                                  startIcon={<VisibilityOffIcon fontSize="small" />}
                                  disabled={
                                    savingBrandId === item.productId ||
                                    dismissingId === item.productId
                                  }
                                  onClick={() => handleDismissGeneric(item.productId)}
                                  sx={{ textTransform: "none", color: "text.secondary" }}
                                >
                                  {dismissingId === item.productId ? "..." : "Manter Genérico"}
                                </Button>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* TAB 1: Ficha Técnica Pendente */}
            {currentTab === 1 && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Parâmetros Técnicos & Dimensionamento:</strong> Módulos Fotovoltaicos
                    (Potência Wp, Voc, Vmp, Isc, Imp) e Inversores/Microinversores (Potência
                    Nominal, Tensão CC Máx, Corrente Entrada, Faixa MPPT) necessitam destes
                    parâmetros para cálculo de kits e validação de compatibilidade. Clique em{" "}
                    <strong>Completar Ficha</strong> para preenchê-los.
                  </Typography>
                </Alert>

                {missingSpecsItems.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{ p: 4, textAlign: "center", borderRadius: 2, bgcolor: "background.paper" }}
                  >
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Todas as fichas técnicas estão preenchidas!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum produto crítico de dimensionamento ou com parâmetros elétricos
                      pendentes.
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead
                        sx={{
                          bgcolor: (t) => (t.palette.mode === "dark" ? "neutral.800" : "grey.100"),
                        }}
                      >
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Produto / Marca</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Categoria</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Campos Ausentes</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Impacto no Dimensionamento</TableCell>
                          <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Ação</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {missingSpecsItems.map((item) => (
                          <TableRow key={item.productId} hover>
                            <TableCell>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                onClick={() => {
                                  if (onOpenSpecs) onOpenSpecs(item.productId);
                                  else setSpecsProductId(item.productId);
                                }}
                                sx={{
                                  cursor: "pointer",
                                  "&:hover": { color: "primary.main", textDecoration: "underline" },
                                }}
                              >
                                {item.productName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Marca: {item.brand} {item.sku ? `• SKU: ${item.sku}` : ""}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.category || "Geral"}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: "0.75rem" }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                {item.missingFields.map((field, i) => (
                                  <Chip
                                    key={i}
                                    label={field}
                                    size="small"
                                    color={item.isCritical ? "error" : "warning"}
                                    variant="outlined"
                                    sx={{ fontSize: "0.75rem" }}
                                  />
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {item.isCritical ? (
                                <Tooltip title="Sem este dado básico, o sistema não consegue calcular os kits com este produto">
                                  <Chip
                                    icon={<WarningAmberIcon fontSize="small" />}
                                    label="Essencial p/ Dimensionar"
                                    size="small"
                                    color="error"
                                    sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                                  />
                                </Tooltip>
                              ) : (
                                <Tooltip title="Recomendado para validação de faixas elétricas e compatibilidade de strings">
                                  <Chip
                                    icon={<WarningAmberIcon fontSize="small" />}
                                    label="Parâmetro Elétrico Pendente"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                                  />
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell sx={{ textAlign: "right" }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<DescriptionOutlinedIcon fontSize="small" />}
                                onClick={() => {
                                  if (onOpenSpecs) {
                                    onOpenSpecs(item.productId);
                                  } else {
                                    setSpecsProductId(item.productId);
                                  }
                                }}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  whiteSpace: "nowrap",
                                  boxShadow: "none",
                                }}
                              >
                                Completar Ficha
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* TAB 2: Itens Esgotados / Ausentes */}
            {currentTab === 2 && (
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Itens que tiveram o estoque zerado nesta planilha ou que foram removidos do
                    arquivo (neste caso, o sistema zera o estoque preventivamente para evitar
                    cotações de itens indisponíveis).
                  </Typography>
                </Box>

                {outOfStockItems.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{ p: 4, textAlign: "center", borderRadius: 2, bgcolor: "background.paper" }}
                  >
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Nenhum item esgotado ou ausente nesta importação.
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead
                        sx={{
                          bgcolor: (t) => (t.palette.mode === "dark" ? "neutral.800" : "grey.100"),
                        }}
                      >
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Produto / SKU</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Categoria</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Motivo do Esgotamento</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Estoque Anterior</TableCell>
                          <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                            Último Preço
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {outOfStockItems.map((item, idx) => (
                          <TableRow key={`${item.productId}-${idx}`} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {item.productName}
                              </Typography>
                              {item.sku && (
                                <Typography variant="caption" color="text.secondary">
                                  SKU: {item.sku}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.categoryName || "Geral"}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: "0.75rem" }}
                              />
                            </TableCell>
                            <TableCell>
                              {item.reason === "removed_from_sheet" ? (
                                <Chip
                                  label="Ausente na Planilha (Zerado)"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                              ) : (
                                <Chip
                                  label="Estoque Zerado"
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.oldStock} un.</Typography>
                            </TableCell>
                            <TableCell sx={{ textAlign: "right" }}>
                              <Typography variant="body2" fontWeight={600}>
                                {formatBRL(item.oldPrice)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* TAB 3: Alterações de Preço & Saldo */}
            {currentTab === 3 && (
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Comparações de preço e estoque entre a planilha anterior e a atual.
                  </Typography>
                </Box>

                {priceChanges.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{ p: 4, textAlign: "center", borderRadius: 2, bgcolor: "background.paper" }}
                  >
                    <CheckCircleOutlineIcon color="info" sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Nenhuma oscilação de preço detectada.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Todos os itens existentes mantiveram o mesmo valor nesta importação.
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead
                        sx={{
                          bgcolor: (t) => (t.palette.mode === "dark" ? "neutral.800" : "grey.100"),
                        }}
                      >
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Produto / SKU</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Preço Anterior</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Novo Preço</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Variação</TableCell>
                          <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                            Estoque (Antigo → Novo)
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {priceChanges.map((change, idx) => {
                          const isUp = change.diff > 0;
                          return (
                            <TableRow key={`${change.productId}-${idx}`} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {change.productName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {change.categoryName} {change.sku ? `• SKU: ${change.sku}` : ""}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {formatBRL(change.oldPrice)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700}>
                                  {formatBRL(change.newPrice)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  {isUp ? (
                                    <TrendingUpIcon fontSize="small" color="error" />
                                  ) : (
                                    <TrendingDownIcon fontSize="small" color="success" />
                                  )}
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{ color: isUp ? "error.main" : "success.main" }}
                                  >
                                    {isUp ? "+" : ""}
                                    {formatBRL(change.diff)} ({isUp ? "+" : ""}
                                    {change.diffPercent.toFixed(1)}%)
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ textAlign: "right" }}>
                                <Typography variant="body2">
                                  {change.oldStock} un. → <strong>{change.newStock} un.</strong>
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Fechar
        </Button>
      </DialogActions>

      <ProductSpecsDialog
        open={Boolean(specsProductId)}
        productId={specsProductId}
        onClose={() => setSpecsProductId(null)}
        onSaved={() => {
          onBrandUpdated?.();
          if (distributorId) {
            fetchLatestImportLog(distributorId)
              .then((data) => {
                if (data) setLog(data);
              })
              .catch(() => {});
          }
        }}
        defaultTab={1}
      />
    </Dialog>
  );
}
