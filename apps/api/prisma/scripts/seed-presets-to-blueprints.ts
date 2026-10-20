import "../load-env-for-scripts";
import fs from "fs";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PRESET_THUMBNAILS: Record<string, string> = {
  residential:
    "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1200&q=80",
  commercial:
    "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=1200&q=80",
  financing:
    "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80",
  premium:
    "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
};

interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  payload: Record<string, unknown>;
}

async function main() {
  console.log("=== Semeando Presets no Catálogo Oficial de Blueprints (Admin) ===");

  const jsonPath =
    "C:/Users/sgiov/.gemini/antigravity-ide/brain/f3889f18-015b-4e5a-8611-9ebf62ae4ace/scratch/presets.json";
  const presets: TemplatePreset[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  let order = 10;
  for (const preset of presets) {
    const slug = `preset-${preset.id}`;
    const thumb = PRESET_THUMBNAILS[preset.id] || "";

    const blueprint = await prisma.proposalTemplateBlueprint.upsert({
      where: { slug },
      create: {
        slug,
        name: preset.name,
        description: preset.description,
        thumbnailUrl: thumb,
        document: preset.payload as unknown as Prisma.InputJsonValue,
        published: true,
        sortOrder: order,
      },
      update: {
        name: preset.name,
        description: preset.description,
        thumbnailUrl: thumb,
        document: preset.payload as unknown as Prisma.InputJsonValue,
        published: true,
        sortOrder: order,
      },
    });

    console.log(
      `Blueprint criado/atualizado: ${blueprint.name} (id: ${blueprint.id}, slug: ${blueprint.slug})`
    );
    order += 1;
  }

  console.log(
    "=== Todos os 4 presets foram cadastrados com sucesso na tabela proposal_template_blueprints ==="
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
