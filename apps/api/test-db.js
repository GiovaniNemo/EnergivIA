const path = require("path");
const fs = require("fs");

const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  });
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  try {
    await prisma.$connect();
    console.log("Conectado com sucesso ao banco Postgres!");
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: "SINE TOPCON", mode: "insensitive" } },
          { name: { contains: "SAJ", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        datasheetUrl: true,
      },
    });
    console.log("Produtos encontrados:", JSON.stringify(products, null, 2));
  } catch (err) {
    console.error("Erro na conexão:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
