/**
 * Utilitários para extração de tags de indicação (referral) em mensagens de WhatsApp
 * e normalização flexível de números de telefone para cruzamento cadastral.
 */

/**
 * Extrai o código do parceiro/vendedor de um texto inicial de mensagem.
 * Suporta formatos:
 * - (ref: codigo) ou [ref: codigo]
 * - ref: codigo ou ref=codigo
 * - #codigo
 * - indicação: codigo ou parceiro: codigo
 */
export function extractReferralCodeFromText(text?: string | null): string | null {
  if (!text || typeof text !== "string") return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Padrão explícito: ref[:=\s_#-]+([a-zA-Z0-9_-]+)
  const refMatch = trimmed.match(/(?:ref|referral)[:=\s_#-]+([a-zA-Z0-9_-]{2,60})/i);
  if (refMatch && refMatch[1]) {
    return refMatch[1].toLowerCase().trim();
  }

  // 2. Padrão em português: indicação:, indicacao: ou parceiro:
  const ptMatch = trimmed.match(
    /(?:indica[çc][ãa]o|parceiro|vendedor)[:=\s_#-]+([a-zA-Z0-9_-]{2,60})/i
  );
  if (ptMatch && ptMatch[1]) {
    return ptMatch[1].toLowerCase().trim();
  }

  // 3. Padrão hashtag: #codigo (ex: #giovani ou #solar-tech)
  const hashMatch = trimmed.match(/#([a-zA-Z0-9_-]{3,60})/i);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1].toLowerCase().trim();
  }

  return null;
}

/**
 * Remove qualquer caractere não numérico da string de telefone.
 */
export function cleanPhoneDigits(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/\D/g, "");
}

/**
 * Gera variantes de telefone para busca resiliente no banco de dados.
 * Lida com presença/ausência de DDI (55) e o 9º dígito móvel brasileiro.
 */
export function buildPhoneMatchingVariants(raw?: string | null): string[] {
  const digits = cleanPhoneDigits(raw);
  if (!digits || digits.length < 10) return [];

  const variants = new Set<string>();

  // Normaliza tirando o DDI 55 inicial se tiver 12 ou 13 dígitos
  let localDigits = digits;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    localDigits = digits.slice(2);
  }

  // Agora localDigits deve ter 10 (DDD + 8 dígitos) ou 11 (DDD + 9 dígitos)
  if (localDigits.length === 10 || localDigits.length === 11) {
    const ddd = localDigits.slice(0, 2);
    const rest = localDigits.slice(2);

    // Variante com 9 dígitos
    let with9 = localDigits;
    let without9 = localDigits;

    if (localDigits.length === 10) {
      with9 = `${ddd}9${rest}`;
      without9 = localDigits;
    } else if (localDigits.length === 11) {
      with9 = localDigits;
      if (rest.startsWith("9")) {
        without9 = `${ddd}${rest.slice(1)}`;
      }
    }

    variants.add(without9);
    variants.add(`55${without9}`);
    variants.add(with9);
    variants.add(`55${with9}`);
  } else {
    // Se for formato internacional ou diferente, adiciona os dígitos puros
    variants.add(digits);
    if (!digits.startsWith("55")) {
      variants.add(`55${digits}`);
    } else {
      variants.add(digits.slice(2));
    }
  }

  return Array.from(variants).filter((v) => v.length >= 10);
}
