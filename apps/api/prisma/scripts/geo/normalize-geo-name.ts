/**
 * Normalizes Brazilian geographic names for matching IBGE ↔ INPE CSV.
 * Uppercase, strip diacritics, collapse whitespace, trim.
 */
export function normalizeGeoName(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  const noDiacritics = trimmed.normalize("NFD").replace(/\p{M}/gu, "");
  return noDiacritics.toUpperCase();
}
