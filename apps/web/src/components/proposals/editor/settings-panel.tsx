"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import type {
  FontFamily,
  PageWidth,
  ProposalDocumentJson,
  SettingsTab,
  Spacing,
  TypographyPreset,
} from "./types";

interface SettingsPanelProps {
  settingsTab: SettingsTab;
  onChangeTab: (tab: SettingsTab) => void;
  documentState: ProposalDocumentJson;
  onClose: () => void;
  onApplyPalette: (primary: string, secondary: string, background: string, text: string) => void;
  onChangeDocument: Dispatch<SetStateAction<ProposalDocumentJson>>;
  onTypographyPreset: (preset: TypographyPreset) => void;
  onLogoUpload: (file: File | undefined) => void;
  mode?: "drawer" | "inline";
}

const SUGGESTED_PALETTES = [
  {
    slug: "emerald-modern",
    label: "Verde Moderno",
    primary: "#059669",
    secondary: "#34D399",
    background: "#FAFFFC",
    text: "#022C22",
  },
  {
    slug: "blue-saas",
    label: "Azul SaaS",
    primary: "#1D4ED8",
    secondary: "#60A5FA",
    background: "#FAFCFF",
    text: "#0B1F3A",
  },
  {
    slug: "indigo-premium",
    label: "Índigo Premium",
    primary: "#4338CA",
    secondary: "#A5B4FC",
    background: "#FAFBFF",
    text: "#1E1B4B",
  },
  {
    slug: "minimal-gray",
    label: "Cinza Minimal",
    primary: "#18181B",
    secondary: "#52525B",
    background: "#FFFFFF",
    text: "#09090B",
  },
  {
    slug: "warm-neutral",
    label: "Neutro Quente",
    primary: "#9A3412",
    secondary: "#EA580C",
    background: "#FFFCFA",
    text: "#431407",
  },
  {
    slug: "dark-saas",
    label: "Dark Moderno",
    primary: "#3B82F6",
    secondary: "#93C5FD",
    background: "#0B0F1A",
    text: "#E5E7EB",
  },
  {
    slug: "graphite-premium",
    label: "Grafite Premium",
    primary: "#E5E7EB",
    secondary: "#CBD5E1",
    background: "#0A0A0A",
    text: "#FAFAFA",
  },
  {
    slug: "soft-purple",
    label: "Roxo Soft",
    primary: "#7C3AED",
    secondary: "#C4B5FD",
    background: "#FCFAFF",
    text: "#2E1065",
  },
  {
    slug: "teal-fresh",
    label: "Teal Fresh",
    primary: "#0D9488",
    secondary: "#5EEAD4",
    background: "#F8FFFD",
    text: "#042F2E",
  },
  {
    slug: "sky-saas",
    label: "Sky SaaS",
    primary: "#0284C7",
    secondary: "#7DD3FC",
    background: "#F8FCFF",
    text: "#0B2440",
  },
  {
    slug: "coral-soft",
    label: "Coral Soft",
    primary: "#EA580C",
    secondary: "#FB7185",
    background: "#FFF8F8",
    text: "#7F1D1D",
  },
  {
    slug: "lime-bright",
    label: "Lime Bright",
    primary: "#A3E635",
    secondary: "#BEF264",
    background: "#FCFFF5",
    text: "#365314",
  },
  {
    slug: "slate-night",
    label: "Slate Night",
    primary: "#38BDF8",
    secondary: "#0284C7",
    background: "#0B1220",
    text: "#E0F2FE",
  },
  {
    slug: "emerald-night",
    label: "Emerald Night",
    primary: "#10B981",
    secondary: "#6EE7B7",
    background: "#021B16",
    text: "#ECFDF5",
  },
  {
    slug: "indigo-night",
    label: "Indigo Night",
    primary: "#6366F1",
    secondary: "#A5B4FC",
    background: "#020617",
    text: "#E0E7FF",
  },
  {
    slug: "violet-night",
    label: "Violet Night",
    primary: "#8B5CF6",
    secondary: "#DDD6FE",
    background: "#0F172A",
    text: "#F3E8FF",
  },
  {
    slug: "amber-night",
    label: "Amber Night",
    primary: "#F59E0B",
    secondary: "#FDE68A",
    background: "#0F172A",
    text: "#FEF3C7",
  },
  {
    slug: "rose-night",
    label: "Rose Night",
    primary: "#FB7185",
    secondary: "#BE123C",
    background: "#0F0F1A",
    text: "#FFE4E6",
  },
  {
    slug: "steel-night",
    label: "Steel Night",
    primary: "#94A3B8",
    secondary: "#475569",
    background: "#0A0F1A",
    text: "#F1F5F9",
  },
  {
    slug: "teal-night",
    label: "Teal Night",
    primary: "#2DD4BF",
    secondary: "#0F766E",
    background: "#020617",
    text: "#CCFBF1",
  },
] as const;

const LIGHT_SUGGESTED_PALETTES = SUGGESTED_PALETTES.filter((palette) => {
  const bg = palette.background.replace("#", "");
  const value = Number.parseInt(
    bg.length === 3
      ? bg
          .split("")
          .map((c) => c + c)
          .join("")
      : bg,
    16
  );
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance >= 0.6;
});

const DARK_SUGGESTED_PALETTES = SUGGESTED_PALETTES.filter(
  (palette) => !LIGHT_SUGGESTED_PALETTES.some((lightPalette) => lightPalette.slug === palette.slug)
);

export function SettingsPanel({
  settingsTab,
  onChangeTab,
  documentState,
  onClose,
  onApplyPalette,
  onChangeDocument,
  onTypographyPreset,
  onLogoUpload,
  mode = "drawer",
}: SettingsPanelProps): JSX.Element {
  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "branding", label: "Marca" },
    { id: "typography", label: "Tipografia" },
    { id: "layout", label: "Layout" },
  ];

  const isInline = mode === "inline";

  return (
    <div
      className={
        isInline
          ? "h-[calc(100vh-190px)] min-h-[520px] w-full min-w-0 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border)_84%,transparent)] bg-[color:color-mix(in_srgb,var(--color-card)_96%,white_3%)] p-3 shadow-[0_18px_42px_rgba(2,6,23,0.14)] lg:h-[calc(100vh-160px)] lg:min-h-[640px] lg:w-[clamp(500px,44vw,800px)] lg:shrink-0 lg:p-4"
          : "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      }
    >
      <div
        className={
          isInline
            ? "h-full w-full"
            : "absolute right-0 top-0 h-full w-full max-w-[520px] border-l border-[var(--color-border)] bg-[var(--color-card)] p-4"
        }
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            Configurações da Proposta
          </h3>
          {isInline ? null : (
            <Button variant="outline" className="border-[var(--color-border)]" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                settingsTab === tab.id
                  ? "bg-emerald-500 text-zinc-950"
                  : "border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="h-[calc(100%-112px)] overflow-auto pr-1">
          {settingsTab === "branding" ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--color-foreground)]">Marca</h4>
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Logo do template (cabeçalho e capa). Clique ou arraste para enviar outro arquivo —
                  recomendamos proporção larga, por exemplo 200×80px (PNG, JPG ou WEBP).
                </p>
                <ImageDropzone
                  label=""
                  hideLabel
                  value={documentState.styles.branding.logoUrl ?? ""}
                  onSelectFile={(file) => void onLogoUpload(file)}
                  onClear={
                    documentState.styles.branding.logoUrl
                      ? () =>
                          onChangeDocument((prev) => ({
                            ...prev,
                            styles: {
                              ...prev.styles,
                              branding: { ...prev.styles.branding, logoUrl: "" },
                            },
                          }))
                      : undefined
                  }
                  isUploading={false}
                  variant="default"
                  emptyPlaceholder="Nenhum logo no template. Envie PNG, JPG ou WEBP."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label="Cor primária"
                  value={documentState.styles.branding.primaryColor}
                  onChange={(value) =>
                    onChangeDocument((prev) => ({
                      ...prev,
                      styles: {
                        ...prev.styles,
                        branding: { ...prev.styles.branding, primaryColor: value },
                      },
                    }))
                  }
                />
                <ColorField
                  label="Cor secundária"
                  value={documentState.styles.branding.secondaryColor}
                  onChange={(value) =>
                    onChangeDocument((prev) => ({
                      ...prev,
                      styles: {
                        ...prev.styles,
                        branding: { ...prev.styles.branding, secondaryColor: value },
                      },
                    }))
                  }
                />
                <ColorField
                  label="Fundo"
                  value={documentState.styles.branding.backgroundColor}
                  onChange={(value) =>
                    onChangeDocument((prev) => ({
                      ...prev,
                      styles: {
                        ...prev.styles,
                        branding: { ...prev.styles.branding, backgroundColor: value },
                      },
                    }))
                  }
                />
                <ColorField
                  label="Cor do texto"
                  value={documentState.styles.branding.textColor}
                  onChange={(value) =>
                    onChangeDocument((prev) => ({
                      ...prev,
                      styles: {
                        ...prev.styles,
                        branding: { ...prev.styles.branding, textColor: value },
                      },
                    }))
                  }
                />
              </div>

              <div className="rounded-xl border border-[var(--color-border)] p-3">
                <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">
                  Paletas sugeridas
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Temas claros
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 xl:grid-cols-5">
                      {LIGHT_SUGGESTED_PALETTES.map((palette) => (
                        <PaletteButton
                          key={palette.slug}
                          label={palette.label}
                          primary={palette.primary}
                          secondary={palette.secondary}
                          background={palette.background}
                          text={palette.text}
                          onApply={onApplyPalette}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Temas escuros
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 xl:grid-cols-5">
                      {DARK_SUGGESTED_PALETTES.map((palette) => (
                        <PaletteButton
                          key={palette.slug}
                          label={palette.label}
                          primary={palette.primary}
                          secondary={palette.secondary}
                          background={palette.background}
                          text={palette.text}
                          onApply={onApplyPalette}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {settingsTab === "typography" ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--color-foreground)]">Tipografia</h4>
              <div className="rounded-xl border border-[var(--color-border)] p-3">
                <Label className="text-[var(--color-foreground)]">Família da fonte</Label>
                <Select
                  className="mt-2"
                  value={documentState.styles.typography.fontFamily}
                  onChange={(event) =>
                    onChangeDocument((prev) => ({
                      ...prev,
                      styles: {
                        ...prev.styles,
                        typography: {
                          ...prev.styles.typography,
                          fontFamily: event.target.value as FontFamily,
                        },
                      },
                    }))
                  }
                >
                  <option>Inter</option>
                  <option>Roboto</option>
                  <option>Open Sans</option>
                  <option>Montserrat</option>
                </Select>
              </div>

              <TypographySlider
                label="Tamanho do título"
                value={documentState.styles.typography.titleSize}
                min={20}
                max={96}
                onChange={(value) =>
                  onChangeDocument((prev) => ({
                    ...prev,
                    styles: {
                      ...prev.styles,
                      typography: { ...prev.styles.typography, titleSize: value },
                    },
                  }))
                }
              />
              <TypographySlider
                label="Tamanho do subtítulo"
                value={documentState.styles.typography.subtitleSize}
                min={14}
                max={34}
                onChange={(value) =>
                  onChangeDocument((prev) => ({
                    ...prev,
                    styles: {
                      ...prev.styles,
                      typography: { ...prev.styles.typography, subtitleSize: value },
                    },
                  }))
                }
              />
              <TypographySlider
                label="Tamanho do corpo"
                value={documentState.styles.typography.bodySize}
                min={12}
                max={24}
                onChange={(value) =>
                  onChangeDocument((prev) => ({
                    ...prev,
                    styles: {
                      ...prev.styles,
                      typography: { ...prev.styles.typography, bodySize: value },
                    },
                  }))
                }
              />

              <div className="rounded-xl border border-[var(--color-border)] p-3">
                <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">Predefinições</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--color-border)] text-xs"
                    onClick={() => onTypographyPreset("small")}
                  >
                    Pequeno
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--color-border)] text-xs"
                    onClick={() => onTypographyPreset("medium")}
                  >
                    Médio
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--color-border)] text-xs"
                    onClick={() => onTypographyPreset("large")}
                  >
                    Grande
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {settingsTab === "layout" ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--color-foreground)]">Layout</h4>
              <SelectorField
                label="Largura da página"
                value={documentState.styles.layout.pageWidth}
                options={["narrow", "medium", "wide"]}
                onChange={(value) =>
                  onChangeDocument((prev) => ({
                    ...prev,
                    styles: {
                      ...prev.styles,
                      layout: { ...prev.styles.layout, pageWidth: value as PageWidth },
                    },
                  }))
                }
              />
              <SelectorField
                label="Espaçamento"
                value={documentState.styles.layout.spacing}
                options={["compact", "normal", "relaxed"]}
                onChange={(value) =>
                  onChangeDocument((prev) => ({
                    ...prev,
                    styles: {
                      ...prev.styles,
                      layout: { ...prev.styles.layout, spacing: value as Spacing },
                    },
                  }))
                }
              />
              <TypographySlider
                label="Raio da borda"
                value={documentState.styles.layout.borderRadius}
                min={8}
                max={32}
                onChange={(value) =>
                  onChangeDocument((prev) => ({
                    ...prev,
                    styles: {
                      ...prev.styles,
                      layout: { ...prev.styles.layout, borderRadius: value },
                    },
                  }))
                }
              />
              <TypographySlider
                label="Intensidade da sombra"
                value={documentState.styles.layout.shadowIntensity}
                min={1}
                max={10}
                onChange={(value) =>
                  onChangeDocument((prev) => ({
                    ...prev,
                    styles: {
                      ...prev.styles,
                      layout: { ...prev.styles.layout, shadowIntensity: value },
                    },
                  }))
                }
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): JSX.Element {
  const normalized = String(value ?? "").trim();
  const isDefined = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(normalized);
  const pickerValue = isDefined ? normalized : "#d4d4d8";

  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <Label className="text-[var(--color-foreground)]">{label}</Label>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          className="h-7 w-7 cursor-pointer appearance-none overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-card)] p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
        <span className="text-[11px] text-[var(--color-muted-foreground)]">
          {isDefined ? normalized : "Não selecionada"}
        </span>
      </div>
    </div>
  );
}

function TypographySlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input
        type="range"
        className="w-full accent-emerald-500"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function SelectorField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}): JSX.Element {
  const labelMap: Record<string, string> = {
    narrow: "estreita",
    medium: "média",
    wide: "larga",
    compact: "compacto",
    normal: "normal",
    relaxed: "amplo",
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <Label className="text-[var(--color-foreground)]">{label}</Label>
      <Select className="mt-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelMap[option] ?? option}
          </option>
        ))}
      </Select>
    </div>
  );
}

function PaletteButton({
  label,
  primary,
  secondary,
  background,
  text,
  onApply,
}: {
  label: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  onApply: (primary: string, secondary: string, background: string, text: string) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className="h-[66px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1.5 text-left text-xs text-[var(--color-foreground)] transition hover:border-emerald-500/40 hover:bg-[var(--color-accent)]"
      onClick={() => onApply(primary, secondary, background, text)}
      title={label}
    >
      <p className="truncate text-[13px] font-medium leading-tight">{label}</p>
      <div className="mt-1.5 flex gap-1">
        <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: primary }} />
        <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: secondary }} />
        <span
          className="h-3.5 w-3.5 rounded-full border border-black/15"
          style={{ backgroundColor: background }}
        />
        <span
          className="h-3.5 w-3.5 rounded-full border border-black/15"
          style={{ backgroundColor: text }}
        />
      </div>
    </button>
  );
}
