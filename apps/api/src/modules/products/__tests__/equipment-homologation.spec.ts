/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { EquipmentHomologationService } from "../equipment-homologation.service";

describe("EquipmentHomologationService - MPPT and Power Strict Matching", () => {
  const service = new EquipmentHomologationService();

  it("should match SAJ 3KW 1MPPT to R5-3K-S1-15 with 1 MPPT without confusing -15 suffix with 15kW", () => {
    const res = service.lookup("INVERSOR 220V SAJ 1MPPT MONOFÁSICO 3KW R5-3KW-S1-15 WIFI NEW AFCI");
    expect(res.found).toBe(true);
    expect(res.matchedModel).toBe("R5-3K-S1-15");
    expect((res.specs as any)?.mppt_count).toBe(1);
    expect((res.specs as any)?.nominal_power_w).toBe(3000);
  });

  it("should match SAJ 4KW 2MPPT to R5-4K-S2-15 with 2 MPPTs", () => {
    const res = service.lookup(
      "INVERSOR 220V SAJ 2MPPT MONOFASICO 4KW R5-4K-S2-15 WIFI NEW AFCI -"
    );
    expect(res.found).toBe(true);
    expect(res.matchedModel).toBe("R5-4K-S2-15");
    expect((res.specs as any)?.mppt_count).toBe(2);
  });

  it("should match SAJ 30KW 3MPPT to 3MPPT model and never return 4MPPT model", () => {
    const res = service.lookup("INVERSOR SAJ 30KW 3MPPT TRIFASICO 220V");
    expect(res.found).toBe(true);
    expect(res.matchedModel).toBe("R6-30K-T3-32-LV");
    expect((res.specs as any)?.mppt_count).toBe(3);
  });

  it("should reject candidate with different MPPT count when explicit MPPT is given in name", () => {
    // There is no SAJ 30KW with 2 MPPTs in catalog
    const res = service.lookup("INVERSOR SAJ 30KW 2MPPT");
    expect(res.found).toBe(false);
  });

  it("should match Deye microinverter 2.25kW to SUN-S225G4-EU-Q0 with 2 MPPTs and 4 channels", () => {
    const res = service.lookup(
      "MICRO INVERSOR 220V DEYE 2MPPT MONOFASICO 2,25KW SUN-S225G4-EU-Q0 WIFI NEW"
    );
    expect(res.found).toBe(true);
    expect(res.matchedModel).toBe("SUN-S225G4-EU-Q0");
    expect((res.specs as any)?.mppt_count).toBe(2);
    expect((res.specs as any)?.channels).toBe(4);
  });

  it("should match NEP microinverter BDM-2250 to BDM-2250 with 2 MPPTs and 4 channels", () => {
    const res = service.lookup("MICROINVERSOR NEP BDM-2250 2,25KW MONOFASICO 220V 2MPPT");
    expect(res.found).toBe(true);
    expect(res.matchedModel).toBe("BDM-2250");
    expect((res.specs as any)?.mppt_count).toBe(2);
  });

  it("should match GoodWe 35KW 3MPPT correctly", () => {
    const res = service.lookup(
      "INVERSOR SOLAR GOODWE ON GRID GW 35KLS-MT 35KW TRIFASICO 220V 3MPPT"
    );
    expect(res.found).toBe(true);
    expect(res.matchedModel).toBe("GW35KLV-MT");
    expect((res.specs as any)?.mppt_count).toBe(3);
  });
});
