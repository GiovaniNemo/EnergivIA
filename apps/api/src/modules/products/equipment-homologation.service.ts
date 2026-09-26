import { Injectable, Logger } from "@nestjs/common";

export interface HomologatedEquipment {
  brand: string;
  model: string;
  category: "inverter" | "module" | "hybrid_inverter" | "microinverter";
  aliases: string[];
  inmetroCode?: string;
  specs: Record<string, unknown>;
}

@Injectable()
export class EquipmentHomologationService {
  private readonly logger = new Logger(EquipmentHomologationService.name);

  // Catálogo mestre com dados elétricos e mecânicos oficiais e homologados
  private readonly catalog: HomologatedEquipment[] = [
    // ==========================================
    // GOODWE - Família SMT (Trifásicos 220V/380V)
    // ==========================================
    {
      brand: "GoodWe",
      model: "GW37.5K-SMT-L-G20",
      category: "inverter",
      aliases: [
        "GW37.5K-SMT",
        "GW37,5K-SMT",
        "GW37.5K-SMT-L",
        "GW37.5K-SMT-L-G20",
        "GW37500",
        "37.5K-SMT",
        "37,5KW TRIFASICO 220V 4MPPT",
      ],
      inmetroCode: "005298/2023",
      specs: {
        nominal_power_w: 37500,
        max_dc_power: 75000,
        max_dc_voltage: 900,
        mppt_count: 4,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 160,
        mppt_voltage_max: 900,
        max_input_current: 42,
        max_short_circuit_current_a: 52.5,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.4,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.4,
      },
    },
    {
      brand: "GoodWe",
      model: "GW25K-SMT-L-G20",
      category: "inverter",
      aliases: ["GW25K-SMT", "GW25K-SMT-L", "25K-SMT", "25KW TRIFASICO 220V"],
      specs: {
        nominal_power_w: 25000,
        max_dc_power: 50000,
        max_dc_voltage: 900,
        mppt_count: 3,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 160,
        mppt_voltage_max: 900,
        max_input_current: 42,
        max_short_circuit_current_a: 52.5,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.4,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.4,
      },
    },
    {
      brand: "GoodWe",
      model: "GW30K-SMT-L-G20",
      category: "inverter",
      aliases: ["GW30K-SMT", "GW30K-SMT-L", "30K-SMT", "30KW TRIFASICO 220V"],
      specs: {
        nominal_power_w: 30000,
        max_dc_power: 60000,
        max_dc_voltage: 900,
        mppt_count: 3,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 160,
        mppt_voltage_max: 900,
        max_input_current: 42,
        max_short_circuit_current_a: 52.5,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.4,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.4,
      },
    },
    {
      brand: "GoodWe",
      model: "GW50K-SMT-G20",
      category: "inverter",
      aliases: ["GW50K-SMT", "50K-SMT", "50KW TRIFASICO 380V"],
      specs: {
        nominal_power_w: 50000,
        max_dc_power: 75000,
        max_dc_voltage: 1100,
        mppt_count: 5,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 200,
        mppt_voltage_max: 1000,
        max_input_current: 40,
        max_short_circuit_current_a: 50,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.4,
        warranty_years: 5,
        grid_topology: "tri_380",
        grid_standard: "TRI_380",
        output_voltage_v: "380V/220V",
        efficiency: 98.8,
      },
    },

    // ==========================================
    // GROWATT - Família MAC (Trifásicos 220V)
    // ==========================================
    {
      brand: "Growatt",
      model: "MAC 25KTL3-XL",
      category: "inverter",
      aliases: ["MAC 25KTL3", "MAC 25KTL3-XL", "MAC25KTL3", "25KTL3-XL", "MAC 25KW"],
      inmetroCode: "005721/2021",
      specs: {
        nominal_power_w: 25000,
        max_dc_power: 32500,
        max_dc_voltage: 1100,
        mppt_count: 3,
        max_strings_per_mppt: 4,
        mppt_voltage_min: 200,
        mppt_voltage_max: 1000,
        max_input_current: 52,
        max_short_circuit_current_a: 55,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.3,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "Growatt",
      model: "MAC 30KTL3-XL",
      category: "inverter",
      aliases: ["MAC 30KTL3", "MAC 30KTL3-XL", "MAC30KTL3", "30KTL3-XL", "MAC 30KW"],
      specs: {
        nominal_power_w: 30000,
        max_dc_power: 39000,
        max_dc_voltage: 1100,
        mppt_count: 3,
        max_strings_per_mppt: 4,
        mppt_voltage_min: 200,
        mppt_voltage_max: 1000,
        max_input_current: 52,
        max_short_circuit_current_a: 55,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.3,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "Growatt",
      model: "MAC 36KTL3-XL",
      category: "inverter",
      aliases: ["MAC 36KTL3", "MAC 36KTL3-XL", "MAC36KTL3", "36KTL3-XL", "MAC 36KW"],
      specs: {
        nominal_power_w: 36000,
        max_dc_power: 46800,
        max_dc_voltage: 1100,
        mppt_count: 3,
        max_strings_per_mppt: 4,
        mppt_voltage_min: 200,
        mppt_voltage_max: 1000,
        max_input_current: 52,
        max_short_circuit_current_a: 55,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.3,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },

    // ==========================================
    // GROWATT - Família MIN (Monofásicos 220V)
    // ==========================================
    {
      brand: "Growatt",
      model: "MIN 5000TL-X",
      category: "inverter",
      aliases: ["MIN 5000TL", "MIN5000TL-X", "MIN 5000", "5000TL-X"],
      specs: {
        nominal_power_w: 5000,
        max_dc_power: 7000,
        max_dc_voltage: 550,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 80,
        mppt_voltage_max: 500,
        max_input_current: 13.5,
        max_short_circuit_current_a: 16.9,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.4,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 98.2,
      },
    },
    {
      brand: "Growatt",
      model: "MIN 6000TL-X",
      category: "inverter",
      aliases: ["MIN 6000TL", "MIN6000TL-X", "MIN 6000", "6000TL-X"],
      specs: {
        nominal_power_w: 6000,
        max_dc_power: 8400,
        max_dc_voltage: 550,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 80,
        mppt_voltage_max: 500,
        max_input_current: 13.5,
        max_short_circuit_current_a: 16.9,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.4,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 98.4,
      },
    },

    // ==========================================
    // DEYE - String & Híbridos
    // ==========================================
    {
      brand: "Deye",
      model: "SUN-5K-G04",
      category: "inverter",
      aliases: ["SUN-5K-G", "SUN 5K", "DEYE 5KW", "SUN-5K-G03", "SUN-5K-G05"],
      specs: {
        nominal_power_w: 5000,
        max_dc_power: 6500,
        max_dc_voltage: 550,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 80,
        mppt_voltage_max: 500,
        max_input_current: 13,
        max_short_circuit_current_a: 19.5,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.3,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 97.5,
      },
    },
    {
      brand: "Deye",
      model: "SUN-8K-G04",
      category: "inverter",
      aliases: ["SUN-8K-G", "SUN 8K", "DEYE 8KW"],
      specs: {
        nominal_power_w: 8000,
        max_dc_power: 10400,
        max_dc_voltage: 550,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 80,
        mppt_voltage_max: 500,
        max_input_current: 13,
        max_short_circuit_current_a: 19.5,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.3,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 97.5,
      },
    },

    // ==========================================
    // SOLIS - Família S6
    // ==========================================
    {
      brand: "Solis",
      model: "S6-GR1P5K",
      category: "inverter",
      aliases: ["S6-GR1P5K", "SOLIS 5K", "S6 5KW", "GR1P5K"],
      specs: {
        nominal_power_w: 5000,
        max_dc_power: 7500,
        max_dc_voltage: 600,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 90,
        mppt_voltage_max: 520,
        max_input_current: 14,
        max_short_circuit_current_a: 22,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.4,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 97.7,
      },
    },

    // ==========================================
    // MÓDULOS FOTOVOLTAICOS POPULARES
    // ==========================================
    {
      brand: "Canadian Solar",
      model: "CS6W-585TB-AG (585W TOPCon)",
      category: "module",
      aliases: ["CS6W-585", "585W CANADIAN", "CANADIAN 585", "TOPCON 585", "585W"],
      inmetroCode: "008234/2023",
      specs: {
        power_w: 585,
        voc: 51.6,
        vmp: 43.1,
        isc: 14.41,
        imp: 13.58,
        efficiency: 22.6,
        warranty_years: 25,
        width_mm: 1134,
        height_mm: 2278,
        max_system_voltage: 1500,
        temperature_coefficient_pmax: -0.3,
        temperature_coefficient_voc: -0.25,
      },
    },
    {
      brand: "Canadian Solar",
      model: "CS6W-550MS (550W)",
      category: "module",
      aliases: ["CS6W-550", "550W CANADIAN", "CANADIAN 550", "550W"],
      specs: {
        power_w: 550,
        voc: 49.6,
        vmp: 41.7,
        isc: 14.0,
        imp: 13.2,
        efficiency: 21.3,
        warranty_years: 25,
        width_mm: 1134,
        height_mm: 2278,
        max_system_voltage: 1500,
        temperature_coefficient_pmax: -0.34,
        temperature_coefficient_voc: -0.26,
      },
    },
    {
      brand: "Jinko Solar",
      model: "JKM580N-72HL4-V (580W TOPCon)",
      category: "module",
      aliases: ["JKM580", "580W JINKO", "JINKO 580", "TOPCON 580", "580W"],
      specs: {
        power_w: 580,
        voc: 51.48,
        vmp: 42.97,
        isc: 14.28,
        imp: 13.5,
        efficiency: 22.45,
        warranty_years: 25,
        width_mm: 1134,
        height_mm: 2278,
        max_system_voltage: 1500,
        temperature_coefficient_pmax: -0.3,
        temperature_coefficient_voc: -0.25,
      },
    },
    {
      brand: "JA Solar",
      model: "JAM72D40-580/MB (580W Bifacial)",
      category: "module",
      aliases: ["JAM72D40-580", "580W JA SOLAR", "JA SOLAR 580", "580W JA"],
      specs: {
        power_w: 580,
        voc: 51.52,
        vmp: 43.19,
        isc: 14.32,
        imp: 13.43,
        efficiency: 22.5,
        warranty_years: 25,
        width_mm: 1134,
        height_mm: 2278,
        max_system_voltage: 1500,
        temperature_coefficient_pmax: -0.3,
        temperature_coefficient_voc: -0.26,
      },
    },
  ];

  /**
   * Procura o equipamento no catálogo de homologações com busca fonética/fuzzy
   */
  lookup(productName: string): {
    found: boolean;
    source: string;
    matchedModel?: string;
    brand?: string;
    category?: string;
    inmetroCode?: string;
    specs?: Record<string, unknown>;
  } {
    if (!productName || productName.trim().length === 0) {
      return { found: false, source: "INMETRO PBE / Homologações Oficiais" };
    }

    const cleanInput = productName
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/[^A-Z0-9\s.-]/g, " ");

    this.logger.log(`Buscando homologação oficial para produto: "${cleanInput}"`);

    // 1. Busca exata ou por aliases de modelo
    for (const item of this.catalog) {
      // Verifica o modelo principal
      const cleanModel = item.model
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (cleanInput.includes(cleanModel)) {
        this.logger.log(`Match exato encontrado: ${item.brand} - ${item.model}`);
        return {
          found: true,
          source: "INMETRO PBE / Catálogo Homologado",
          matchedModel: item.model,
          brand: item.brand,
          category: item.category,
          inmetroCode: item.inmetroCode,
          specs: item.specs,
        };
      }

      // Verifica aliases
      for (const alias of item.aliases) {
        const cleanAlias = alias
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (cleanInput.includes(cleanAlias)) {
          this.logger.log(`Match por alias "${alias}": ${item.brand} - ${item.model}`);
          return {
            found: true,
            source: "INMETRO PBE / Catálogo Homologado",
            matchedModel: item.model,
            brand: item.brand,
            category: item.category,
            inmetroCode: item.inmetroCode,
            specs: item.specs,
          };
        }
      }
    }

    // 2. Busca combinada de Marca + Potência (ex: "GOODWE" + "37.5" ou "GROWATT" + "25")
    for (const item of this.catalog) {
      const brandUpper = item.brand.toUpperCase();
      if (cleanInput.includes(brandUpper)) {
        // Tenta encontrar número de potência
        const powerKw =
          typeof item.specs["nominal_power_w"] === "number"
            ? (item.specs["nominal_power_w"] as number) / 1000
            : typeof item.specs["power_w"] === "number"
              ? (item.specs["power_w"] as number)
              : null;

        if (powerKw) {
          const powerStr = String(powerKw);
          const powerWithComma = powerStr.replace(".", ",");
          if (cleanInput.includes(powerStr) || cleanInput.includes(powerWithComma)) {
            this.logger.log(
              `Match por Marca + Potência: ${item.brand} (${powerKw}kW) -> ${item.model}`
            );
            return {
              found: true,
              source: "INMETRO PBE / Catálogo Homologado",
              matchedModel: item.model,
              brand: item.brand,
              category: item.category,
              inmetroCode: item.inmetroCode,
              specs: item.specs,
            };
          }
        }
      }
    }

    this.logger.warn(`Nenhuma homologação oficial encontrada para: "${productName}"`);
    return {
      found: false,
      source: "INMETRO PBE / Homologações Oficiais",
    };
  }
}
