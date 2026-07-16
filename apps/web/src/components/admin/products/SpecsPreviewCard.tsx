"use client";

import { useWatch } from "react-hook-form";
import { Card, Typography } from "@mui/material";
import type { CategoryName } from "@/lib/admin/schemas";

interface SpecsPreviewCardProps {
  categoryName: CategoryName | null;
}

export function SpecsPreviewCard({ categoryName }: SpecsPreviewCardProps): JSX.Element {
  const specs = useWatch({ name: "specs" }) as Record<string, unknown> | undefined;

  if (!categoryName || !specs || Object.keys(specs).length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Preencha as especificações para ver o resumo.
        </Typography>
      </Card>
    );
  }

  const lines: string[] = [];

  if (categoryName === "module") {
    const power = specs["power_w"];
    const voc = specs["voc"];
    const imp = specs["imp"];
    if (power != null) lines.push(`${power}W`);
    if (voc != null) lines.push(`Voc: ${voc}V`);
    if (imp != null) lines.push(`Imp: ${imp}A`);
  } else if (categoryName === "inverter") {
    const maxDc = specs["max_dc_power"];
    const mppt = specs["mppt_count"];
    if (maxDc != null) lines.push(`Potência DC máx: ${maxDc}W`);
    if (mppt != null) lines.push(`${mppt} MPPTs`);
  } else if (categoryName === "microinverter") {
    const ch = specs["channels"];
    const maxP = specs["max_module_power"];
    if (ch != null) lines.push(`${ch} canais`);
    if (maxP != null) lines.push(`Módulo máx: ${maxP}W`);
  } else if (categoryName === "structure_kit") {
    const roof = specs["roof_type"];
    const max = specs["max_modules"];
    if (roof != null) lines.push(`Telhado: ${String(roof)}`);
    if (max != null) lines.push(`Até ${max} módulos`);
  } else if (categoryName === "dc_cable") {
    const sec = specs["section_mm2"];
    const v = specs["max_voltage"];
    if (sec != null) lines.push(`${sec} mm²`);
    if (v != null) lines.push(`${v}V`);
  } else if (categoryName === "connector") {
    const t = specs["type"];
    if (t != null) lines.push(String(t).toUpperCase());
  }

  if (lines.length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Preencha as especificações para ver o resumo.
        </Typography>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Resumo técnico
      </Typography>
      <Typography variant="body2" component="div">
        {lines.join(" · ")}
      </Typography>
    </Card>
  );
}
