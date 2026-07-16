import type { EnergyBillExtractedPayload, SystemSizingInputJson } from "@/lib/leads-api";
import { sizingBillHistoryFromExtracted as sizingBillHistoryFromExtractedCore } from "@energivia/proposal-economia";

export type BillConsumptionForChart = {
  monthlyAverageKwh: number;
  billConsumptionHistoryKwh?: number[];
  billConsumptionHistoryLabeled?: Array<{ month: string; consumptionKwh: number }>;
  billReferenceMonth?: string;
};

function expandTwoDigitYear(yy: number): number {
  if (yy >= 100) return yy;
  return yy >= 70 ? 1900 + yy : 2000 + yy;
}

const MONTH_ABBR: Record<string, number> = {
  JAN: 0,
  FEV: 1,
  MAR: 2,
  ABR: 3,
  MAI: 4,
  JUN: 5,
  JUL: 6,
  AGO: 7,
  SET: 8,
  OUT: 9,
  NOV: 10,
  DEZ: 11,
};

export function parseBillMonthYear(
  label: string,
  defaultYear?: number
): { monthIndex: number; year: number } | null {
  const raw = label.trim().toUpperCase();
  const num = raw.match(/^(\d{1,2})[\s/.-](\d{2}|\d{4})$/);
  if (num) {
    const mm = Number(num[1]);
    const ys = num[2]!;
    const yy = Number(ys);
    if (mm >= 1 && mm <= 12) {
      const year = ys.length === 4 ? yy : expandTwoDigitYear(yy);
      return { monthIndex: mm - 1, year };
    }
  }
  const mon = raw.match(/^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)(?:EIRO)?/i);
  if (mon) {
    const abbr = mon[1]!.toUpperCase().slice(0, 3) as keyof typeof MONTH_ABBR;
    const mi = MONTH_ABBR[abbr];
    if (mi === undefined) return null;
    const rest = raw.slice(mon[0]!.length).replace(/^[\s/.-]*/, "");
    const yr = rest.match(/^(\d{2}|\d{4})/);
    const year = yr
      ? String(yr[1]).length === 4
        ? Number(yr[1])
        : expandTwoDigitYear(Number(yr[1]))
      : (defaultYear ?? new Date().getFullYear());
    return { monthIndex: mi, year };
  }
  return null;
}

function ymSerial(y: number, m: number): number {
  return y * 12 + m;
}

function filledWithAverage(avg: number): number[] {
  const a = Math.max(1, Math.round(avg));
  return Array.from({ length: 12 }, () => a);
}

export function buildTwelveMonthConsumptionFromBill(
  input: BillConsumptionForChart
): number[] | null {
  const avg = input.monthlyAverageKwh;
  if (!Number.isFinite(avg) || avg <= 0) return null;

  const refParsed = input.billReferenceMonth ? parseBillMonthYear(input.billReferenceMonth) : null;
  const defaultYear = refParsed?.year;

  if (input.billConsumptionHistoryLabeled?.length) {
    const series = filledWithAverage(avg);
    const bestByCalendarMonth = new Map<number, { serial: number; kwh: number }>();
    for (const row of input.billConsumptionHistoryLabeled) {
      const p = parseBillMonthYear(row.month, defaultYear);
      if (!p) continue;
      const k = Math.round(Number(row.consumptionKwh));
      if (!Number.isFinite(k) || k <= 0 || k >= 200_000) continue;
      const serial = ymSerial(p.year, p.monthIndex);
      const prev = bestByCalendarMonth.get(p.monthIndex);
      if (!prev || serial >= prev.serial) {
        bestByCalendarMonth.set(p.monthIndex, { serial, kwh: k });
      }
    }
    if (bestByCalendarMonth.size === 0) return null;
    for (let m = 0; m < 12; m++) {
      const v = bestByCalendarMonth.get(m);
      if (v) series[m] = v.kwh;
    }
    return series;
  }

  const seq = input.billConsumptionHistoryKwh;
  if (!seq?.length || !refParsed) return null;

  const points: { serial: number; kwh: number }[] = [];
  let serial = ymSerial(refParsed.year, refParsed.monthIndex);
  for (const raw of seq) {
    const k = Math.round(Number(raw));
    if (!Number.isFinite(k) || k <= 0 || k >= 200_000) continue;
    points.push({ serial, kwh: k });
    serial -= 1;
  }
  if (!points.length) return null;

  const series = filledWithAverage(avg);
  for (let m = 0; m < 12; m++) {
    let best: { serial: number; kwh: number } | null = null;
    for (const p of points) {
      const mi = ((p.serial % 12) + 12) % 12;
      if (mi !== m) continue;
      if (!best || p.serial > best.serial) best = p;
    }
    if (best) series[m] = best.kwh;
  }
  return series;
}

export function consumptionSeriesFromSizing(
  sizing: SystemSizingInputJson | null | undefined
): number[] | null {
  if (!sizing?.monthlyConsumptionKwh) return null;
  return buildTwelveMonthConsumptionFromBill({
    monthlyAverageKwh: sizing.monthlyConsumptionKwh,
    billConsumptionHistoryKwh: sizing.billConsumptionHistoryKwh,
    billConsumptionHistoryLabeled: sizing.billConsumptionHistoryLabeled,
    billReferenceMonth: sizing.billReferenceMonth,
  });
}

export function sizingBillHistoryFromExtracted(
  extracted: EnergyBillExtractedPayload | null | undefined
): Pick<
  SystemSizingInputJson,
  "billConsumptionHistoryKwh" | "billConsumptionHistoryLabeled" | "billReferenceMonth"
> {
  return sizingBillHistoryFromExtractedCore(extracted);
}
