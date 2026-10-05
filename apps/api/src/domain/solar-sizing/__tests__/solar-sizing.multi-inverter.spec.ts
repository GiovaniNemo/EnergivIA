import { describe, it, expect } from "vitest";
import { sizeSolarSystem } from "../solar-sizing.service";
import type { ProductWithSpecs } from "../types";
import type { ModuleSpec, StringInverterSpec } from "../../product-specs";

describe("Solar Sizing - Multi-Inverter & Single Priority", () => {
  const sampleModule: ProductWithSpecs<ModuleSpec> = {
    id: "mod-550",
    name: "Painel 550W Canadian Solar",
    brandName: "Canadian Solar",
    price: 450,
    specs: {
      power_w: 550,
      voc: 49.8,
      vmp: 41.9,
      isc: 14.0,
      imp: 13.13,
      efficiency: 21.3,
      max_system_voltage: 1500,
      width_mm: 1134,
      height_mm: 2278,
    },
  };

  const inverter10k: ProductWithSpecs<StringInverterSpec> = {
    id: "inv-10k-growatt",
    name: "Inversor Growatt 10kW Trifásico",
    brandName: "Growatt",
    price: 4500,
    specs: {
      type: "string",
      nominal_power_w: 10000,
      max_dc_power: 15000,
      max_dc_voltage: 1000,
      mppt_count: 2,
      max_strings_per_mppt: 2,
      mppt_voltage_min: 160,
      mppt_voltage_max: 850,
      max_input_current: 26,
      recommended_dc_ac_ratio_min: 1.0,
      recommended_dc_ac_ratio_max: 1.5,
    },
  };

  const inverter5k: ProductWithSpecs<StringInverterSpec> = {
    id: "inv-5k-growatt",
    name: "Inversor Growatt 5kW Monofásico",
    brandName: "Growatt",
    price: 2500,
    specs: {
      type: "string",
      nominal_power_w: 5000,
      max_dc_power: 7500,
      max_dc_voltage: 550,
      mppt_count: 2,
      max_strings_per_mppt: 1,
      mppt_voltage_min: 100,
      mppt_voltage_max: 500,
      max_input_current: 16,
      recommended_dc_ac_ratio_min: 1.0,
      recommended_dc_ac_ratio_max: 1.5,
    },
  };

  const inverter50k: ProductWithSpecs<StringInverterSpec> = {
    id: "inv-50k-goodwe",
    name: "Inversor GoodWe 50kW Trifásico",
    brandName: "GoodWe",
    price: 18000,
    specs: {
      type: "string",
      nominal_power_w: 50000,
      max_dc_power: 75000,
      max_dc_voltage: 1100,
      mppt_count: 4,
      max_strings_per_mppt: 2,
      mppt_voltage_min: 200,
      mppt_voltage_max: 950,
      max_input_current: 30,
      recommended_dc_ac_ratio_min: 1.0,
      recommended_dc_ac_ratio_max: 1.5,
    },
  };

  const inverter60k: ProductWithSpecs<StringInverterSpec> = {
    id: "inv-60k-goodwe",
    name: "Inversor GoodWe 60kW Trifásico",
    brandName: "GoodWe",
    price: 22000,
    specs: {
      type: "string",
      nominal_power_w: 60000,
      max_dc_power: 90000,
      max_dc_voltage: 1100,
      mppt_count: 6,
      max_strings_per_mppt: 2,
      mppt_voltage_min: 200,
      mppt_voltage_max: 950,
      max_input_current: 30,
      recommended_dc_ac_ratio_min: 1.0,
      recommended_dc_ac_ratio_max: 1.5,
    },
  };

  const stringInverters = [inverter5k, inverter10k, inverter50k, inverter60k];

  it("prioritizes 1 single inverter when capacity and overload fit", () => {
    // 40 kWp system: 50kW inverter easily fits
    const result = sizeSolarSystem({
      system_kw: 40,
      modules: [sampleModule],
      stringInverters,
      microInverters: [],
    });

    expect(result).not.toBeNull();
    expect(result).toHaveProperty("inverter_quantity", 1);
    if (result && "inverter" in result) {
      expect(result.inverter.id).toBe(inverter50k.id);
    }
  });

  it("automatically scales to multiple identical inverters when system exceeds the largest available inverter", () => {
    // 120 kWp system: largest inverter is 60kW (max 90kW DC).
    // A single inverter cannot handle 120kWp. It should automatically scale to 2x GoodWe inverters (e.g. 50kW or 60kW).
    const result = sizeSolarSystem({
      system_kw: 120,
      modules: [sampleModule],
      stringInverters,
      microInverters: [],
    });

    expect(result).not.toBeNull();
    expect(result).toHaveProperty("inverter_quantity", 2);
    if (result && "inverter" in result) {
      expect(result.inverter.brandName).toBe("GoodWe");
      expect(["inv-50k-goodwe", "inv-60k-goodwe"]).toContain(result.inverter.id);
    }
  });

  it("scales to multiple inverters for very large commercial plants (e.g. 180 kWp)", () => {
    // 180 kWp system: 180 / 2 = 90kW DC (only 60kW GoodWe handles up to 90kW DC)
    // or 180 / 3 = 60kW DC (50kW GoodWe)
    const result = sizeSolarSystem({
      system_kw: 180,
      modules: [sampleModule],
      stringInverters,
      microInverters: [],
    });

    expect(result).not.toBeNull();
    if (result && "inverter_quantity" in result) {
      expect(result.inverter_quantity).toBeGreaterThanOrEqual(2);
      expect(result.inverter.brandName).toBe("GoodWe");
    }
  });

  it("respects manual target_inverter_qty override for smaller systems", () => {
    // 10 kWp system normally takes 1x 10kW inverter.
    // If integrator manually requests 2 inverters, it should size with 2x 5kW inverters of the same brand.
    const result = sizeSolarSystem({
      system_kw: 10,
      target_inverter_qty: 2,
      modules: [sampleModule],
      stringInverters,
      microInverters: [],
    });

    expect(result).not.toBeNull();
    expect(result).toHaveProperty("inverter_quantity", 2);
    if (result && "inverter" in result) {
      expect(result.inverter.id).toBe(inverter5k.id);
    }
  });
});
