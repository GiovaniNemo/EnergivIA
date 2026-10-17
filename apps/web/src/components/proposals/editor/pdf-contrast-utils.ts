/**
 * Utilitários de alto contraste e legibilidade estrita para renderização de PDF.
 * Garante contraste cromático (WCAG AA+) entre o fundo da página e os textos,
 * evitando letras escuras sobre fundos escuros ou imagens cortadas.
 */

export function getHexRelativeLuminance(value: string | undefined): number {
  if (!value) return 0.5;
  const normalized = value.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return 0.5;
  const parsed = Number.parseInt(expanded, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export interface ContrastSafeBranding {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
}

function isNeutralLightColor(hex: string): boolean {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return false;
  const parsed = Number.parseInt(expanded, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  const minVal = Math.min(r, g, b);
  const maxVal = Math.max(r, g, b);
  return minVal >= 200 && maxVal - minVal <= 35;
}

function isNeutralDarkColor(hex: string): boolean {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return false;
  const parsed = Number.parseInt(expanded, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  const minVal = Math.min(r, g, b);
  const maxVal = Math.max(r, g, b);
  return maxVal <= 70 && maxVal - minVal <= 30;
}

/**
 * Garante que a paleta de cores usada para renderizar o PDF tenha contraste perfeito.
 * No PDF corporativo executivo, a apresentação é construída sobre base escura (fundo cósmico/orbital #060b16).
 * Por isso, no PDF as letras de leitura corporativa são SEMPRE claras (#f8fafc / #ffffff),
 * impedindo texto escuro (#0f172a) ou esmaecido que desapareça contra o fundo.
 */
export function enforceHighContrastBranding<
  T extends {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    logoUrl?: string;
  },
>(branding: T, options?: { isPdf?: boolean }): T & ContrastSafeBranding {
  const isPdf = options?.isPdf ?? true;
  const rawBg = branding.backgroundColor?.trim();

  // No PDF, se o fundo for indefinido ou se for claro (ex: #ffffff herdado de template padrão web),
  // normalizamos para o fundo executivo escuro (#060b16) para harmonizar com os anéis orbitais.
  let bg = rawBg || "#060b16";
  if (isPdf && (!rawBg || getHexRelativeLuminance(rawBg) >= 0.45)) {
    bg = "#060b16";
  }

  const isDarkBg = getHexRelativeLuminance(bg) < 0.45;

  let textColor = branding.textColor?.trim();
  if (isDarkBg || isPdf) {
    // Em fundo escuro ou no modo PDF executivo, o texto corporativo é incondicionalmente claro (#f8fafc).
    // Impede tons escuros (#0f172a, #000) e contaminação por tons verdes escuros no texto corrido.
    if (
      !textColor ||
      !isNeutralLightColor(textColor) ||
      getHexRelativeLuminance(textColor) < 0.55
    ) {
      textColor = "#f8fafc";
    }
  } else {
    // Apenas em visualização web em fundo estritamente claro
    if (!textColor || !isNeutralDarkColor(textColor)) {
      textColor = "#0f172a";
    }
  }

  let primaryColor = branding.primaryColor?.trim() || "#22c55e";
  if (isDarkBg && getHexRelativeLuminance(primaryColor) < 0.35) {
    // Evita tons muito escuros de primária que somem no fundo escuro
    primaryColor = "#22c55e";
  } else if (!isDarkBg && getHexRelativeLuminance(primaryColor) > 0.8) {
    // Evita cores primárias excessivamente claras em fundo branco
    primaryColor = "#15803d";
  }

  const secondaryColor = branding.secondaryColor?.trim() || "#10b981";

  return {
    ...branding,
    backgroundColor: bg,
    textColor,
    primaryColor,
    secondaryColor,
  };
}
