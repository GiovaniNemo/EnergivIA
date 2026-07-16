"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { maskMoneyBrlFromDigits, parseMoneyBrlDisplay } from "@energivia/utils";
import { Button } from "@/components/ui/button";
import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import InputLabel from "@mui/material/InputLabel";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import type {
  CostCalculationType,
  CostRulePercentageBase,
  CostRuleRow,
} from "@/lib/cost-rules-api";
import { createCostRule, updateCostRule } from "@/lib/cost-rules-api";
import {
  autoPercentSaleContextLine,
  CALCULATION_LABELS,
  COST_RULE_NAME_OTHER,
  COST_RULE_NAME_PRESET_ENUM_TUPLE,
  COST_RULE_NAME_PRESET_GROUPS,
  COST_RULE_NAME_PRESETS,
  isCanonicalCostRuleName,
  PERCENTAGE_BASE_OPTIONS,
  suggestPercentageBaseForCostName,
} from "./cost-rule-presets";
import { buildRuleApplicationSummary, previewKwpCondition } from "./cost-rule-preview";
import { marginCommissionSalePercentExceededMessage } from "./cost-rule-validators";

const calcEnum = z.enum(["FIXED", "PERCENTAGE", "PER_KWP"]);
const namePresetEnum = z.union([
  z.enum(COST_RULE_NAME_PRESET_ENUM_TUPLE),
  z.literal(COST_RULE_NAME_OTHER),
]);
const percentageBaseEnum = z.enum(["SALE_PRICE", "PROJECT_COST", "PROFIT"]);

const formSchema = z
  .object({
    namePreset: namePresetEnum,
    customName: z.string().max(120).default(""),
    calculationType: calcEnum,
    value: z.number().min(0, "Valor inválido."),
    percentageBase: percentageBaseEnum.default("PROJECT_COST"),
    useKwpRange: z.boolean(),
    minKwp: z.number().min(0).nullable().optional(),
    maxKwp: z.number().min(0).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.namePreset === COST_RULE_NAME_OTHER) {
      const t = data.customName.trim();
      if (!t) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Descreva o nome do custo.",
          path: ["customName"],
        });
      }
    }
    if (!data.useKwpRange) return;
    if (data.minKwp === null || data.minKwp === undefined || Number.isNaN(data.minKwp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe “De (kWp)”.",
        path: ["minKwp"],
      });
    }
    const max = data.maxKwp;
    if (max !== null && max !== undefined && !Number.isNaN(max) && data.minKwp != null) {
      if (!(data.minKwp < max)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "“De” deve ser menor que “Até” (limite superior exclusivo).",
          path: ["maxKwp"],
        });
      }
    }
  });

export type CostRuleFormValues = z.infer<typeof formSchema>;

type CostRuleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  editing: CostRuleRow | null;
  existingRules?: CostRuleRow[];
  onSaved: () => void;
  onError: (message: string) => void;
};

const COST_RULE_MODAL_FORM_ID = "cost-rule-modal-form";

const costRuleModalMenuItemSx = {
  fontSize: "0.8125rem",
  lineHeight: 1.35,
  fontWeight: 400,
  borderRadius: 1.5,
  minHeight: 34,
  py: 0.45,
  px: 1.125,
  mx: 0.25,
  transition: "background-color 0.12s ease, color 0.12s ease",
  "&:hover": { bgcolor: "var(--color-muted)" },
  "&.Mui-focusVisible": {
    bgcolor: "color-mix(in srgb, var(--color-ring) 14%, var(--color-muted))",
  },
  "&.Mui-selected": {
    bgcolor: "color-mix(in srgb, var(--color-accent) 26%, transparent)",
    color: "var(--color-accent-foreground)",
  },
  "&.Mui-selected.Mui-focusVisible": {
    bgcolor: "color-mix(in srgb, var(--color-accent) 34%, transparent)",
  },
  "&.Mui-selected:hover": {
    bgcolor: "color-mix(in srgb, var(--color-accent) 36%, transparent)",
  },
} as const;

const costRuleModalGroupedPresetMenuItemSx = {
  ...costRuleModalMenuItemSx,
  pl: 2.5,
} as const;

const costRuleModalOtherPresetMenuItemSx = {
  ...costRuleModalGroupedPresetMenuItemSx,
  py: 0.65,
  fontWeight: 500,
  color: "var(--color-accent-foreground)",
  bgcolor: "color-mix(in srgb, var(--color-muted) 22%, transparent)",
  "&:hover": {
    bgcolor: "color-mix(in srgb, var(--color-muted) 38%, transparent)",
  },
  "&.Mui-selected": {
    bgcolor: "color-mix(in srgb, var(--color-accent) 26%, transparent)",
  },
} as const;

const costRuleModalNumberInputNoSpinnersSx = {
  "& input[type=number]": {
    MozAppearance: "textfield",
  },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
    {
      WebkitAppearance: "none",
      margin: 0,
    },
} as const;

const costRuleModalOutlinedFieldLabelProps = {
  shrink: true as const,
  sx: { "&.Mui-focused": { color: "var(--color-foreground)" } },
};

const defaultValues: CostRuleFormValues = {
  namePreset: COST_RULE_NAME_PRESETS[0],
  customName: "",
  calculationType: "PERCENTAGE",
  value: 0,
  percentageBase: "SALE_PRICE",
  useKwpRange: false,
  minKwp: null,
  maxKwp: null,
};

function splitSavedName(name: string): Pick<CostRuleFormValues, "namePreset" | "customName"> {
  if (isCanonicalCostRuleName(name)) {
    return { namePreset: name, customName: "" };
  }
  return { namePreset: COST_RULE_NAME_OTHER, customName: name };
}

export function CostRuleModal({
  open,
  onOpenChange,
  organizationId,
  editing,
  existingRules = [],
  onSaved,
  onError,
}: CostRuleModalProps): JSX.Element {
  const [showAdvancedPct, setShowAdvancedPct] = useState(false);

  const form = useForm<CostRuleFormValues>({
    resolver: zodResolver(formSchema) as Resolver<CostRuleFormValues>,
    defaultValues,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState,
  } = form;
  const useKwpRange = watch("useKwpRange");
  const calcType = watch("calculationType");
  const minW = watch("minKwp");
  const maxW = watch("maxKwp");
  const namePreset = watch("namePreset");
  const customNameWatch = watch("customName");
  const pctBaseWatch = watch("percentageBase");
  const resolvedCostNameForPctHint =
    namePreset === COST_RULE_NAME_OTHER ? customNameWatch.trim() : String(namePreset);
  const suggestedPercentageBase = suggestPercentageBaseForCostName(resolvedCostNameForPctHint);
  const valueWatch = watch("value");
  const percentageBaseContextLine = autoPercentSaleContextLine(resolvedCostNameForPctHint);
  const valueFieldLabel =
    calcType === "PERCENTAGE"
      ? "Percentual (%)"
      : calcType === "PER_KWP"
        ? "Valor por kWp (R$/kWp)"
        : "Valor fixo (R$)";

  useEffect(() => {
    if (!open) {
      setShowAdvancedPct(false);
      return;
    }
    if (editing?.calculationType === "PERCENTAGE" && editing.percentageBase === "PROFIT") {
      setShowAdvancedPct(true);
    }
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const global = editing.minKwp === null && editing.maxKwp === null;
      const { namePreset: np, customName: cn } = splitSavedName(editing.name);
      const pctBase: CostRulePercentageBase =
        editing.calculationType === "PERCENTAGE"
          ? (editing.percentageBase ?? suggestPercentageBaseForCostName(editing.name))
          : "PROJECT_COST";
      reset({
        namePreset: np,
        customName: cn,
        calculationType: editing.calculationType,
        value: editing.value,
        percentageBase: pctBase,
        useKwpRange: !global,
        minKwp: editing.minKwp,
        maxKwp: editing.maxKwp,
      });
    } else {
      reset(defaultValues);
    }
  }, [open, editing, reset]);

  const previewKwp = previewKwpCondition(
    useKwpRange ? (minW ?? null) : null,
    useKwpRange ? (maxW ?? null) : null
  );

  const applicationSummary =
    resolvedCostNameForPctHint.trim().length > 0
      ? buildRuleApplicationSummary({
          costName: resolvedCostNameForPctHint.trim(),
          calculationType: calcType,
          value: Number(valueWatch) || 0,
          percentageBase: pctBaseWatch,
          minKwp: useKwpRange ? (minW ?? null) : null,
          maxKwp: useKwpRange ? (maxW ?? null) : null,
        })
      : null;

  useEffect(() => {
    if (!open) {
      clearErrors("root");
      return;
    }
    const name = namePreset === COST_RULE_NAME_OTHER ? customNameWatch.trim() : String(namePreset);
    const msg = marginCommissionSalePercentExceededMessage(existingRules, editing?.id, {
      name,
      calculationType: calcType,
      value: Number(valueWatch) || 0,
      percentageBase: pctBaseWatch,
      minKwp: useKwpRange ? (minW ?? null) : null,
      maxKwp: useKwpRange ? (maxW ?? null) : null,
    });
    if (msg) setError("root", { type: "manual", message: msg });
    else clearErrors("root");
  }, [
    open,
    existingRules,
    editing?.id,
    namePreset,
    customNameWatch,
    calcType,
    valueWatch,
    pctBaseWatch,
    useKwpRange,
    minW,
    maxW,
    setError,
    clearErrors,
  ]);

  const onSubmit = async (data: CostRuleFormValues) => {
    const name =
      data.namePreset === COST_RULE_NAME_OTHER ? data.customName.trim() : data.namePreset;
    const capMsg = marginCommissionSalePercentExceededMessage(existingRules, editing?.id, {
      name,
      calculationType: data.calculationType,
      value: data.value,
      percentageBase: data.percentageBase,
      minKwp: data.useKwpRange ? (data.minKwp ?? null) : null,
      maxKwp: data.useKwpRange ? (data.maxKwp ?? null) : null,
    });
    if (capMsg) {
      setError("root", { type: "manual", message: capMsg });
      return;
    }
    clearErrors("root");
    const minKwp = data.useKwpRange ? (data.minKwp ?? null) : null;
    const maxKwp = data.useKwpRange ? (data.maxKwp ?? null) : null;
    const body = {
      name,
      calculationType: data.calculationType as CostCalculationType,
      value: data.value,
      minKwp,
      maxKwp,
      percentageBase:
        data.calculationType === "PERCENTAGE"
          ? (data.percentageBase as CostRulePercentageBase)
          : null,
    };
    try {
      if (editing) {
        await updateCostRule(organizationId, editing.id, body);
      } else {
        await createCostRule(organizationId, body);
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth={false}
      scroll="paper"
      disableEnforceFocus
      disableAutoFocus
      slotProps={{
        paper: {
          sx: {
            width: "100%",
            maxWidth: "min(42rem, calc(100vw - 2rem))",
            maxHeight: "min(94vh, calc(100dvh - 1rem))",
            m: 2,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            border: "1px solid var(--color-border)",
            bgcolor: "var(--color-card)",
            backgroundImage: "none",
            boxShadow: "0 24px 80px -12px rgba(0,0,0,0.55)",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          position: "relative",
          pr: 6,
          pt: 2.5,
          pb: 1,
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "var(--color-foreground)",
        }}
      >
        {editing ? "Editar regra de custo" : "Nova regra de custo"}
        <IconButton
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar"
          size="small"
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            color: "var(--color-muted-foreground)",
            border: "1px solid var(--color-border)",
            borderRadius: 1,
            bgcolor: "var(--color-card)",
            "&:hover": { bgcolor: "var(--color-accent)" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          px: 3,
          py: 2,
          overflowX: "hidden",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      >
        <Typography
          variant="body2"
          sx={{ mb: 2, color: "var(--color-muted-foreground)", lineHeight: 1.5 }}
        >
          Escolha um tipo de custo na lista para manter nomes padronizados (relatórios e totais por
          categoria). Use &quot;Outro…&quot; só quando nada da lista servir. As faixas do mesmo nome
          não podem sobrepor-se.
        </Typography>

        <form
          id={COST_RULE_MODAL_FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 [&_input]:border-[var(--color-border)] [&_input]:bg-muted/25"
        >
          <div className="space-y-1.5">
            <Controller
              name="namePreset"
              control={control}
              render={({ field }) => {
                const applyPresetChange = (v: string) => {
                  field.onChange(v);
                  if (v !== COST_RULE_NAME_OTHER) {
                    setValue("customName", "");
                  }
                  if (getValues("calculationType") === "PERCENTAGE") {
                    const nm = v === COST_RULE_NAME_OTHER ? getValues("customName") : v;
                    setValue(
                      "percentageBase",
                      suggestPercentageBaseForCostName(typeof nm === "string" ? nm : "")
                    );
                  }
                };
                return (
                  <FormControl fullWidth size="small" variant="outlined">
                    <InputLabel id="cr-name-preset-label" shrink>
                      Tipo de custo
                    </InputLabel>
                    <Select
                      labelId="cr-name-preset-label"
                      id="cr-name-preset"
                      label="Tipo de custo"
                      notched
                      value={field.value}
                      name={field.name}
                      inputRef={field.ref}
                      onBlur={field.onBlur}
                      onChange={(e: SelectChangeEvent<string>) => {
                        applyPresetChange(e.target.value);
                      }}
                      sx={{
                        "& .MuiSelect-icon": {
                          color: "var(--color-muted-foreground)",
                          right: 10,
                          transition: "transform 0.15s ease",
                        },
                        "& .MuiOutlinedInput-root.Mui-expanded .MuiSelect-icon": {
                          transform: "rotate(180deg)",
                        },
                      }}
                      MenuProps={{
                        disableScrollLock: true,
                        PaperProps: {
                          sx: {
                            maxHeight: "min(400px, calc(100dvh - 10rem))",
                            mt: 1,
                            bgcolor: "var(--color-popover)",
                            color: "var(--color-popover-foreground)",
                            border:
                              "1px solid color-mix(in srgb, var(--color-border) 85%, transparent)",
                            borderRadius: 2,
                            boxShadow:
                              "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 12px 32px -8px rgb(0 0 0 / 0.32)",
                            zIndex: (theme) => theme.zIndex.modal + 1,
                          },
                        },
                        MenuListProps: {
                          dense: true,
                          sx: {
                            maxHeight: "min(340px, calc(100dvh - 11rem))",
                            overflowY: "auto",
                            overflowX: "hidden",
                            py: 0.5,
                            px: 0.35,
                            WebkitOverflowScrolling: "touch",
                            overscrollBehavior: "contain",
                            "& .MuiMenuItem-root": {
                              fontSize: "0.8125rem",
                              lineHeight: 1.35,
                            },
                            "& .MuiListSubheader-root": {
                              fontSize: "0.6875rem",
                              lineHeight: 1.3,
                            },
                            "& .MuiDivider-root": {
                              borderColor:
                                "color-mix(in srgb, var(--color-border) 72%, transparent)",
                            },
                            "& .MuiMenuItem-root + .MuiMenuItem-root": { mt: 0.125 },
                          },
                        },
                      }}
                    >
                      {COST_RULE_NAME_PRESET_GROUPS.flatMap((group, groupIndex) => {
                        const isOperacionalGroup = group.label.includes("Operacional");
                        return [
                          ...(groupIndex > 0
                            ? [
                                <Divider
                                  key={`preset-divider-${group.label}`}
                                  component="li"
                                  role="separator"
                                  sx={{
                                    listStyle: "none",
                                    my: 0.65,
                                    mx: 0.75,
                                    borderColor:
                                      "color-mix(in srgb, var(--color-border) 72%, transparent)",
                                  }}
                                />,
                              ]
                            : []),
                          <ListSubheader
                            key={`preset-group-${group.label}`}
                            disableSticky
                            sx={{
                              mx: 0.25,
                              mt: groupIndex === 0 ? 0.25 : 0,
                              mb: 0.2,
                              px: 1.25,
                              pt: 0.35,
                              pb: 0.2,
                              lineHeight: 1.35,
                              bgcolor: "transparent",
                              color: "var(--color-muted-foreground)",
                              fontWeight: 600,
                              fontSize: "0.6875rem",
                              letterSpacing: "0.02em",
                              borderRadius: 0,
                            }}
                          >
                            {group.label}
                          </ListSubheader>,
                          ...group.names.map((n) => (
                            <MenuItem key={n} value={n} sx={costRuleModalGroupedPresetMenuItemSx}>
                              {n}
                            </MenuItem>
                          )),
                          ...(isOperacionalGroup
                            ? [
                                <MenuItem
                                  key={COST_RULE_NAME_OTHER}
                                  value={COST_RULE_NAME_OTHER}
                                  sx={costRuleModalOtherPresetMenuItemSx}
                                >
                                  Outro…
                                </MenuItem>,
                              ]
                            : []),
                        ];
                      })}
                    </Select>
                  </FormControl>
                );
              }}
            />
          </div>

          {namePreset === COST_RULE_NAME_OTHER ? (
            <div className="space-y-1.5">
              <Controller
                name="customName"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    id="cr-custom-name"
                    fullWidth
                    size="small"
                    variant="outlined"
                    label="Nome do custo (personalizado)"
                    placeholder="Ex.: ART, estadia, taxa de financiamento…"
                    autoComplete="off"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    inputRef={field.ref}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    InputLabelProps={costRuleModalOutlinedFieldLabelProps}
                    onBlur={(e) => {
                      field.onBlur();
                      if (getValues("calculationType") === "PERCENTAGE") {
                        setValue(
                          "percentageBase",
                          suggestPercentageBaseForCostName(e.target.value)
                        );
                      }
                    }}
                  />
                )}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Controller
              name="calculationType"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small" variant="outlined">
                  {}
                  <InputLabel
                    id="cr-calc-label"
                    sx={{
                      "&.Mui-focused": { color: "var(--color-foreground)" },
                    }}
                  >
                    Modo de cálculo
                  </InputLabel>
                  <Select
                    labelId="cr-calc-label"
                    id="cr-calc"
                    label="Modo de cálculo"
                    value={field.value}
                    name={field.name}
                    inputRef={field.ref}
                    inputProps={{
                      "aria-label": "Como esse custo será calculado?",
                    }}
                    onBlur={field.onBlur}
                    onChange={(e: SelectChangeEvent<CostCalculationType>) => {
                      const v = e.target.value as CostCalculationType;
                      field.onChange(v);
                      if (v === "PERCENTAGE") {
                        const np = getValues("namePreset");
                        const raw =
                          np === COST_RULE_NAME_OTHER ? getValues("customName") : String(np);
                        setValue("percentageBase", suggestPercentageBaseForCostName(raw));
                      }
                    }}
                    MenuProps={{
                      disableScrollLock: true,
                      PaperProps: {
                        sx: {
                          mt: 0.5,
                          bgcolor: "var(--color-popover)",
                          color: "var(--color-popover-foreground)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 2,
                          zIndex: (theme) => theme.zIndex.modal + 1,
                        },
                      },
                      MenuListProps: {
                        dense: true,
                        sx: {
                          py: 0.5,
                          "& .MuiMenuItem-root": {
                            fontSize: "0.8125rem",
                            lineHeight: 1.35,
                            minHeight: 34,
                            py: 0.45,
                          },
                        },
                      },
                    }}
                  >
                    {(Object.keys(CALCULATION_LABELS) as CostCalculationType[]).map((k) => (
                      <MenuItem key={k} value={k} sx={costRuleModalMenuItemSx}>
                        {CALCULATION_LABELS[k]}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText
                    component="div"
                    sx={{
                      mx: 0,
                      mt: 0.75,
                      fontSize: "0.75rem",
                      lineHeight: 1.45,
                      color: "var(--color-muted-foreground)",
                    }}
                  >
                    <span className="font-medium text-[var(--color-foreground)]">
                      Como esse custo será calculado?
                    </span>{" "}
                    Valor fixo (R$), percentual (%) ou valor por kWp — conforme a opção escolhida
                    acima.
                  </FormHelperText>
                </FormControl>
              )}
            />
          </div>

          <div className="space-y-1.5">
            {calcType === "PERCENTAGE" ? (
              <Controller
                name="value"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    id="cr-value"
                    fullWidth
                    size="small"
                    variant="outlined"
                    label={valueFieldLabel}
                    type="number"
                    inputMode="decimal"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      field.onChange(Number.isFinite(v) ? v : 0);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    inputRef={field.ref}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    InputLabelProps={costRuleModalOutlinedFieldLabelProps}
                    sx={costRuleModalNumberInputNoSpinnersSx}
                  />
                )}
              />
            ) : (
              <Controller
                name="value"
                control={control}
                render={({ field, fieldState }) => {
                  const display = maskMoneyBrlFromDigits(
                    String(Math.round(Number(field.value) * 100))
                  );
                  return (
                    <TextField
                      id="cr-value"
                      fullWidth
                      size="small"
                      variant="outlined"
                      label={valueFieldLabel}
                      inputMode="numeric"
                      placeholder="0,00"
                      value={display}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw) {
                          field.onChange(0);
                          return;
                        }
                        field.onChange(parseMoneyBrlDisplay(maskMoneyBrlFromDigits(raw)));
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      inputRef={field.ref}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      InputLabelProps={costRuleModalOutlinedFieldLabelProps}
                    />
                  );
                }}
              />
            )}
          </div>

          {calcType === "PERCENTAGE" ? (
            <fieldset className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10 p-3 sm:p-4">
              <legend className="px-1 text-sm font-medium text-[var(--color-foreground)]">
                Como calcular esse percentual?
              </legend>
              <p className="text-xs leading-snug text-[var(--color-muted-foreground)]">
                A referência define em que valor a percentagem incide nas propostas. Ao mudar o tipo
                de custo, sugerimos automaticamente o mais comum — pode ajustar quando fizer
                sentido.
              </p>
              {percentageBaseContextLine ? (
                <p className="text-sm leading-snug text-[var(--color-foreground)]">
                  {percentageBaseContextLine}
                </p>
              ) : null}
              <Controller
                name="percentageBase"
                control={control}
                render={({ field }) => {
                  const mainOpts = PERCENTAGE_BASE_OPTIONS.filter((o) => !o.advanced);
                  const profitOpts = PERCENTAGE_BASE_OPTIONS.filter((o) => o.advanced);
                  return (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {mainOpts.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer gap-2.5 rounded-lg border border-[var(--color-border)] bg-muted/30 p-2.5 shadow-sm sm:min-h-[7.5rem] sm:flex-col sm:items-start sm:pt-3"
                          >
                            <input
                              type="radio"
                              className="mt-0.5 shrink-0 accent-emerald-600 sm:mt-0"
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => field.onChange(opt.value)}
                            />
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium leading-tight text-[var(--color-foreground)]">
                                {opt.title}
                                {suggestedPercentageBase === opt.value ? (
                                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                                    Recomendado
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-1 block text-[0.72rem] leading-snug text-[var(--color-muted-foreground)]">
                                {opt.description}
                              </span>
                              <span className="mt-1 block text-[0.65rem] italic leading-snug text-[var(--color-muted-foreground)]">
                                {opt.hint}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {(showAdvancedPct || pctBaseWatch === "PROFIT") &&
                        profitOpts.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer gap-2.5 rounded-lg border border-[var(--color-border)] bg-muted/30 p-2.5 shadow-sm"
                          >
                            <input
                              type="radio"
                              className="mt-0.5 shrink-0 accent-emerald-600"
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => {
                                field.onChange(opt.value);
                                setShowAdvancedPct(true);
                              }}
                            />
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-[var(--color-foreground)]">
                                {opt.title}
                                {suggestedPercentageBase === opt.value ? (
                                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                                    Recomendado
                                  </span>
                                ) : null}
                                <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                                  Avançado
                                </span>
                              </span>
                              <span className="mt-1 block text-[0.72rem] leading-snug text-[var(--color-muted-foreground)]">
                                {opt.description}
                              </span>
                              <span className="mt-1 block text-[0.65rem] italic leading-snug text-[var(--color-muted-foreground)]">
                                {opt.hint}
                              </span>
                            </span>
                          </label>
                        ))}
                      {!showAdvancedPct && pctBaseWatch !== "PROFIT" ? (
                        <button
                          type="button"
                          className="text-left text-xs font-medium text-violet-700 underline underline-offset-2 hover:text-violet-600 dark:text-violet-300"
                          onClick={() => setShowAdvancedPct(true)}
                        >
                          Mostrar opção avançada (percentual sobre o lucro)
                        </button>
                      ) : null}
                    </div>
                  );
                }}
              />
            </fieldset>
          ) : null}

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Controller
                name="useKwpRange"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-[var(--color-border)] accent-emerald-600"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      if (!e.target.checked) {
                        setValue("minKwp", null);
                        setValue("maxKwp", null);
                      }
                    }}
                  />
                )}
              />
              <span>
                <span className="font-medium text-[var(--color-foreground)]">
                  Aplicar apenas para projetos em uma faixa de potência
                </span>
                <span className="mt-0.5 block text-xs text-[var(--color-muted-foreground)]">
                  Sem esta opção, a regra vale para todos os projetos. Com a opção, defina “De” e,
                  se quiser um teto, “Até” (exclusivo). Deixe “Até” vazio para “a partir de” sem
                  limite.
                </span>
              </span>
            </label>

            {useKwpRange ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Controller
                  name="minKwp"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      id="cr-min"
                      fullWidth
                      size="small"
                      variant="outlined"
                      label="De (kWp)"
                      type="number"
                      inputProps={{ min: 0, step: 0.01 }}
                      placeholder="Ex.: 0"
                      value={field.value === null || field.value === undefined ? "" : field.value}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        field.onChange(Number.isFinite(v) ? v : null);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      inputRef={field.ref}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      InputLabelProps={costRuleModalOutlinedFieldLabelProps}
                      sx={{
                        ...costRuleModalNumberInputNoSpinnersSx,
                        "& input": { fontFamily: "ui-monospace, monospace" },
                      }}
                    />
                  )}
                />
                <Controller
                  name="maxKwp"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      id="cr-max"
                      fullWidth
                      size="small"
                      variant="outlined"
                      label="Até (kWp)"
                      type="number"
                      inputProps={{ min: 0, step: 0.01 }}
                      placeholder="Ex.: 5 (exclusivo)"
                      value={field.value === null || field.value === undefined ? "" : field.value}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          field.onChange(null);
                          return;
                        }
                        const v = parseFloat(raw);
                        field.onChange(Number.isFinite(v) ? v : null);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      inputRef={field.ref}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      InputLabelProps={costRuleModalOutlinedFieldLabelProps}
                      sx={{
                        ...costRuleModalNumberInputNoSpinnersSx,
                        "& input": { fontFamily: "ui-monospace, monospace" },
                      }}
                    />
                  )}
                />
              </div>
            ) : null}
          </div>

          {formState.errors.root?.message ? (
            <p className="rounded-lg border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
              {formState.errors.root.message}
            </p>
          ) : null}

          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-3 text-sm text-[var(--color-muted-foreground)]">
            {applicationSummary ? (
              <>
                <p className="font-semibold text-[var(--color-foreground)]">
                  {applicationSummary.title}
                </p>
                <p className="mt-1.5 leading-snug">{applicationSummary.primaryLine}</p>
                {applicationSummary.exampleLine ? (
                  <p className="mt-2 border-t border-emerald-500/20 pt-2 text-xs leading-snug">
                    {applicationSummary.exampleLine}
                  </p>
                ) : null}
              </>
            ) : null}
            <p className="mt-2 border-t border-emerald-500/20 pt-2 text-xs leading-snug">
              <span className="font-medium text-[var(--color-foreground)]">Potência (kWp): </span>
              {previewKwp.short}
              {previewKwp.detail ? <span className="mt-0.5 block">{previewKwp.detail}</span> : null}
            </p>
          </div>
        </form>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          gap: 1,
          flexShrink: 0,
          borderTop: "1px solid var(--color-border)",
          bgcolor: "var(--color-card)",
        }}
      >
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form={COST_RULE_MODAL_FORM_ID}
          disabled={Boolean(formState.errors.root)}
        >
          {editing ? "Salvar" : "Criar regra"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
