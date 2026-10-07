/**
 * Utilitários para higienização e resolução do nome comercial de empresas
 * em propostas e cadastros (remove números de MEI/EI de CNPJ e detecta fallbacks genéricos).
 */

export function stripCnpjNumbersFromCompanyName(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw
    .replace(/^(\d{2}\.?\d{3}\.?\d{3}(\/?\d{4}-?\d{2})?|\d{14}|\d{8})\s*[-–—]?\s*/i, "")
    .trim();
  return cleaned || raw.trim();
}

export function isGenericOrEnergiviaCompanyName(val: unknown): boolean {
  if (!val || typeof val !== "string") return true;
  const lower = val.trim().toLowerCase();
  return (
    !lower ||
    lower === "solar energia co." ||
    lower === "solar energy co." ||
    lower === "solar prime energia" ||
    lower === "solar prime" ||
    lower === "energivia" ||
    lower === "energivia solar" ||
    lower === "energivia ltda" ||
    lower === "nome da empresa" ||
    lower === "sua empresa" ||
    lower === "sua empresa solar" ||
    /^(\d{2}\.?\d{3}\.?\d{3}|\d{8})/.test(val.trim())
  );
}
