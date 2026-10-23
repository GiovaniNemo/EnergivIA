import { describe, expect, it } from "vitest";
import { parseIntegratorQuoteEntities } from "../whatsapp-bot.service";

describe("WhatsApp Bot - parseIntegratorQuoteEntities (Microinverters & Hybrid Batteries)", () => {
  describe("Microinverter Detection", () => {
    it("should detect microinverter when explicit 'microinversor' is used", () => {
      const res = parseIntegratorQuoteEntities(
        "Quero cotar 10 placas de 585w com microinversor em Maringá/PR"
      );
      expect(res.isQuoteRequest).toBe(true);
      expect(res.inverterType).toBe("microinverter");
      expect(res.targetModules).toBe(10);
    });

    it("should detect microinverter with short term 'micro'", () => {
      const res = parseIntegratorQuoteEntities("Cotação 8 placas com micro em Campinas/SP");
      expect(res.isQuoteRequest).toBe(true);
      expect(res.inverterType).toBe("microinverter");
    });

    it("should detect microinverter through recognized brands (Hoymiles, APsystems)", () => {
      const res1 = parseIntegratorQuoteEntities(
        "Cotação 500 kWh com inversor hoymiles em Londrina/PR"
      );
      expect(res1.inverterType).toBe("microinverter");

      const res2 = parseIntegratorQuoteEntities("Sistema 5 kWp apsystems telhado cerâmico");
      expect(res2.inverterType).toBe("microinverter");
    });
  });

  describe("Hybrid Inverter Detection", () => {
    it("should detect hybrid inverter with 'híbrido' / 'hibrido'", () => {
      const res = parseIntegratorQuoteEntities(
        "Cotação 800 kwh com inversor híbrido em Curitiba/PR"
      );
      expect(res.isQuoteRequest).toBe(true);
      expect(res.inverterType).toBe("hybrid");
    });

    it("should detect hybrid inverter with 'hybrid' or 'deye híbrido'", () => {
      const res = parseIntegratorQuoteEntities(
        "Kit 10 kWp deye híbrido com bateria em São Paulo/SP"
      );
      expect(res.isQuoteRequest).toBe(true);
      expect(res.inverterType).toBe("hybrid");
    });

    it("should infer hybrid when batteries are requested without explicit inverter type", () => {
      const res = parseIntegratorQuoteEntities(
        "Cotação 500 kWh com 2 baterias de lítio em Sorocaba/SP"
      );
      expect(res.isQuoteRequest).toBe(true);
      expect(res.inverterType).toBe("hybrid");
      expect(res.hasBattery).toBe(true);
    });
  });

  describe("Battery Capacity & Quantity Parsing", () => {
    it("should parse battery capacity in kWh", () => {
      const res1 = parseIntegratorQuoteEntities("Híbrido deye 5kw com 10.24 kWh de bateria");
      expect(res1.hasBattery).toBe(true);
      expect(res1.batteryKwh).toBe(10.24);

      const res2 = parseIntegratorQuoteEntities("Sistema híbrido 600 kwh com 5kwh bateria");
      expect(res2.hasBattery).toBe(true);
      expect(res2.batteryKwh).toBe(5);
    });

    it("should parse battery count by units (baterias / módulos / packs)", () => {
      const res1 = parseIntegratorQuoteEntities("Inversor híbrido com 2 baterias de lítio");
      expect(res1.hasBattery).toBe(true);
      expect(res1.batteryQty).toBe(2);

      const res2 = parseIntegratorQuoteEntities("Deye HV com 4 módulos de bateria");
      expect(res2.hasBattery).toBe(true);
      expect(res2.batteryQty).toBe(4);
    });

    it("should recognize explicit zero / without battery", () => {
      const res1 = parseIntegratorQuoteEntities("Inversor híbrido deye sem bateria em Maringá");
      expect(res1.inverterType).toBe("hybrid");
      expect(res1.hasBattery).toBe(false);
      expect(res1.batteryQty).toBe(0);

      const res2 = parseIntegratorQuoteEntities("Cotação híbrido com 0 baterias");
      expect(res2.inverterType).toBe("hybrid");
      expect(res2.hasBattery).toBe(false);
      expect(res2.batteryQty).toBe(0);
    });
  });

  describe("Conventional String Inverters Default", () => {
    it("should leave inverterType undefined for conventional quotes so default string is preserved", () => {
      const res = parseIntegratorQuoteEntities(
        "Cotação 450 kWh em Presidente Prudente/SP telhado cerâmico"
      );
      expect(res.isQuoteRequest).toBe(true);
      expect(res.inverterType).toBeUndefined();
      expect(res.hasBattery).toBeFalsy();
    });
  });
});
