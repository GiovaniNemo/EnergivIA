import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Find .env file in root
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // try apps/api/.env
  dotenv.config();
}

const prisma = new PrismaClient();

async function main() {
  console.log("Starting deletion...");

  // Keep only the valid ones
  const validCategoryNames = ["module", "inverter", "microinverter", "dc_cable", "connector"];

  // Find invalid categories
  const invalidCategories = await prisma.category.findMany({
    where: {
      name: { notIn: validCategoryNames },
    },
  });

  const invalidIds = invalidCategories.map((c) => c.id);
  console.log(`Found ${invalidIds.length} invalid categories to delete.`);

  console.log("Deleting all KitItems to avoid FK errors...");
  await prisma.kitItem.deleteMany({});
  console.log("Deleting all DistributorProducts...");
  await prisma.distributorProduct.deleteMany({});
  console.log("Deleting all SupplierProducts...");
  await prisma.supplierProduct.deleteMany({});
  console.log("Deleting all ProductCompatibility...");
  await prisma.productCompatibility.deleteMany({});
  console.log("Deleting all StockItems...");
  await prisma.stockItem.deleteMany({});

  console.log("Deleting all Products...");
  const deletedProducts = await prisma.product.deleteMany({});
  console.log(`Deleted ${deletedProducts.count} global products.`);

  console.log("Deleting invalid categories...");
  if (invalidIds.length > 0) {
    const deletedCats = await prisma.category.deleteMany({
      where: { id: { in: invalidIds } },
    });
    console.log(`Deleted ${deletedCats.count} invalid categories.`);
  }

  console.log("Wipe completed successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
