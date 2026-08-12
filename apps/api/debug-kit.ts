import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DB CATEGORIES ===");
  const categories = await prisma.category.findMany();
  console.log(categories.map(c => c.name));

  console.log("\n=== PRODUCTS SUMMARY ===");
  const products = await prisma.product.findMany({
    include: { category: true }
  });
  
  const summary = {};
  for (const p of products) {
    const catName = p.category?.name || "No Category";
    if (!summary[catName]) summary[catName] = 0;
    summary[catName]++;
  }
  console.log(summary);
  
  console.log("\n=== INVERTERS SPEC CHECK ===");
  const inverters = products.filter(p => p.category?.name === "inverter" || p.category?.name === "Inversor");
  for (const inv of inverters) {
    console.log(`- ${inv.name}: type = ${(inv.specs as any)?.type}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
