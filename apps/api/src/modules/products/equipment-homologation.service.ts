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
        "GOODWE 37.5KW",
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
        recommended_dc_ac_ratio_max: 2.0,
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
      aliases: ["GW25K-SMT", "GW25K-SMT-L", "25K-SMT", "GOODWE 25KW"],
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
        recommended_dc_ac_ratio_max: 2.0,
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
      aliases: ["GW30K-SMT", "GW30K-SMT-L", "30K-SMT", "GOODWE 30KW"],
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
        recommended_dc_ac_ratio_max: 2.0,
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
      aliases: ["GW50K-SMT", "50K-SMT", "GOODWE 50KW"],
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
        recommended_dc_ac_ratio_max: 1.5,
        warranty_years: 5,
        grid_topology: "tri_380",
        grid_standard: "TRI_380",
        output_voltage_v: "380V/220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "GoodWe",
      model: "GW23KLV-SDT-BR30",
      category: "inverter",
      aliases: ["GW23KLV-SDT-BR30", "GW23KLV-SDT", "23KLV-SDT", "GOODWE 23KW 220V"],
      specs: {
        nominal_power_w: 23000,
        max_dc_power: 41400,
        max_dc_voltage: 850,
        mppt_count: 3,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 140,
        mppt_voltage_max: 700,
        max_input_current: 42,
        max_short_circuit_current_a: 52.5,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.8,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 97.8,
      },
    },
    {
      brand: "GoodWe",
      model: "GW17KLV-SDT-C30",
      category: "inverter",
      aliases: ["GW17KLV-SDT-C30", "GW17KLV-SDT", "17KLV-SDT", "GOODWE 17KW 220V"],
      specs: {
        nominal_power_w: 17000,
        max_dc_power: 30600,
        max_dc_voltage: 850,
        mppt_count: 2,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 140,
        mppt_voltage_max: 700,
        max_input_current: 42,
        max_short_circuit_current_a: 52.5,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.8,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 97.5,
      },
    },
    {
      brand: "GoodWe",
      model: "GW5K-DNS-G40",
      category: "inverter",
      aliases: ["GW5K-DNS-G40", "GW5K-DNS", "DNS-G40 5KW", "GOODWE 5KW DNS"],
      specs: {
        nominal_power_w: 5000,
        max_dc_power: 10000,
        max_dc_voltage: 600,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 40,
        mppt_voltage_max: 560,
        max_input_current: 20,
        max_short_circuit_current_a: 26,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 98.0,
      },
    },
    {
      brand: "GoodWe",
      model: "GW6K-DNS-G40",
      category: "inverter",
      aliases: ["GW6K-DNS-G40", "GW6000-DNS-G40", "GW6K-DNS", "DNS-G40 6KW", "GOODWE 6KW DNS"],
      specs: {
        nominal_power_w: 6000,
        max_dc_power: 12000,
        max_dc_voltage: 600,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 40,
        mppt_voltage_max: 560,
        max_input_current: 20,
        max_short_circuit_current_a: 26,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 98.0,
      },
    },
    {
      brand: "GoodWe",
      model: "GW10K-MS-G40",
      category: "inverter",
      aliases: ["GW10K-MS-G40", "GW10K-MS", "MS-G40 10KW", "GOODWE 10KW MS"],
      specs: {
        nominal_power_w: 10000,
        max_dc_power: 20000,
        max_dc_voltage: 600,
        mppt_count: 3,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 40,
        mppt_voltage_max: 560,
        max_input_current: 20,
        max_short_circuit_current_a: 26,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 97.9,
      },
    },
    {
      brand: "GoodWe",
      model: "GW8.5K-MS-G40",
      category: "inverter",
      aliases: ["GW8.5K-MS-G40", "MS-G40 8.5KW", "GOODWE 8.5KW MS"],
      specs: {
        nominal_power_w: 8500,
        max_dc_power: 17000,
        max_dc_voltage: 600,
        mppt_count: 3,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 40,
        mppt_voltage_max: 560,
        max_input_current: 20,
        max_short_circuit_current_a: 26,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 97.9,
      },
    },
    {
      brand: "GoodWe",
      model: "GW7.5K-MS-G41",
      category: "inverter",
      aliases: ["GW7.5K-MS-G41", "MS-G41 7.5KW", "GOODWE 7.5KW MS"],
      specs: {
        nominal_power_w: 7500,
        max_dc_power: 13500,
        max_dc_voltage: 600,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 40,
        mppt_voltage_max: 560,
        max_input_current: 20,
        max_short_circuit_current_a: 26,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.8,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 97.8,
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
    // SAJ - Família C6 Trifásico 380V (T6 / 6 MPPTs / 380V)
    // ==========================================
    {
      brand: "SAJ",
      model: "C6-75K-T6-40",
      category: "inverter",
      aliases: [
        "C6-75K-T6-40",
        "C6-75K-T6",
        "75K-T6-40",
        "75K-T6",
        "SAJ 6MPPT 75KW",
        "SAJ 380V 75KW",
        "380V SAJ 75KW",
      ],
      inmetroCode: "006911/2025",
      specs: {
        nominal_power_w: 75000,
        max_dc_power: 144000,
        max_dc_voltage: 1100,
        mppt_count: 6,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 40,
        max_short_circuit_current_a: 50,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 5,
        grid_topology: "tri_380",
        grid_standard: "TRI_380",
        output_voltage_v: "380V/220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "SAJ",
      model: "C6-60K-T6-40",
      category: "inverter",
      aliases: [
        "C6-60K-T6-40",
        "C6-60K-T6",
        "60K-T6-40",
        "60K-T6",
        "SAJ 6MPPT 60KW",
        "SAJ 380V 60KW",
      ],
      specs: {
        nominal_power_w: 60000,
        max_dc_power: 115000,
        max_dc_voltage: 1100,
        mppt_count: 6,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 40,
        max_short_circuit_current_a: 50,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 5,
        grid_topology: "tri_380",
        grid_standard: "TRI_380",
        output_voltage_v: "380V/220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "SAJ",
      model: "C6-50K-T5-40",
      category: "inverter",
      aliases: [
        "C6-50K-T5-40",
        "C6-50K-T5",
        "50K-T5-40",
        "50K-T5",
        "SAJ 5MPPT 50KW",
        "SAJ 380V 50KW",
      ],
      specs: {
        nominal_power_w: 50000,
        max_dc_power: 96000,
        max_dc_voltage: 1100,
        mppt_count: 5,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 40,
        max_short_circuit_current_a: 50,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 5,
        grid_topology: "tri_380",
        grid_standard: "TRI_380",
        output_voltage_v: "380V/220V",
        efficiency: 98.8,
      },
    },

    // ==========================================
    // SAJ - Família C6 LV Trifásico 220V (T12 / T9 / T6)
    // ==========================================
    {
      brand: "SAJ",
      model: "C6-75K-T12-LV-40",
      category: "inverter",
      aliases: [
        "C6-75K-T12-LV-40",
        "C6-75K-T12-LV",
        "C6-75K-T12",
        "C6-75K-LV",
        "75K-T12-LV-40",
        "75K-T12-LV",
        "75K-T12",
        "SAJ 12MPPT 75KW",
        "SAJ 220V 75KW",
        "SAJ 75KW 220V",
      ],
      inmetroCode: "003281/2025",
      specs: {
        nominal_power_w: 75000,
        max_dc_power: 150000,
        max_dc_voltage: 1100,
        mppt_count: 12,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 40,
        max_short_circuit_current_a: 50,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "SAJ",
      model: "C6-60K-T9-LV-40",
      category: "inverter",
      aliases: [
        "C6-60K-T9-LV-40",
        "C6-60K-T9-LV",
        "C6-60K",
        "C6 60K",
        "60K-T9-LV",
        "SAJ 60KW",
        "SAJ 60K",
      ],
      specs: {
        nominal_power_w: 60000,
        max_dc_power: 120000,
        max_dc_voltage: 1100,
        mppt_count: 9,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 40,
        max_short_circuit_current_a: 50,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "SAJ",
      model: "C6-50K-T6-LV-40",
      category: "inverter",
      aliases: [
        "C6-50K-T6-LV-40",
        "C6-50K-T6-LV",
        "C6-50K",
        "C6 50K",
        "50K-T6-LV",
        "SAJ 50KW",
        "SAJ 50K",
      ],
      specs: {
        nominal_power_w: 50000,
        max_dc_power: 100000,
        max_dc_voltage: 1100,
        mppt_count: 6,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 40,
        max_short_circuit_current_a: 50,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 5,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "SAJ",
      model: "R5-5K-S2-15",
      category: "inverter",
      aliases: ["R5-5K-S2-15", "R5-5K-S2", "R5 5K", "SAJ 5KW", "SAJ 5K"],
      specs: {
        nominal_power_w: 5000,
        max_dc_power: 7500,
        max_dc_voltage: 550,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 80,
        mppt_voltage_max: 500,
        max_input_current: 15,
        max_short_circuit_current_a: 18,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.5,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 98.2,
      },
    },
    {
      brand: "SAJ",
      model: "R5-8K-S2-15",
      category: "inverter",
      aliases: ["R5-8K-S2-15", "R5-8K-S2", "R5 8K", "SAJ 8KW", "SAJ 8K"],
      specs: {
        nominal_power_w: 8000,
        max_dc_power: 12000,
        max_dc_voltage: 550,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 80,
        mppt_voltage_max: 500,
        max_input_current: 15,
        max_short_circuit_current_a: 18,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.5,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 98.2,
      },
    },
    {
      brand: "SAJ",
      model: "R5-10K-S2-15",
      category: "inverter",
      aliases: ["R5-10K-S2-15", "R5-10K-S2", "R5 10K", "SAJ 10KW", "SAJ 10K"],
      specs: {
        nominal_power_w: 10000,
        max_dc_power: 15000,
        max_dc_voltage: 550,
        mppt_count: 2,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 80,
        mppt_voltage_max: 500,
        max_input_current: 15,
        max_short_circuit_current_a: 18,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 1.5,
        warranty_years: 10,
        grid_topology: "mono_220",
        grid_standard: "EU",
        output_voltage_v: "220V",
        efficiency: 98.2,
      },
    },

    // ==========================================
    // HOYMILES - Microinversores
    // ==========================================
    {
      brand: "Hoymiles",
      model: "HMS-2000-4T",
      category: "microinverter",
      aliases: ["HMS-2000-4T", "HMS-2000", "HMS2000", "HOYMILES 2000", "HMS 2000"],
      inmetroCode: "001479/2023",
      specs: {
        nominal_power_w: 2000,
        channels: 4,
        mppt_count: 4,
        max_input_voltage: 65,
        mppt_voltage_min: 16,
        mppt_voltage_max: 60,
        max_input_current: 16,
        max_module_power: 670,
        warranty_years: 12,
        efficiency: 96.7,
        output_voltage_v: "220V",
      },
    },
    {
      brand: "Hoymiles",
      model: "HMS-1800-4T",
      category: "microinverter",
      aliases: ["HMS-1800-4T", "HMS-1800", "HMS1800", "HOYMILES 1800", "HMS 1800"],
      specs: {
        nominal_power_w: 1800,
        channels: 4,
        mppt_count: 4,
        max_input_voltage: 65,
        mppt_voltage_min: 16,
        mppt_voltage_max: 60,
        max_input_current: 15,
        max_module_power: 600,
        warranty_years: 12,
        efficiency: 96.7,
        output_voltage_v: "220V",
      },
    },

    // ==========================================
    // SAJ - Família R6 LV Trifásico 220V (12K, 15K, 20K, 25K)
    // ==========================================
    {
      brand: "SAJ",
      model: "R6-15K-T2-32-LV",
      category: "inverter",
      aliases: [
        "R6-15K-T2-32-LV",
        "R6-15K-T2-32",
        "R6-15K-T2-LV",
        "R6-15K-T2",
        "R6-15K-LV",
        "R6-15K",
        "R6 15K",
        "15K-T2-32-LV",
        "15K-T2-LV",
        "SAJ 15KW",
        "SAJ 15K",
      ],
      specs: {
        nominal_power_w: 15000,
        max_dc_power: 30000,
        max_dc_voltage: 1100,
        mppt_count: 2,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 32,
        max_short_circuit_current_a: 38.4,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 10,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "SAJ",
      model: "R6-20K-T2-32-LV",
      category: "inverter",
      aliases: [
        "R6-20K-T2-32-LV",
        "R6-20K-T2-32",
        "R6-20K-T2",
        "R6-20K",
        "R6 20K",
        "20K-T2-32-LV",
        "SAJ 20KW",
        "SAJ 20K",
      ],
      specs: {
        nominal_power_w: 20000,
        max_dc_power: 40000,
        max_dc_voltage: 1100,
        mppt_count: 2,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 32,
        max_short_circuit_current_a: 38.4,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 10,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "SAJ",
      model: "R6-25K-T2-32-LV",
      category: "inverter",
      aliases: [
        "R6-25K-T2-32-LV",
        "R6-25K-T2-32",
        "R6-25K-T2",
        "R6-25K",
        "R6 25K",
        "25K-T2-32-LV",
        "SAJ 25KW",
        "SAJ 25K",
      ],
      specs: {
        nominal_power_w: 25000,
        max_dc_power: 50000,
        max_dc_voltage: 1100,
        mppt_count: 2,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 32,
        max_short_circuit_current_a: 38.4,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 10,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "SAJ",
      model: "R6-30K-T4-32-LV",
      category: "inverter",
      aliases: [
        "R6-30K-T4-32-LV",
        "R6-30K-T4-32",
        "R6-30K-T4",
        "R6-30K-LV",
        "R6-30K",
        "R6 30K",
        "30K-T4-32-LV",
        "SAJ 30KW 220V",
        "SAJ 30KW",
        "SAJ 30K",
        "SAJ 4MPPT 30KW",
        "INVERSOR 220V SAJ 4MPPT TRIFASICO 30KW",
      ],
      specs: {
        nominal_power_w: 30000,
        max_dc_power: 60000,
        max_dc_voltage: 1100,
        mppt_count: 4,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 32,
        max_short_circuit_current_a: 40,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 10,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },
    {
      brand: "SAJ",
      model: "R6-12K-T2-32-LV",
      category: "inverter",
      aliases: [
        "R6-12K-T2-32-LV",
        "R6-12K-T2-32",
        "R6-12K-T2",
        "R6-12K",
        "R6 12K",
        "12K-T2-32-LV",
        "SAJ 12KW",
        "SAJ 12K",
      ],
      specs: {
        nominal_power_w: 12000,
        max_dc_power: 24000,
        max_dc_voltage: 1100,
        mppt_count: 2,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 180,
        mppt_voltage_max: 1000,
        max_input_current: 32,
        max_short_circuit_current_a: 38.4,
        recommended_dc_ac_ratio_min: 1.05,
        recommended_dc_ac_ratio_max: 2.0,
        warranty_years: 10,
        grid_topology: "tri_220",
        grid_standard: "TRI_220",
        output_voltage_v: "220V",
        efficiency: 98.8,
      },
    },

    // ==========================================
    // MÓDULOS FOTOVOLTAICOS POPULARES
    // ==========================================
    {
      brand: "Canadian Solar",
      model: "CS6W-585TB-AG (585W TOPCon)",
      category: "module",
      aliases: ["CS6W-585", "585W CANADIAN", "CANADIAN 585", "TOPCON 585"],
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
      aliases: ["CS6W-550", "550W CANADIAN", "CANADIAN 550"],
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
      aliases: ["JKM580", "580W JINKO", "JINKO 580", "TOPCON 580"],
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

    const has380 = cleanInput.includes("380V") || cleanInput.includes("380 V");
    const has220 = cleanInput.includes("220V") || cleanInput.includes("220 V");

    const isVoltageCompatible = (itemSpecs: Record<string, unknown>): boolean => {
      const top = String(itemSpecs["grid_topology"] || "");
      if (has380 && !has220) {
        if (top === "tri_220" || top === "mono_220") return false;
      }
      if (has220 && !has380) {
        if (top === "tri_380") return false;
      }
      return true;
    };

    // Identifica se alguma marca do catálogo está explicitamente presente no nome
    const allBrands = Array.from(new Set(this.catalog.map((i) => i.brand.toUpperCase())));
    const detectedBrands = allBrands.filter((brandName) => {
      const parts = brandName.split(/\s+/).filter((p) => p.length >= 3);
      return parts.some((p) => {
        const regex = new RegExp(`(?:^|[^A-Z0-9])${p}(?:[^A-Z0-9]|$)`);
        return regex.test(cleanInput);
      });
    });

    const isBrandCompatible = (itemBrand: string): boolean => {
      if (detectedBrands.length === 0) return true;
      const bUpper = itemBrand.toUpperCase();
      return detectedBrands.some((db) => bUpper.includes(db) || db.includes(bUpper));
    };

    const testItem = (item: HomologatedEquipment) => {
      if (!isVoltageCompatible(item.specs)) return null;

      const cleanModel = item.model
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (cleanInput.includes(cleanModel)) {
        return { type: "exato", item };
      }

      for (const alias of item.aliases) {
        const cleanAlias = alias
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (cleanInput.includes(cleanAlias)) {
          return { type: `alias "${alias}"`, item };
        }

        const compactAlias = cleanAlias.replace(/[^A-Z0-9]/g, "");
        const compactInput = cleanInput.replace(/[^A-Z0-9]/g, "");
        if (compactAlias.length >= 4 && compactInput.includes(compactAlias)) {
          return { type: `alias compacto "${compactAlias}"`, item };
        }
      }

      return null;
    };

    // 1. PRIORIDADE MÁXIMA: Se uma marca foi identificada no nome, busca dentro dos equipamentos da própria marca
    if (detectedBrands.length > 0) {
      for (const item of this.catalog) {
        if (!isBrandCompatible(item.brand)) continue;
        const res = testItem(item);
        if (res) {
          this.logger.log(
            `Match com marca prioritária (${res.type}): ${item.brand} - ${item.model}`
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

    // 2. Busca geral por modelo ou alias (respeitando que se uma marca foi detectada, não cruza com marcas rivais)
    for (const item of this.catalog) {
      if (detectedBrands.length > 0 && !isBrandCompatible(item.brand)) continue;
      const res = testItem(item);
      if (res) {
        this.logger.log(`Match encontrado (${res.type}): ${item.brand} - ${item.model}`);
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

    // 3. Busca combinada de Marca + Potência (ex: "GOODWE" + "37.5" ou "GROWATT" + "25")
    for (const item of this.catalog) {
      if (!isVoltageCompatible(item.specs)) continue;
      if (detectedBrands.length > 0 && !isBrandCompatible(item.brand)) continue;

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
          const escaped = powerStr.replace(".", "[.,]");
          // Exige que o número de potência não seja parte de outro número maior (ex: 15kW não pode bater com 5kW)
          // Para potências de um único dígito (< 10kW), exige explicitamente unidade "KW" ou "K" para não confundir com números de MPPTs/strings
          const regexStrict =
            powerKw < 10
              ? new RegExp(`(?:^|[^0-9])${escaped}\\s*(?:KW|K)(?:[^0-9]|$)`, "i")
              : new RegExp(`(?:^|[^0-9])${escaped}\\s*(?:KW|K)?(?:[^0-9]|$)`, "i");

          if (regexStrict.test(cleanInput)) {
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
