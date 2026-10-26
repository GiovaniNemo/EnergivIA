/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { AiExtractionService } from "../ai-extraction.service";

describe("AiExtractionService - Battery Extraction & Sanitization", () => {
  const service = new AiExtractionService({
    get: () => undefined,
  } as any);

  const sanitize = (
    detectedCategory: string,
    rawSpecs: Record<string, unknown>,
    expectedCategory?: string
  ) => {
    return (service as any).sanitizeAndEnrichSpecs(detectedCategory, rawSpecs, expectedCategory);
  };

  it("calculates capacity_kwh automatically from Ah and Voltage if kWh is missing", () => {
    const raw = {
      capacity_ah: 100,
      nominal_voltage_v: 51.2,
    };
    const result = sanitize("battery", raw);
    expect(result.capacity_kwh).toBe(5.12);
    expect(result.capacity_ah).toBe(100);
    expect(result.nominal_voltage_v).toBe(51.2);
  });

  it("calculates capacity_ah automatically from kWh and Voltage if Ah is missing", () => {
    const raw = {
      capacity_kwh: 5.12,
      nominal_voltage_v: 51.2,
    };
    const result = sanitize("battery", raw);
    expect(result.capacity_ah).toBe(100);
    expect(result.capacity_kwh).toBe(5.12);
  });

  it("normalizes chemistry names like LFP and LiFePO4 to lifepo4", () => {
    const res1 = sanitize("battery", { chemistry: "LFP (Lítio Ferro Fosfato)" });
    expect(res1.chemistry).toBe("lifepo4");

    const res2 = sanitize("battery", { chemistry: "LiFePO4" });
    expect(res2.chemistry).toBe("lifepo4");

    const res3 = sanitize("battery", { chemistry: "NMC / Lithium Ion" });
    expect(res3.chemistry).toBe("lithium_ion");
  });

  it("normalizes voltage_type to low_voltage or high_voltage correctly", () => {
    const lv = sanitize("battery", { nominal_voltage_v: 51.2, voltage_type: "LV 48V" });
    expect(lv.voltage_type).toBe("low_voltage");

    const hv = sanitize("battery", { nominal_voltage_v: 204.8, voltage_type: "HV" });
    expect(hv.voltage_type).toBe("high_voltage");

    // Infers high_voltage if nominal_voltage_v > 60V
    const inferredHv = sanitize("battery", { nominal_voltage_v: 102.4 });
    expect(inferredHv.voltage_type).toBe("high_voltage");

    // Infers low_voltage if nominal_voltage_v <= 60V
    const inferredLv = sanitize("battery", { nominal_voltage_v: 48 });
    expect(inferredLv.voltage_type).toBe("low_voltage");
  });

  it("normalizes DoD percentages when reported as decimal (e.g. 0.90 -> 90)", () => {
    const res = sanitize("battery", { dod_percent: 0.9 });
    expect(res.dod_percent).toBe(90);

    const defaultDod = sanitize("battery", {});
    expect(defaultDod.dod_percent).toBe(90);
  });

  it("normalizes cycles when given in thousands (e.g. 6 -> 6000)", () => {
    const res = sanitize("battery", { cycles: 6 });
    expect(res.cycles).toBe(6000);

    const exact = sanitize("battery", { cycles: 6000 });
    expect(exact.cycles).toBe(6000);
  });
});
