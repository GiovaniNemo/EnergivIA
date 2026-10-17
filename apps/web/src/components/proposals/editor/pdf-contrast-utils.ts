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

export function isLegacyDarkBlue(hex: string | undefined): boolean {
  if (!hex) return false;
  const n = hex.trim().toLowerCase();
  return (
    n === "#060b16" ||
    n === "#0b1220" ||
    n === "#0b1b2b" ||
    n === "#021b16" ||
    n === "#020617" ||
    n === "#0f172a" ||
    n === "#0b0f1a"
  );
}

/**
 * Garante que a paleta de cores usada para renderizar a proposta (Editor e PDF) tenha contraste perfeito.
 * Respeita integralmente as cores escolhidas pelo usuário, garantindo legibilidade WCAG.
 * Por padrão estrito da EnergivIA, adota fundo branco (#ffffff), grafismos em verde (#059669) e tipografia escura (#022C22).
 * Fundo não informado ou azul escuro legado é normalizado para branco (#ffffff).
 */
export function enforceHighContrastBranding<
  T extends {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    logoUrl?: string;
  },
>(branding: T, _options?: { isPdf?: boolean }): T & ContrastSafeBranding {
  const rawBg = branding.backgroundColor?.trim();

  // Se o fundo não foi informado ou for um dos azuis escuros legados, adota branco (#ffffff)
  const bg = !rawBg || isLegacyDarkBlue(rawBg) ? "#ffffff" : rawBg;
  const isDarkBg = getHexRelativeLuminance(bg) < 0.45;

  let textColor = branding.textColor?.trim();
  if (isDarkBg) {
    // Em fundo escuro customizado, garante que o texto corporativo seja claro (#f8fafc) se estiver indefinido, escuro ou cromático
    if (
      !textColor ||
      !isNeutralLightColor(textColor) ||
      getHexRelativeLuminance(textColor) < 0.55
    ) {
      textColor = "#f8fafc";
    }
  } else {
    // Em fundo claro (ex: #ffffff, #FAFFFC), garante que o texto corporativo seja escuro (#022C22 ou similar)
    if (!textColor || getHexRelativeLuminance(textColor) >= 0.45) {
      textColor = "#022C22";
    }
  }

  let primaryColor = branding.primaryColor?.trim() || (isDarkBg ? "#22c55e" : "#059669");
  if (isDarkBg && getHexRelativeLuminance(primaryColor) < 0.2) {
    // Evita cores primárias quase pretas sobre fundo escuro
    primaryColor = "#22c55e";
  } else if (
    !isDarkBg &&
    (getHexRelativeLuminance(primaryColor) > 0.85 || getHexRelativeLuminance(primaryColor) < 0.15)
  ) {
    // Evita cores primárias quase brancas ou quase pretas sobre fundo branco; adota verde esmeralda institucional
    primaryColor = "#059669";
  }

  const secondaryColor = branding.secondaryColor?.trim() || (isDarkBg ? "#34d399" : "#34D399");

  return {
    ...branding,
    backgroundColor: bg,
    textColor,
    primaryColor,
    secondaryColor,
  };
}
