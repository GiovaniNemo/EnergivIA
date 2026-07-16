import "./load-env-for-scripts";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_NAMES = [
  "module",
  "inverter",
  "microinverter",
  "structure_kit",
  "dc_cable",
  "connector",
] as const;

async function main() {
  const categoryIds: Record<string, string> = {};
  for (const name of CATEGORY_NAMES) {
    const cat = await prisma.category.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    categoryIds[name] = cat.id;
  }

  const brandNames = [
    "Canadian Solar",
    "JA Solar",
    "Trina",
    "Growatt",
    "Solis",
    "Hoymiles",
    "APsystems",
    "Genérico",
  ];
  const brandIds: Record<string, string> = {};
  for (const name of brandNames) {
    const existing = await prisma.brand.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      brandIds[name] = existing.id;
    } else {
      const brand = await prisma.brand.create({
        data: { name, country: name === "Genérico" ? "BR" : undefined },
      });
      brandIds[name] = brand.id;
    }
  }

  const supplierNames = [
    { name: "Aldo Solar", cnpj: "00.000.000/0001-91", city: "São Paulo", state: "SP" },
    { name: "Intelbras Distribuição", cnpj: "00.000.000/0002-72", city: "Curitiba", state: "PR" },
    { name: "Minha Casa Solar", cnpj: "00.000.000/0003-53", city: "Belo Horizonte", state: "MG" },
  ];
  const supplierIds: string[] = [];
  for (const s of supplierNames) {
    const existing = await prisma.supplier.findFirst({
      where: { name: { equals: s.name, mode: "insensitive" } },
    });
    if (existing) {
      supplierIds.push(existing.id);
    } else {
      const sup = await prisma.supplier.create({
        data: { name: s.name, cnpj: s.cnpj, city: s.city, state: s.state },
      });
      supplierIds.push(sup.id);
    }
  }

  const distributorDefs = [
    {
      name: "Aldo Solar",
      cnpj: "00.000.000/0001-91",
      email: "vendas@aldosolar.com.br",
      phone: "(11) 3000-0000",
      website: "https://www.aldosolar.com.br",
      city: "São Paulo",
      state: "SP",
    },
    {
      name: "Intelbras Distribuição",
      cnpj: "00.000.000/0002-72",
      email: "solar@intelbras.com.br",
      city: "Curitiba",
      state: "PR",
    },
    {
      name: "Minha Casa Solar",
      cnpj: "00.000.000/0003-53",
      city: "Belo Horizonte",
      state: "MG",
    },
  ];
  const distributorIds: string[] = [];
  for (const d of distributorDefs) {
    const existing = await prisma.distributor.findFirst({
      where: { name: { equals: d.name, mode: "insensitive" } },
    });
    if (existing) {
      distributorIds.push(existing.id);
    } else {
      const dist = await prisma.distributor.create({
        data: {
          name: d.name,
          cnpj: d.cnpj,
          email: "email" in d ? d.email : undefined,
          phone: "phone" in d ? d.phone : undefined,
          website: "website" in d ? d.website : undefined,
          city: d.city,
          state: d.state,
        },
      });
      distributorIds.push(dist.id);
    }
  }

  const productDefs = [
    {
      name: "Canadian 550W",
      brandName: "Canadian Solar",
      categoryName: "module" as const,
      specs: {
        power_w: 550,
        voc: 49.5,
        vmp: 41.5,
        isc: 13.9,
        imp: 13.2,
        efficiency: 21.3,
        max_system_voltage: 1500,
        width_mm: 1134,
        height_mm: 2278,
      },
      pricesBySupplier: [899.9, 920, 878],
    },
    {
      name: "JA Solar 540W",
      brandName: "JA Solar",
      categoryName: "module" as const,
      specs: {
        power_w: 540,
        voc: 49.2,
        vmp: 41.0,
        isc: 13.6,
        imp: 13.2,
        efficiency: 20.9,
        max_system_voltage: 1500,
        width_mm: 1134,
        height_mm: 2278,
      },
      pricesBySupplier: [849, 865, 832],
    },
    {
      name: "Trina 555W",
      brandName: "Trina",
      categoryName: "module" as const,
      specs: {
        power_w: 555,
        voc: 49.8,
        vmp: 41.8,
        isc: 14.0,
        imp: 13.3,
        efficiency: 21.4,
        max_system_voltage: 1500,
        width_mm: 1134,
        height_mm: 2278,
      },
      pricesBySupplier: [929, 950, 910],
    },
    {
      name: "Growatt 10kW",
      brandName: "Growatt",
      categoryName: "inverter" as const,
      specs: {
        type: "string",
        max_dc_voltage: 600,
        mppt_count: 2,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 120,
        mppt_voltage_max: 550,
        max_input_current: 14,
        max_dc_power: 12000,
        recommended_dc_ac_ratio_min: 1.1,
        recommended_dc_ac_ratio_max: 1.3,
      },
      pricesBySupplier: [12500, 12800, 12200],
    },
    {
      name: "Solis 8kW",
      brandName: "Solis",
      categoryName: "inverter" as const,
      specs: {
        type: "string",
        max_dc_voltage: 600,
        mppt_count: 2,
        max_strings_per_mppt: 2,
        mppt_voltage_min: 120,
        mppt_voltage_max: 550,
        max_input_current: 13,
        max_dc_power: 8000,
        recommended_dc_ac_ratio_min: 1.1,
        recommended_dc_ac_ratio_max: 1.3,
      },
      pricesBySupplier: [9800, 10000, 9650],
    },
    {
      name: "Hoymiles HMS-1600",
      brandName: "Hoymiles",
      categoryName: "microinverter" as const,
      specs: {
        type: "micro",
        channels: 4,
        max_input_voltage: 60,
        max_input_current: 14,
        max_module_power: 600,
        min_module_power: 350,
      },
      pricesBySupplier: [2200, 2280, 2150],
    },
    {
      name: "APsystems DS3",
      brandName: "APsystems",
      categoryName: "microinverter" as const,
      specs: {
        type: "micro",
        channels: 4,
        max_input_voltage: 60,
        max_input_current: 14,
        max_module_power: 550,
        min_module_power: 350,
      },
      pricesBySupplier: [1950, 2020, 1920],
    },
    {
      name: "Kit estrutura colonial / cerâmico",
      brandName: "Genérico",
      categoryName: "structure_kit" as const,
      specs: { roof_type: "ceramic", max_modules: 20 },
      pricesBySupplier: [3200, 3350, 3100],
    },
    {
      name: "Kit estrutura fibromadeira",
      brandName: "Genérico",
      categoryName: "structure_kit" as const,
      specs: { roof_type: "fibromadeira", max_modules: 20 },
      pricesBySupplier: [2800, 2920, 2720],
    },
    {
      name: "Kit estrutura fibrometal (autobrocante)",
      brandName: "Genérico",
      categoryName: "structure_kit" as const,
      specs: { roof_type: "fibrometal", max_modules: 20 },
      pricesBySupplier: [2750, 2860, 2680],
    },
    {
      name: "Kit estrutura metálico (mini trilho)",
      brandName: "Genérico",
      categoryName: "structure_kit" as const,
      specs: { roof_type: "metal", max_modules: 20 },
      pricesBySupplier: [3050, 3180, 2980],
    },
    {
      name: "Kit estrutura laje (triângulo)",
      brandName: "Genérico",
      categoryName: "structure_kit" as const,
      specs: { roof_type: "laje", max_modules: 20 },
      pricesBySupplier: [3600, 3740, 3520],
    },
    {
      name: "Kit estrutura solo / ajustável",
      brandName: "Genérico",
      categoryName: "structure_kit" as const,
      specs: { roof_type: "ground", max_modules: 24 },
      pricesBySupplier: [4500, 4680, 4350],
    },
    {
      name: "Cabo solar 6mm²",
      brandName: "Genérico",
      categoryName: "dc_cable" as const,
      specs: { section_mm2: 6, max_voltage: 1500 },
      pricesBySupplier: [12.5, 13, 12],
    },
    {
      name: "Conector MC4 par",
      brandName: "Genérico",
      categoryName: "connector" as const,
      specs: { type: "mc4" },
      pricesBySupplier: [18, 19, 17.5],
    },
  ];

  for (const p of productDefs) {
    const brandId = brandIds[p.brandName];
    const categoryId = categoryIds[p.categoryName];
    if (!brandId || !categoryId) throw new Error(`Missing brand or category for ${p.name}`);

    const { pricesBySupplier, ...productData } = p;
    let product = await prisma.product.findFirst({
      where: { name: p.name, brandId },
    });
    if (product) {
      await prisma.product.update({
        where: { id: product.id },
        data: { specs: productData.specs as object, active: true },
      });
    } else {
      product = await prisma.product.create({
        data: {
          name: productData.name,
          brandId,
          categoryId,
          specs: productData.specs as object,
          active: true,
        },
      });
    }

    for (let i = 0; i < supplierIds.length; i++) {
      const supplierId = supplierIds[i]!;
      const price = pricesBySupplier[i] ?? pricesBySupplier[0]!;
      await prisma.supplierProduct.upsert({
        where: {
          supplierId_productId: { supplierId, productId: product.id },
        },
        create: {
          supplierId,
          productId: product.id,
          price,
          stock: 100,
          leadTimeDays: 7,
          minimumOrderQuantity: 1,
        },
        update: { price, stock: 100, leadTimeDays: 7 },
      });
    }

    for (let i = 0; i < distributorIds.length; i++) {
      const distributorId = distributorIds[i]!;
      const price = pricesBySupplier[i] ?? pricesBySupplier[0]!;
      await prisma.distributorProduct.upsert({
        where: {
          distributorId_productId: { distributorId, productId: product.id },
        },
        create: {
          distributorId,
          productId: product.id,
          price,
          stockQuantity: 100,
          leadTimeDays: 7,
          minimumOrderQuantity: 1,
          lastPriceUpdate: new Date(),
        },
        update: {
          price,
          stockQuantity: 100,
          leadTimeDays: 7,
          lastPriceUpdate: new Date(),
        },
      });
    }
  }

  console.log(
    "Seed completed: categories, brands, suppliers, distributors, products, supplier_products, distributor_products."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
