import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const mapping: Record<string, string> = {
    Módulo: "module",
    Inversor: "inverter",
    Microinversor: "microinverter",
    "Cabo CC": "dc_cable",
    Conector: "connector",
    Estrutura: "structure_kit",
  };

  for (const [oldName, newName] of Object.entries(mapping)) {
    let wrongCat = await prisma.category.findFirst({ where: { name: oldName } });
    let correctCat = await prisma.category.findUnique({ where: { name: newName } });

    if (!correctCat && wrongCat) {
      console.log(`Renaming ${oldName} to ${newName}`);
      correctCat = await prisma.category.update({
        where: { id: wrongCat.id },
        data: { name: newName },
      });
      wrongCat = null;
    }

    if (!correctCat) {
      console.log(`Creating ${newName}`);
      correctCat = await prisma.category.create({ data: { name: newName } });
    }

    if (wrongCat) {
      console.log(`Migrating ${oldName} to ${newName}`);
      await prisma.product.updateMany({
        where: { categoryId: wrongCat.id },
        data: { categoryId: correctCat.id },
      });

      // delete wrong category
      await prisma.category.delete({ where: { id: wrongCat.id } });
    }
  }
  console.log("Migration finished.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
