"use client";

import { useState } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
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
import { SpecsModuleForm } from "./SpecsModuleForm";
import { SpecsInverterForm } from "./SpecsInverterForm";
import { SpecsMicroInverterForm } from "./SpecsMicroInverterForm";
import { SpecsStructureForm } from "./SpecsStructureForm";
import { SpecsCableForm } from "./SpecsCableForm";
import { SpecsConnectorForm } from "./SpecsConnectorForm";
import { SpecsPreviewCard } from "./SpecsPreviewCard";
import { ImageUpload } from "./ImageUpload";
import { DatasheetUpload } from "./DatasheetUpload";
import { fetchDistributorsByProduct, type ProductDistributorOffer } from "@/lib/admin-api";
import type { CategoryName } from "@/lib/admin/schemas";

const CATEGORY_LABELS: Record<string, string> = {
  module: "Módulo / Painel",
  inverter: "Inversor",
  microinverter: "Microinversor",
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
  structure_kit: SpecsStructureForm,
  dc_cable: SpecsCableForm,
  connector: SpecsConnectorForm,
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
  string_box: () => <></>,
};

interface ProductFormProps {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  categoryName: CategoryName | null;
  productId?: string;
}

export function ProductForm({
  categories,
  brands,
  categoryName,
  productId,
}: ProductFormProps): JSX.Element {
  const [tabIndex, setTabIndex] = useState(0);
  const {
    control,
    setValue,
    formState: { errors, submitCount },
  } = useFormContext();
  const SpecForm = categoryName ? categoryToSpecForm[categoryName] : null;
  const hasErrors = submitCount > 0 && Object.keys(errors).length > 0;

  const productName = useWatch({ name: "name", control });

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
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={Boolean(field.value)} color="primary" />}
                label="Produto ativo no Catálogo Global"
              />
            )}
          />
        </Box>
      )}

      {/* TAB 1: Technical Specs & Datasheet AI */}
      {tabIndex === 1 && categoryName && (
        <Box display="flex" flexDirection="column" gap={3} sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Faça upload do Datasheet oficial em PDF para que a{" "}
            <strong>Inteligência Artificial do EnergivIA</strong> extraia as especificações
            elétricas e mecânicas automaticamente.
          </Alert>

          <Controller
            name="datasheet_url"
            control={control}
            render={({ field }) => (
              <DatasheetUpload
                value={(field.value as string | undefined) ?? ""}
                onChange={(url) => field.onChange(url)}
                productCategory={categoryName ?? undefined}
                productName={productName as string | undefined}
                onExtractedSpecs={(specs) => {
                  Object.entries(specs).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                      setValue(`specs.${key}`, value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
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
            <Box minWidth={260}>
              <SpecsPreviewCard categoryName={categoryName} />
            </Box>
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
                Nenhum distribuidor ofertando este produto no momento
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Vincule este produto aos estoques dos distribuidores na aba{" "}
                <strong>Distribuidores &gt; Gerenciar Catálogo & Preços</strong>.
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <TableContainer>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Distribuidor</TableCell>
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
