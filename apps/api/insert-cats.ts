import "./prisma/load-env-for-scripts";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.category.upsert({
    where: { name: "profile" },
    create: { name: "profile" },
    update: {},
  });
  await prisma.category.upsert({
    where: { name: "string_box" },
    create: { name: "string_box" },
    update: {},
  });
  console.log("Done");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
