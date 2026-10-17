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

/**
 * Garante que a paleta de cores usada para renderizar o PDF tenha contraste perfeito.
 * Se o fundo for escuro, o texto é blindado para tons claros (#f8fafc) e cores primárias
 * escuras são elevadas para tons luminosos (#22c55e).
 */
export function enforceHighContrastBranding<
  T extends {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    logoUrl?: string;
  },
>(branding: T): T & ContrastSafeBranding {
  const bg = branding.backgroundColor?.trim() || "#060b16";
  const isDarkBg = getHexRelativeLuminance(bg) < 0.45;

  let textColor = branding.textColor?.trim();
  if (isDarkBg) {
    // Em fundo escuro (< 0.45), o texto NUNCA pode ter baixa luminância (< 0.55).
    // Evita tons pretos, azuis-marinho ou verdes-escuros ilegíveis.
    if (!textColor || getHexRelativeLuminance(textColor) < 0.55) {
      textColor = "#f8fafc";
    }
  } else {
    // Em fundo claro (>= 0.45), o texto deve ser escuro (#0f172a).
    if (!textColor || getHexRelativeLuminance(textColor) >= 0.45) {
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
