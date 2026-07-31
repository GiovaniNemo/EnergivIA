import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
  });

  const dcCables = products.filter((p) => p.category.name === "dc_cable");
  const connectors = products.filter((p) => p.category.name === "connector");
  const modules = products.filter((p) => p.category.name === "module");
  const inverters = products.filter(
    (p) => p.category.name === "inverter" || p.category.name === "microinverter"
  );
  const structures = products.filter((p) => p.category.name === "structure_kit");

  console.log("=== DC Cables ===");
  dcCables.forEach((c) => console.log(c.name, JSON.stringify(c.specs)));

  console.log("=== Connectors ===");
  connectors.forEach((c) => console.log(c.name, JSON.stringify(c.specs)));

  console.log("=== Modules ===");
  console.log("Count:", modules.length);

  console.log("=== Inverters ===");
  console.log("Count:", inverters.length);

  console.log("=== Structures ===");
  structures.forEach((c) => console.log(c.name, JSON.stringify(c.specs)));

  await prisma.$disconnect();
}

run();
