import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const categories = [
        "Módulo",
        "Inversor",
        "Microinversor",
        "Inversor Híbrido",
        "Inversor Off-Grid",
        "Bateria de Lítio",
        "Estrutura",
        "Cabo Solar",
        "Conector",
        "String Box",
    ];

    for (const name of categories) {
        try {
            await prisma.category.create({
                data: { name },
            });
            console.log(`Created: ${name}`);
        } catch (err) {
            console.log(`Failed or already exists: ${name}`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
