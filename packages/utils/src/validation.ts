const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;

function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function at(s: string, i: number): string {
  return s.charAt(i);
}

export function isValidCpf(value: string): boolean {
  const digits = stripNonDigits(value);
  if (digits.length !== CPF_LENGTH) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(at(digits, i), 10) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(at(digits, 9), 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(at(digits, i), 10) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(at(digits, 10), 10);
}

export function isValidCnpj(value: string): boolean {
  const digits = stripNonDigits(value);
  if (digits.length !== CNPJ_LENGTH) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(at(digits, i), 10) * weights1[i]!;
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(at(digits, 12), 10)) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(at(digits, i), 10) * weights2[i]!;
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return digit2 === parseInt(at(digits, 13), 10);
}

export function isValidBrazilianPhone(value: string): boolean {
  const digits = stripNonDigits(value);
  return digits.length >= 10 && digits.length <= 11;
}

export function parseOptionalCpfCnpj(raw: string | undefined | null): string | undefined | null {
  if (raw == null || !String(raw).trim()) return undefined;
  const digits = stripNonDigits(String(raw));
  if (digits.length === 0) return undefined;
  if (isValidCpf(digits)) return digits;
  if (isValidCnpj(digits)) return digits;
  return null;
}
