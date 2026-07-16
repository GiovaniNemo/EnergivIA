export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskWhatsappBr(value: string): string {
  let d = digitsOnly(value);
  if (!d) return "";

  if (d.startsWith("55")) {
    if (d.length <= 2) {
      return d.length === 1 ? "+5" : "+55";
    }
    d = d.slice(0, 13);
    const rest = d.slice(2);
    if (rest.length <= 2) return `+55 (${rest}`;
    if (rest.length <= 6) return `+55 (${rest.slice(0, 2)}) ${rest.slice(2)}`;
    if (rest.length <= 10) {
      return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 6)}-${rest.slice(6)}`;
    }
    return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7)}`;
  }

  d = d.slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskMoneyBrlFromDigits(digits: string): string {
  const d = digitsOnly(digits);
  if (!d) return "";
  const cents = parseInt(d, 10);
  if (!Number.isFinite(cents)) return "";
  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseMoneyBrlDisplay(display: string): number {
  const d = digitsOnly(display);
  if (!d) return 0;
  const cents = parseInt(d, 10);
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
}

export function maskCpfCnpj(value: string): string {
  const d = digitsOnly(value).slice(0, 14);
  if (!d) return "";
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
