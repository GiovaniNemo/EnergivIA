function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || (c === "\r" && !inQuotes)) {
      result.push(current.trim());
      current = "";
      if (c === "\r") break;
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

export interface BulkInventoryRow {
  product_name: string;
  brand: string;
  distributor_sku?: string;
  price: number;
  stock?: number;
  lead_time_days?: number;
  moq?: number;
}

export function parseBulkInventoryCSV(text: string): BulkInventoryRow[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const firstLine = lines[0];
  if (lines.length < 2 || firstLine === undefined) return [];

  const headerLine = parseCSVLine(firstLine);
  const headers = headerLine.map((h) => h.toLowerCase().replace(/\s+/g, "_").trim());
  const rows: BulkInventoryRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });

    const product_name = (row["product_name"] ?? "").trim();
    const brand = (row["brand"] ?? "").trim();
    const priceRaw = (row["price"] ?? "0").trim().replace(",", ".");
    const price = Number(priceRaw);
    if (!product_name || !brand || Number.isNaN(price)) continue;

    rows.push({
      product_name,
      brand,
      distributor_sku: (row["distributor_sku"] ?? "").trim() || undefined,
      price,
      stock: parseOptionalInt(row["stock"]),
      lead_time_days: parseOptionalInt(row["lead_time_days"]),
      moq: parseOptionalInt(row["moq"]),
    });
  }

  return rows;
}

function parseOptionalInt(s: string | undefined): number | undefined {
  if (s === undefined || s === "") return undefined;
  const n = Number(String(s).trim());
  return Number.isNaN(n) ? undefined : n;
}
