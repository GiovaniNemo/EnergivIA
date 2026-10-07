import { describe, it, expect } from "vitest";
import { buildProposalEquipmentItemsFromKit } from "../proposal-equipment-model";

describe("buildProposalEquipmentItemsFromKit", () => {
  it("should cleanly strip markdown stars, bullets and parse multiplier quantity from productName", () => {
    const rawItems = [
      {
        productName: "** 6x Astronergy 580W",
        brandName: "ASTRONERGY",
        quantity: 1,
        categoryName: "equipment",
      },
      {
        productName: "** 1x Solplanet 3kW",
        brandName: "",
        quantity: 1,
        categoryName: "equipment",
      },
    ];

    const result = buildProposalEquipmentItemsFromKit(rawItems);
    expect(result).toHaveLength(2);

    const moduleItem = result.find((it) => it.categoryName === "module");
    expect(moduleItem).toBeDefined();
    expect(moduleItem?.subtitle).not.toContain("**");
    expect(moduleItem?.subtitle).toBe("Astronergy 580W");
    expect(moduleItem?.title).toBe("Módulo fotovoltaico — ASTRONERGY");

    // Quantity spec should reflect the 6 modules, not 1 unidade
    const qtySpec = moduleItem?.specs.find((s) => s.label === "Quantidade");
    expect(qtySpec?.value).toBe("6 unidades");

    const inverterItem = result.find((it) => it.categoryName === "inverter");
    expect(inverterItem).toBeDefined();
    expect(inverterItem?.subtitle).not.toContain("**");
    expect(inverterItem?.subtitle).toBe("Solplanet 3kW");
    expect(inverterItem?.title).toBe("Inversor — Solplanet");
  });

  it("should deduplicate identical equipment items and consolidate duplicate cards", () => {
    // Reproduction of the bug where multiple tiers were dumped into kitItems:
    // 2x Astronergy 580W, 1x OSDA 620W, and 3x Solplanet 3kW
    const multiTierDump = [
      {
        productName: "** 6x Astronergy 580W",
        brandName: "ASTRONERGY",
        quantity: 1,
        categoryName: "equipment",
      },
      {
        productName: "** 6x Astronergy 580W",
        brandName: "ASTRONERGY",
        quantity: 1,
        categoryName: "equipment",
      },
      {
        productName: "** 6x OSDA Solar 620W",
        brandName: "OSDA",
        quantity: 1,
        categoryName: "equipment",
      },
      {
        productName: "** 1x Solplanet 3kW",
        brandName: "",
        quantity: 1,
        categoryName: "equipment",
      },
      {
        productName: "** 1x Solplanet 3kW",
        brandName: "",
        quantity: 1,
        categoryName: "equipment",
      },
      {
        productName: "** 1x Solplanet 3kW",
        brandName: "",
        quantity: 1,
        categoryName: "equipment",
      },
    ];

    const result = buildProposalEquipmentItemsFromKit(multiTierDump);

    // It should NEVER produce 6 cards with repeated items
    // Should have exactly 1 module card and 1 inverter card for the chosen primary kit
    const moduleCards = result.filter((it) => it.categoryName === "module");
    const inverterCards = result.filter(
      (it) => it.categoryName === "inverter" || it.categoryName === "microinverter"
    );

    expect(moduleCards.length).toBe(1);
    expect(inverterCards.length).toBe(1);

    expect(moduleCards[0].title).toBe("Módulo fotovoltaico — ASTRONERGY");
    expect(moduleCards[0].subtitle).toBe("Astronergy 580W");
    expect(moduleCards[0].specs.find((s) => s.label === "Quantidade")?.value).toBe("6 unidades");

    expect(inverterCards[0].title).toBe("Inversor — Solplanet");
    expect(inverterCards[0].subtitle).toBe("Solplanet 3kW");
    expect(inverterCards[0].specs.find((s) => s.label === "Quantidade")?.value).toBe("1 unidade");
  });

  it("should preserve multiple distinct inverters if it is a multi-inverter commercial system", () => {
    // When kit genuinely has 2x 75kW inverters
    const genuineMultiInverter = [
      {
        productName: "Módulo Canadian 600W",
        brandName: "Canadian Solar",
        quantity: 150,
        categoryName: "module",
      },
      {
        productName: "Inversor Growatt 75kW",
        brandName: "Growatt",
        quantity: 2,
        categoryName: "inverter",
      },
    ];

    const result = buildProposalEquipmentItemsFromKit(genuineMultiInverter);
    expect(result).toHaveLength(2);
    const invCard = result.find((it) => it.categoryName === "inverter");
    expect(invCard?.specs.find((s) => s.label === "Quantidade")?.value).toBe("2 unidades");
  });
});
