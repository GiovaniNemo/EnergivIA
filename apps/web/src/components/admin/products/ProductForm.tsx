"use client";

import { useState, useRef, useEffect } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  CircularProgress,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MemoryOutlinedIcon from "@mui/icons-material/MemoryOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { SpecsModuleForm } from "./SpecsModuleForm";
import { SpecsInverterForm } from "./SpecsInverterForm";
import { SpecsMicroInverterForm } from "./SpecsMicroInverterForm";
import { SpecsHybridInverterForm } from "./SpecsHybridInverterForm";
import { SpecsOffGridInverterForm } from "./SpecsOffGridInverterForm";
import { SpecsBatteryForm } from "./SpecsBatteryForm";
import { SpecsBmsForm } from "./SpecsBmsForm";
import { SpecsStructureForm } from "./SpecsStructureForm";
import { SpecsCableForm } from "./SpecsCableForm";
import { SpecsConnectorForm } from "./SpecsConnectorForm";
import { SpecsStringBoxForm } from "./SpecsStringBoxForm";
import { SpecsPreviewCard } from "./SpecsPreviewCard";
import { ImageUpload } from "./ImageUpload";
import { DatasheetUpload } from "./DatasheetUpload";
import {
  fetchDistributorsByProduct,
  lookupEquipmentHomologation,
  type ProductDistributorOffer,
} from "@/lib/admin-api";
import { inferStructureSpecsFromName, normalizeCategory } from "@/lib/product-specs-status";
import type { CategoryName } from "@/lib/admin/schemas";

const CATEGORY_LABELS: Record<string, string> = {
  module: "Módulo / Painel",
  inverter: "Inversor On-Grid (String)",
  microinverter: "Microinversor",
  hybrid_inverter: "Inversor Híbrido",
  off_grid_inverter: "Inversor Off-Grid",
  battery: "Bateria",
  bms: "BMS (Gerenciador de Bateria)",
  structure_kit: "Estrutura",
  dc_cable: "Cabo CC",
  connector: "Conector",
  profile: "Perfil",
  string_box: "String Box",
};

function formatCategoryLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (CATEGORY_LABELS[normalized]) return CATEGORY_LABELS[normalized];
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const categoryToSpecForm: Record<CategoryName, () => JSX.Element> = {
  module: SpecsModuleForm,
  inverter: SpecsInverterForm,
  microinverter: SpecsMicroInverterForm,
  hybrid_inverter: SpecsHybridInverterForm,
  off_grid_inverter: SpecsOffGridInverterForm,
  battery: SpecsBatteryForm,
  bms: SpecsBmsForm,
  structure_kit: SpecsStructureForm,
  dc_cable: SpecsCableForm,
  connector: SpecsConnectorForm,
  string_box: SpecsStringBoxForm,
  profile: () => (
    <Box display="flex" flexDirection="column" gap={2}>
      <TextField
        {...useFormContext().register("specs.length_m")}
        label="Comprimento (metros)"
        type="number"
        inputProps={{ step: "any" }}
        fullWidth
        size="small"
      />
      <Controller
        name="specs.structure_type"
        control={useFormContext().control}
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value || ""}
            label="Tipo de Estrutura"
            select
            fullWidth
            size="small"
          >
            <MenuItem value="">Nenhum/Padrão</MenuItem>
            <MenuItem value="ceramic">Cerâmica / Fibrocimento</MenuItem>
            <MenuItem value="metal">Metálico</MenuItem>
            <MenuItem value="ground">Solo</MenuItem>
            <MenuItem value="laje">Laje</MenuItem>
          </TextField>
        )}
      />
      <Controller
        name="specs.profile_type"
        control={useFormContext().control}
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value || ""}
            label="Tipo de Perfil"
            select
            fullWidth
            size="small"
          >
            <MenuItem value="">Normal/Padrão</MenuItem>
            <MenuItem value="alto">Alto</MenuItem>
            <MenuItem value="baixo">Baixo (ex: 55CM)</MenuItem>
            <MenuItem value="fechamento">Fechamento de Estrutura (Solo)</MenuItem>
          </TextField>
        )}
      />
    </Box>
  ),
};

interface ProductFormProps {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  categoryName: CategoryName | null;
  productId?: string;
  defaultTab?: number;
}

export function ProductForm({
  categories,
  brands,
  categoryName,
  productId,
  defaultTab = 0,
}: ProductFormProps): JSX.Element {
  const [tabIndex, setTabIndex] = useState(defaultTab);
  const {
    control,
    setValue,
    getValues,
    formState: { errors, submitCount },
  } = useFormContext();
  const SpecForm = categoryName ? categoryToSpecForm[categoryName] : null;
  const hasErrors = submitCount > 0 && Object.keys(errors).length > 0;

  const productName = useWatch({ name: "name", control });
  const datasheetUrl = useWatch({ name: "datasheet_url", control });
  const currentSpecs = useWatch({ name: "specs", control }) as Record<string, unknown> | undefined;

  const hasSpecs = Boolean(
    currentSpecs &&
    typeof currentSpecs === "object" &&
    Object.values(currentSpecs).some((v) => v !== null && v !== undefined && v !== "")
  );

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupAlert, setLookupAlert] = useState<{
    type: "success" | "info" | "warning" | "error";
    message: string;
  } | null>(null);
  const autoLookupDoneRef = useRef(false);

  const handleLookupHomologation = async (isManual = true) => {
    const rawName = getValues("name") || productName;
    const currentName = typeof rawName === "string" ? rawName.trim() : "";

    if (!currentName || currentName.length < 3) {
      if (isManual) {
        setLookupAlert({
          type: "warning",
          message:
            "Informe o nome do produto na aba 'Informações Gerais' para buscar especificações automáticas.",
        });
      }
      return;
    }

    setIsLookingUp(true);
    setLookupAlert(null);

    try {
      const normCat = normalizeCategory(categoryName);

      // 1. Se for estrutura, infere primeiro por padrão no nome
      if (normCat === "structure_kit" || normCat === "profile") {
        const inferred = inferStructureSpecsFromName(currentName);
        if (Object.keys(inferred).length > 0) {
          Object.entries(inferred).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
              setValue(`specs.${k}`, v, { shouldDirty: true, shouldValidate: true });
            }
          });
          setLookupAlert({
            type: "success",
            message:
              "Especificações de estrutura inferidas com sucesso a partir do nome do produto!",
          });
          setIsLookingUp(false);
          return;
        }
      }

      // 2. Consulta a base de homologação e catálogo oficial
      const result = await lookupEquipmentHomologation(currentName);
      if (result?.specs && Object.keys(result.specs).length > 0) {
        Object.entries(result.specs).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            setValue(`specs.${k}`, v, { shouldDirty: true, shouldValidate: true });
          }
        });

        // Tenta associar fabricante correspondente
        if (result.brand && brands.length > 0) {
          const currentBrandId = getValues("brand_id");
          if (!currentBrandId) {
            const bTarget = result.brand.trim().toUpperCase();
            const matchedBrand = brands.find(
              (b) =>
                b.name.trim().toUpperCase() === bTarget ||
                bTarget.includes(b.name.trim().toUpperCase())
            );
            if (matchedBrand) {
              setValue("brand_id", matchedBrand.id, { shouldDirty: true, shouldValidate: true });
            }
          }
        }

        setLookupAlert({
          type: "success",
          message: `Especificações preenchidas automaticamente via Catálogo Homologado (${result.brand ? `${result.brand} ` : ""}${result.matchedModel || ""})!`,
        });
      } else {
        if (isManual) {
          setLookupAlert({
            type: "info",
            message:
              "Nenhuma homologação exata encontrada para este nome no catálogo oficial. Você pode anexar o Datasheet em PDF para extração via IA ou preencher os campos abaixo.",
          });
        }
      }
    } catch (err: unknown) {
      if (isManual) {
        setLookupAlert({
          type: "error",
          message: (err as Error)?.message || "Erro ao consultar base de homologação.",
        });
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  // Preenchimento automático ao acessar a aba de Ficha Técnica se ainda não tiver especificações
  useEffect(() => {
    if (tabIndex === 1 && !hasSpecs && !datasheetUrl && !autoLookupDoneRef.current) {
      autoLookupDoneRef.current = true;
      void handleLookupHomologation(false);
    }
  }, [tabIndex, hasSpecs, datasheetUrl]);

  // Fetch distributor offers if editing an existing product
  const { data: distributorOffers = [], isLoading: isLoadingOffers } = useQuery({
    queryKey: ["admin", "product-distributors", productId],
    queryFn: () => fetchDistributorsByProduct(productId!),
    enabled: Boolean(productId),
  });

  const lowestPrice =
    distributorOffers.length > 0
      ? Math.min(
          ...distributorOffers.map((o) => (typeof o.price === "number" ? o.price : Number(o.price)))
        )
      : null;

  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      {hasErrors ? (
        <Alert severity="error">Corrija os campos destacados antes de salvar.</Alert>
      ) : null}

      <Tabs
        value={tabIndex}
        onChange={(_, val) => setTabIndex(val)}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 48, gap: 1 },
        }}
      >
        <Tab
          icon={<InfoOutlinedIcon fontSize="small" />}
          iconPosition="start"
          label="Informações Gerais"
        />
        <Tab
          icon={<MemoryOutlinedIcon fontSize="small" />}
          iconPosition="start"
          label={
            categoryName ? `Ficha Técnica (${formatCategoryLabel(categoryName)})` : "Ficha Técnica"
          }
          disabled={!categoryName}
        />
        {productId && (
          <Tab
            icon={<StorefrontOutlinedIcon fontSize="small" />}
            iconPosition="start"
            label={`Onde Encontrar (${distributorOffers.length})`}
          />
        )}
      </Tabs>

      {/* TAB 0: General Info */}
      {tabIndex === 0 && (
        <Box display="flex" flexDirection="column" gap={2.5} sx={{ pt: 1 }}>
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value || ""}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  field.onChange(upper);
                }}
                sx={{ input: { textTransform: "uppercase" } }}
                label="Nome do produto"
                placeholder="Ex: MODULO SOLAR 585W DAH SOLAR BIFACIAL"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                fullWidth
                size="small"
                required
              />
            )}
          />

          <Box display="flex" gap={2} flexWrap="wrap">
            <Box flex={1} minWidth={240}>
              <Controller
                name="brand_id"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    select
                    label="Marca / Fabricante"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                    required
                    SelectProps={{
                      MenuProps: {
                        PaperProps: {
                          sx: { zIndex: 10000, maxHeight: 320 },
                        },
                        sx: { zIndex: 10000 },
                      },
                    }}
                  >
                    {brands.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>

            <Box flex={1} minWidth={240}>
              <Controller
                name="category_id"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    select
                    label="Categoria"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                    required
                    SelectProps={{
                      MenuProps: {
                        PaperProps: {
                          sx: { zIndex: 10000, maxHeight: 320 },
                        },
                        sx: { zIndex: 10000 },
                      },
                    }}
                  >
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {formatCategoryLabel(c.name)}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>
          </Box>

          <Controller
            name="image_url"
            control={control}
            render={({ field }) => (
              <ImageUpload
                value={(field.value as string | undefined) ?? ""}
                onChange={(url) => field.onChange(url)}
                folder="products"
                productCategory={categoryName ?? undefined}
                label="Foto oficial do produto (PNG / JPG / WebP)"
              />
            )}
          />
          {errors["image_url"] && (
            <Box sx={{ color: "error.main", typography: "caption" }}>
              {errors["image_url"]?.message as string}
            </Box>
          )}

          <Controller
            name="active"
            control={control}
            render={({ field: { value, onChange, ref, ...rest } }) => (
              <FormControlLabel
                control={
                  <Switch
                    {...rest}
                    inputRef={ref}
                    checked={Boolean(value)}
                    onChange={(e) => onChange(e.target.checked)}
                    color="primary"
                  />
                }
                label="Produto ativo no Catálogo Global"
              />
            )}
          />

          {categoryName && (
            <Box display="flex" justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setTabIndex(1)}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Avançar para Ficha Técnica →
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* TAB 1: Technical Specs & Datasheet AI */}
      {tabIndex === 1 && categoryName && (
        <Box display="flex" flexDirection="column" gap={3} sx={{ pt: 1 }}>
          {/* Homologation & AI Auto-fill Banner */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <AutoAwesomeIcon color="primary" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Preenchimento Automático &amp; Homologação Oficial
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Busca especificações elétricas e mecânicas no catálogo oficial homologado ou
                  extrai do PDF com IA.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="primary"
              startIcon={isLookingUp ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              disabled={isLookingUp}
              onClick={() => handleLookupHomologation(true)}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {isLookingUp ? "Consultando Catálogo..." : "Buscar Especificações com IA"}
            </Button>
          </Box>

          {lookupAlert && (
            <Alert
              severity={lookupAlert.type}
              onClose={() => setLookupAlert(null)}
              sx={{ borderRadius: 2 }}
            >
              {lookupAlert.message}
            </Alert>
          )}

          <Controller
            name="datasheet_url"
            control={control}
            render={({ field }) => (
              <DatasheetUpload
                value={(field.value as string | undefined) ?? ""}
                onChange={(url) => field.onChange(url)}
                productCategory={categoryName ?? undefined}
                productName={productName as string | undefined}
                autoExtractIfEmpty={!hasSpecs}
                onExtractedSpecs={(specs) => {
                  Object.entries(specs).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                      setValue(`specs.${key}`, value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  });
                  setLookupAlert({
                    type: "success",
                    message:
                      "Especificações elétricas e mecânicas extraídas com sucesso a partir do PDF!",
                  });
                }}
              />
            )}
          />

          <Box display="flex" gap={3} flexWrap="wrap" alignItems="flex-start">
            <Box flex="1" minWidth={300}>
              <Paper
                variant="outlined"
                sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Parâmetros de Engenharia Fotovoltaica
                </Typography>
                {SpecForm && <SpecForm />}
              </Paper>
            </Box>
            <Box minWidth={260} width={{ xs: "100%", md: 340 }}>
              <SpecsPreviewCard categoryName={categoryName} />
            </Box>
          </Box>

          <Box display="flex" justifyContent="flex-start" sx={{ pt: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setTabIndex(0)}
              sx={{ textTransform: "none" }}
            >
              ← Informações Gerais
            </Button>
          </Box>
        </Box>
      )}

      {/* TAB 2: Where to Buy (Distributor Offers) */}
      {tabIndex === 2 && productId && (
        <Box sx={{ pt: 1 }}>
          {isLoadingOffers ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={32} />
            </Box>
          ) : distributorOffers.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
              <LocalShippingOutlinedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Nenhum fornecedor ofertando este produto no momento
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Vincule este produto aos estoques dos fornecedores na aba{" "}
                <strong>Fornecedores &gt; Gerenciar Catálogo & Preços</strong>.
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <TableContainer>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Fornecedor</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>SKU do Fornecedor</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Preço Unitário</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        Estoque
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        Prazo de Entrega
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Atualização
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {distributorOffers.map((offer: ProductDistributorOffer) => {
                      const priceNum =
                        typeof offer.price === "number" ? offer.price : Number(offer.price);
                      const isBestPrice = lowestPrice !== null && priceNum <= lowestPrice;
                      const hasStock = offer.stock_quantity > 0;

                      return (
                        <TableRow key={offer.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <Avatar
                                sx={{ width: 32, height: 32, fontSize: "0.8rem", fontWeight: 700 }}
                              >
                                {offer.distributor.name.slice(0, 2).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {offer.distributor.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {offer.distributor.city
                                    ? `${offer.distributor.city} - ${offer.distributor.state || ""}`
                                    : offer.distributor.state || "—"}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: "monospace", fontWeight: 500 }}
                            >
                              {offer.distributor_sku || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 700,
                                  color: isBestPrice ? "success.main" : "text.primary",
                                }}
                              >
                                {priceNum.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </Typography>
                              {isBestPrice && (
                                <Chip
                                  label="Menor Preço"
                                  size="small"
                                  color="success"
                                  sx={{ fontSize: "0.7rem", height: 20, fontWeight: 700 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={
                                hasStock ? (
                                  <CheckCircleIcon fontSize="small" />
                                ) : (
                                  <ErrorOutlineIcon fontSize="small" />
                                )
                              }
                              label={hasStock ? `${offer.stock_quantity} un` : "Indisponível"}
                              size="small"
                              color={hasStock ? "success" : "default"}
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {offer.lead_time_days
                                ? `${offer.lead_time_days} dia(s)`
                                : "Pronta entrega"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption" color="text.secondary">
                              {offer.last_price_update
                                ? new Date(offer.last_price_update).toLocaleDateString("pt-BR")
                                : "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}
