"use client";

import { useWatch } from "react-hook-form";
import { Card, Box, Typography, Chip } from "@mui/material";
import { normalizeCategory } from "@/lib/product-specs-status";
import type { CategoryName } from "@/lib/admin/schemas";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import BoltIcon from "@mui/icons-material/Bolt";

interface SpecsPreviewCardProps {
  categoryName: CategoryName | string | null;
}

function formatTopology(topo?: unknown): string {
  if (!topo) return "";
  const s = String(topo).toLowerCase();
  if (s.includes("mono_220") || s === "mono") return "Monofásico 220V";
  if (s.includes("biphasic") || s.includes("bifasico") || s.includes("127_220"))
    return "Bifásico 127V/220V";
  if (s.includes("tri_380") || s.includes("380")) return "Trifásico 380V";
  if (s.includes("tri_220") || s.includes("220")) return "Trifásico 220V";
  if (s.includes("mono_127")) return "Monofásico 127V";
  return String(topo);
}

function formatRoof(roof?: unknown): string {
  if (!roof) return "";
  const s = String(roof).toLowerCase();
  if (s.includes("ceram")) return "Cerâmico (Colonial)";
  if (s.includes("fibromadeira")) return "Fibrocimento / Madeira";
  if (s.includes("fibrometal")) return "Fibrocimento / Metal";
  if (s.includes("metal")) return "Metálico";
  if (s.includes("ground") || s.includes("solo")) return "Solo";
  if (s.includes("laje")) return "Laje";
  return String(roof);
}

export function SpecsPreviewCard({ categoryName }: SpecsPreviewCardProps): JSX.Element {
  const specs = useWatch({ name: "specs" }) as Record<string, unknown> | undefined;
  const normCategory = normalizeCategory(categoryName);

  if (!normCategory || !specs || Object.keys(specs).length === 0) {
    return (
      <Card
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2,
          bgcolor: "background.paper",
          borderColor: "var(--color-border)",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Preencha as especificações para ver o resumo.
        </Typography>
      </Card>
    );
  }

  const items: Array<{ label: string; highlight?: boolean }> = [];

  if (
    normCategory === "inverter" ||
    normCategory === "hybrid_inverter" ||
    normCategory === "off_grid_inverter"
  ) {
    const nominalW = specs["nominal_power_w"];
    const maxDcW = specs["max_dc_power"] ?? specs["max_pv_power_w"];
    const topo = specs["grid_topology"] || specs["output_voltage_v"];
    const mppt = specs["mppt_count"];
    const stringsPerMppt = specs["max_strings_per_mppt"];
    const maxVdc = specs["max_dc_voltage"];
    const mpptMin = specs["mppt_voltage_min"];
    const mpptMax = specs["mppt_voltage_max"];
    const maxI = specs["max_input_current"];
    const warranty = specs["warranty_years"];

    if (nominalW != null) {
      const numW = Number(nominalW);
      const kw = numW >= 1000 ? `${(numW / 1000).toFixed(1).replace(/\.0$/, "")} kW` : `${numW}W`;
      items.push({ label: `Potência CA: ${kw} (${numW}W)`, highlight: true });
    }
    if (topo) {
      items.push({ label: formatTopology(topo) });
    }
    if (maxDcW != null) {
      items.push({ label: `Potência DC máx: ${maxDcW}W` });
    }
    if (mppt != null) {
      const strInfo = stringsPerMppt ? ` (${stringsPerMppt} str/MPPT)` : "";
      items.push({ label: `${mppt} MPPTs${strInfo}` });
    }
    if (mpptMin != null && mpptMax != null) {
      items.push({ label: `Faixa MPPT: ${mpptMin}V – ${mpptMax}V` });
    }
    if (maxVdc != null) {
      items.push({ label: `Tensão DC máx: ${maxVdc}V` });
    }
    if (maxI != null) {
      items.push({ label: `Corrente máx: ${maxI}A` });
    }

    if (normCategory === "hybrid_inverter") {
      const bType = specs["battery_voltage_type"];
      const bVolt = specs["battery_nominal_voltage_v"];
      const epsPower = specs["eps_nominal_power_w"];
      if (bType) {
        items.push({
          label:
            bType === "high_voltage" ? "Bateria: Alta Tensão (HV)" : "Bateria: Baixa Tensão (48V)",
          highlight: true,
        });
      } else if (bVolt) {
        items.push({ label: `Bateria: ${bVolt}V`, highlight: true });
      }
      if (epsPower) {
        items.push({ label: `Backup / EPS: ${epsPower}W` });
      }
    }

    if (warranty != null) {
      items.push({ label: `Garantia: ${warranty} anos` });
    }
  } else if (normCategory === "microinverter") {
    const nominalW = specs["nominal_power_w"];
    const ch = specs["channels"] ?? specs["mppt_count"];
    const maxP = specs["max_module_power"];
    const maxV = specs["max_input_voltage"] ?? specs["max_dc_voltage"];
    const warranty = specs["warranty_years"];

    if (nominalW != null) {
      items.push({ label: `Potência: ${nominalW}W`, highlight: true });
    }
    if (ch != null) {
      items.push({ label: `${ch} canais / entradas independentes`, highlight: true });
    }
    if (maxP != null) {
      items.push({ label: `Módulos recomendados até: ${maxP}W` });
    }
    if (maxV != null) {
      items.push({ label: `Tensão máx entrada: ${maxV}V` });
    }
    if (warranty != null) {
      items.push({ label: `Garantia: ${warranty} anos` });
    }
  } else if (normCategory === "module") {
    const power = specs["power_w"];
    const isTier1 = specs["is_tier_1"];
    const cellType = specs["cell_type"];
    const isBifacial = specs["is_bifacial"];
    const warranty = specs["warranty_years"];
    const voc = specs["voc"];
    const vmp = specs["vmp"];
    const imp = specs["imp"];
    const isc = specs["isc"];
    const eff = specs["efficiency"];

    if (power != null) items.push({ label: `${power}W`, highlight: true });
    if (isTier1) items.push({ label: "Selo Tier 1 (BloombergNEF)", highlight: true });
    if (isBifacial) items.push({ label: "Bifacial" });
    if (cellType) items.push({ label: String(cellType) });
    if (eff != null) items.push({ label: `Eficiência: ${eff}%` });
    if (voc != null && vmp != null) items.push({ label: `Vmp: ${vmp}V · Voc: ${voc}V` });
    else if (voc != null) items.push({ label: `Voc: ${voc}V` });
    if (imp != null && isc != null) items.push({ label: `Imp: ${imp}A · Isc: ${isc}A` });
    else if (imp != null) items.push({ label: `Imp: ${imp}A` });
    if (warranty != null) items.push({ label: `Garantia: ${warranty} anos` });
  } else if (normCategory === "battery") {
    const kwh = specs["nominal_capacity_kwh"] ?? specs["capacity_kwh"];
    const ah = specs["nominal_capacity_ah"] ?? specs["capacity_ah"];
    const volt = specs["nominal_voltage_v"];
    const chem = specs["chemistry"] ?? specs["battery_type"];
    const cycles = specs["cycle_life"] ?? specs["cycles"];
    const warranty = specs["warranty_years"];

    if (kwh != null) items.push({ label: `Capacidade: ${kwh} kWh`, highlight: true });
    if (ah != null) items.push({ label: `${ah} Ah` });
    if (volt != null) items.push({ label: `Tensão: ${volt}V` });
    if (chem != null) items.push({ label: String(chem) });
    if (cycles != null) items.push({ label: `${cycles} ciclos úteis` });
    if (warranty != null) items.push({ label: `Garantia: ${warranty} anos` });
  } else if (normCategory === "bms") {
    const volt = specs["nominal_voltage_v"] ?? specs["max_voltage_v"];
    const current = specs["max_current_a"];
    if (volt != null) items.push({ label: `Tensão máx: ${volt}V`, highlight: true });
    if (current != null) items.push({ label: `Corrente máx: ${current}A` });
  } else if (normCategory === "structure_kit") {
    const roof = specs["roof_type"];
    const max = specs["max_modules"];
    const mat = specs["material"];
    if (roof != null) items.push({ label: `Telhado: ${formatRoof(roof)}`, highlight: true });
    if (max != null) items.push({ label: `Até ${max} módulos` });
    if (mat != null) items.push({ label: String(mat) });
  } else if (normCategory === "dc_cable") {
    const sec = specs["section_mm2"];
    const v = specs["max_voltage"];
    const color = specs["color"];
    const roll = specs["roll_length_m"];
    if (sec != null) items.push({ label: `${sec} mm²`, highlight: true });
    if (v != null) items.push({ label: `${v}V` });
    if (color != null) items.push({ label: String(color).toUpperCase() });
    if (roll != null) items.push({ label: `Bobina: ${roll}m` });
  } else if (normCategory === "connector") {
    const t = specs["type"];
    const current = specs["rated_current_a"];
    const v = specs["rated_voltage_v"];
    if (t != null) items.push({ label: `Tipo: ${String(t).toUpperCase()}`, highlight: true });
    if (current != null) items.push({ label: `${current}A` });
    if (v != null) items.push({ label: `${v}V` });
  } else if (normCategory === "string_box") {
    const inputs = specs["inputs"] ?? specs["strings_in"];
    const outputs = specs["outputs"] ?? specs["strings_out"];
    const v = specs["max_voltage_v"] ?? specs["max_voltage"];
    if (inputs != null || outputs != null) {
      items.push({
        label: `${inputs || 1} Entrada(s) / ${outputs || 1} Saída(s)`,
        highlight: true,
      });
    }
    if (v != null) items.push({ label: `${v}V DC` });
  } else if (normCategory === "profile") {
    const len = specs["length_mm"];
    const mat = specs["material"];
    if (len != null) items.push({ label: `${len} mm`, highlight: true });
    if (mat != null) items.push({ label: String(mat) });
  }

  // Dynamic Fallback: se nenhum item acima casou, mas há chaves em specs preenchidas
  if (items.length === 0) {
    Object.entries(specs).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "" && typeof v !== "object") {
        const cleanKey = k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        items.push({ label: `${cleanKey}: ${String(v)}` });
      }
    });
  }

  if (items.length === 0) {
    return (
      <Card
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2,
          bgcolor: "background.paper",
          borderColor: "var(--color-border)",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Preencha as especificações para ver o resumo.
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        bgcolor: "background.paper",
        borderColor: "rgba(16, 185, 129, 0.3)",
        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.05)",
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <BoltIcon sx={{ color: "#10b981", fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
          Resumo Técnico Oficial
        </Typography>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={1}>
        {items.map((item, idx) => (
          <Chip
            key={idx}
            size="small"
            icon={<CheckCircleOutlinedIcon sx={{ fontSize: "14px !important" }} />}
            label={item.label}
            sx={{
              fontWeight: item.highlight ? 700 : 500,
              bgcolor: item.highlight ? "rgba(16, 185, 129, 0.15)" : "action.hover",
              color: item.highlight ? "#10b981" : "text.primary",
              border: item.highlight
                ? "1px solid rgba(16, 185, 129, 0.4)"
                : "1px solid var(--color-border)",
              borderRadius: "8px",
            }}
          />
        ))}
      </Box>
    </Card>
  );
}
