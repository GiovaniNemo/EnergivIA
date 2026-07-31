const { PrismaClient } = require("@prisma/client");
process.env.DATABASE_URL = "postgresql://solar:solar@localhost:5432/energivia?schema=public";
const prisma = new PrismaClient();

async function run() {
  const edeltecId = await prisma.distributor.findFirst({
    where: { name: { contains: "Edeltec", mode: "insensitive" } },
  });
  if (!edeltecId) {
    console.log("Edeltec not found");
    return;
  }

  const products = await prisma.distributorProduct.findMany({
    where: { distributorId: edeltecId.id },
    include: { product: { include: { category: true } } },
  });

  const modules = products.filter((p) => p.product.category.name === "module");
  const inverters = products.filter(
    (p) => p.product.category.name === "inverter" || p.product.category.name === "microinverter"
  );

  console.log("Edeltec Modules:", modules.length);
  modules.forEach((m) => console.log(m.product.name, m.product.specs, "Stock:", m.stockQuantity));

  console.log("Edeltec Inverters:", inverters.length);
  inverters.forEach((m) => console.log(m.product.name, m.product.specs, "Stock:", m.stockQuantity));

  await prisma.$disconnect();
}
run();
