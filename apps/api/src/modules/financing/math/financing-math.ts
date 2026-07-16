export const IOF_UPFRONT_RATE = 0.0038;

export const IOF_DAILY_RATE_PF = 0.000082;

export const IOF_DAILY_RATE_PJ = 0.0000411;

export const IOF_DAILY_CAP_DAYS = 365;

export type PersonType = "PF" | "PJ";

export function calculateIof(
  principal: number,
  termMonths: number,
  personType: PersonType
): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const upfront = principal * IOF_UPFRONT_RATE;
  const days = Math.min(termMonths * 30, IOF_DAILY_CAP_DAYS);
  const dailyRate = personType === "PJ" ? IOF_DAILY_RATE_PJ : IOF_DAILY_RATE_PF;
  const daily = principal * dailyRate * days;
  return Math.round((upfront + daily) * 100) / 100;
}

export function pmt(principal: number, monthlyRate: number, n: number): number {
  if (
    !isFinitePositive(principal) ||
    !Number.isFinite(monthlyRate) ||
    !Number.isInteger(n) ||
    n <= 0
  ) {
    throw new Error(
      `pmt: argumentos inválidos (principal=${principal}, monthlyRate=${monthlyRate}, n=${n})`
    );
  }
  if (monthlyRate === 0) return roundCurrency(principal / n);
  const factor = Math.pow(1 + monthlyRate, -n);
  return roundCurrency((principal * monthlyRate) / (1 - factor));
}

export function totalAmount(installment: number, n: number): number {
  return roundCurrency(installment * n);
}

export function cetMonthly(
  principal: number,
  installment: number,
  n: number,
  extraMonthlyFee = 0,
  iof = 0,
  upfrontFee = 0
): number {
  const pmtEffective = installment + extraMonthlyFee;
  if (pmtEffective <= 0 || principal <= 0 || n <= 0) return 0;
  const netReceived = principal - iof - upfrontFee;
  if (netReceived <= 0) return 0;

  const npv = (r: number): number => {
    if (r === 0) return -netReceived + pmtEffective * n;
    let total = -netReceived;
    let discount = 1 + r;
    let pow = discount;
    for (let k = 1; k <= n; k++) {
      total += pmtEffective / pow;
      pow *= discount;
    }
    return total;
  };

  let r = 0.02;
  for (let i = 0; i < 50; i++) {
    const f = npv(r);
    if (Math.abs(f) < 1e-9) return roundRate(r);
    const h = 1e-6;
    const dfdr = (npv(r + h) - f) / h;
    if (!Number.isFinite(dfdr) || dfdr === 0) break;
    const next = r - f / dfdr;
    if (!Number.isFinite(next) || next < -0.999) break;
    if (Math.abs(next - r) < 1e-10) return roundRate(next);
    r = next;
  }

  let lo = 0;
  let hi = 5;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const f = npv(mid);
    if (Math.abs(f) < 1e-9) return roundRate(mid);
    if (f > 0) lo = mid;
    else hi = mid;
  }
  return roundRate((lo + hi) / 2);
}

export function monthlyToAnnualRate(monthlyRate: number): number {
  return roundRate(Math.pow(1 + monthlyRate, 12) - 1);
}

export function scoreOffer(
  offer: { installmentValue: number; cetMonthly: number },
  baseline: { minInstallment: number; minCet: number }
): number {
  const installmentRatio =
    baseline.minInstallment > 0
      ? Math.min(1, baseline.minInstallment / Math.max(offer.installmentValue, 1))
      : 0;
  const cetRatio =
    baseline.minCet > 0 ? Math.min(1, baseline.minCet / Math.max(offer.cetMonthly, 1e-9)) : 1;
  const raw = 0.6 * installmentRatio + 0.4 * cetRatio;
  return Math.round(Math.max(0, Math.min(1, raw)) * 10000) / 10000;
}

function isFinitePositive(v: number): boolean {
  return Number.isFinite(v) && v > 0;
}

function roundCurrency(v: number): number {
  return Math.round(v * 100) / 100;
}

function roundRate(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}
