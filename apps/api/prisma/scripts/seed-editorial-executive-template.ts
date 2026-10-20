import "../load-env-for-scripts";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT,
  EDITORIAL_SOLAR_EXECUTIVE_METADATA,
} from "../../src/modules/proposal-template-blueprints/seeds/editorial-solar-executive-blueprint";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Semeando Blueprint Oficial: Editorial Solar Executive ===");

  // 1. Upsert no catálogo oficial de blueprints
  const blueprint = await prisma.proposalTemplateBlueprint.upsert({
    where: { slug: EDITORIAL_SOLAR_EXECUTIVE_METADATA.slug },
    create: {
      slug: EDITORIAL_SOLAR_EXECUTIVE_METADATA.slug,
      name: EDITORIAL_SOLAR_EXECUTIVE_METADATA.name,
      description: EDITORIAL_SOLAR_EXECUTIVE_METADATA.description,
      thumbnailUrl: EDITORIAL_SOLAR_EXECUTIVE_METADATA.thumbnailUrl,
      document: EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT as unknown as Prisma.InputJsonValue,
      published: true,
      sortOrder: 0,
    },
    update: {
      name: EDITORIAL_SOLAR_EXECUTIVE_METADATA.name,
      description: EDITORIAL_SOLAR_EXECUTIVE_METADATA.description,
      thumbnailUrl: EDITORIAL_SOLAR_EXECUTIVE_METADATA.thumbnailUrl,
      document: EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT as unknown as Prisma.InputJsonValue,
      published: true,
      sortOrder: 0,
    },
  });

  console.log(`Blueprint registrado com sucesso! ID: ${blueprint.id} (slug: ${blueprint.slug})`);

  // 2. Ajusta outros blueprints para sortOrder >= 1
  await prisma.proposalTemplateBlueprint.updateMany({
    where: {
      id: { not: blueprint.id },
      sortOrder: { lte: 0 },
    },
    data: {
      sortOrder: 1,
    },
  });

  // 3. Cadastrar ou atualizar como template ativo nas organizações do usuário
  const targetTenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { id: "cmru2xi440002229w24hdusch" }, // Giovani
        { slug: "giovani" },
        { slug: "energivia" },
      ],
      deletedAt: null,
    },
    select: { id: true, name: true, slug: true },
  });

  console.log(`Organizações alvo encontradas: ${targetTenants.length}`);

  for (const tenant of targetTenants) {
    console.log(`Vinculando template à organização: ${tenant.name} (${tenant.id})`);

    // Desmarca outros como default
    await prisma.proposalTemplate.updateMany({
      where: { tenantId: tenant.id },
      data: { isDefault: false },
    });

    // Procura se já existe template com mesmo nome
    const existing = await prisma.proposalTemplate.findFirst({
      where: {
        tenantId: tenant.id,
        name: "Template Editorial Solar Executive",
        deletedAt: null,
      },
    });

    if (existing) {
      await prisma.proposalTemplate.update({
        where: { id: existing.id },
        data: {
          isDefault: true,
          status: "PUBLISHED",
          config: EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT as unknown as Prisma.InputJsonValue,
          description: EDITORIAL_SOLAR_EXECUTIVE_METADATA.description,
        },
      });

      await prisma.proposalTemplateRevision.create({
        data: {
          proposalTemplateId: existing.id,
          tenantId: tenant.id,
          version: existing.version + 1,
          status: "PUBLISHED",
          config: EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT as unknown as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
      });

      console.log(`Template atualizado para default no tenant ${tenant.name} (${existing.id})`);
    } else {
      const created = await prisma.proposalTemplate.create({
        data: {
          tenantId: tenant.id,
          name: "Template Editorial Solar Executive",
          description: EDITORIAL_SOLAR_EXECUTIVE_METADATA.description,
          isDefault: true,
          status: "PUBLISHED",
          config: EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT as unknown as Prisma.InputJsonValue,
        },
      });

      await prisma.proposalTemplateRevision.create({
        data: {
          proposalTemplateId: created.id,
          tenantId: tenant.id,
          version: created.version,
          status: "PUBLISHED",
          config: EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT as unknown as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
      });

      console.log(
        `Template criado e definido como default no tenant ${tenant.name} (${created.id})`
      );
    }
  }

  console.log("=== Semeamento finalizado com sucesso! ===");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
