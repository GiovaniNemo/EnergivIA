import type { GenerateKitResult } from "./types";

export function formatKitForWhatsApp(kit: GenerateKitResult): string {
  const lines: string[] = [];

  lines.push("⚡ *Sistema Solar*");
  lines.push("");
  lines.push(`Potência: *${kit.system_power_kw} kWp*`);
  lines.push("");

  lines.push("*Equipamentos*");
  const mod = kit.modules;
  lines.push(`${mod.quantity}x ${mod.brand_name} ${mod.product_name}`);
  const inv = kit.inverter;
  lines.push(`${inv.quantity}x ${inv.brand_name} ${inv.product_name}`);
  lines.push("");

  if (kit.string_configuration) {
    lines.push("*Configuração*");
    const sc = kit.string_configuration;
    lines.push(`${sc.string_count} strings de ${sc.modules_per_string} módulos`);
    lines.push("");
  }

  lines.push("*Kit de instalação*");
  const bos = kit.kit_items.filter(
    (item) =>
      item.product_id !== kit.modules.product_id && item.product_id !== kit.inverter.product_id
  );
  for (const item of bos) {
    const unit = item.product_name.toLowerCase().includes("cabo") ? "m" : "";
    const qty = unit ? `${item.quantity}${unit}` : `${item.quantity}x`;
    lines.push(`${qty} ${item.product_name}`);
  }

  return lines.join("\n");
}
