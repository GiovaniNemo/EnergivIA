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
    const count = await prisma.aneelInstallation.count();
    console.log("Total de usinas cadastradas no banco:", count);

    const spCount = await prisma.aneelInstallation.count({
      where: { uf: "SP", cityName: { contains: "São Paulo", mode: "insensitive" } },
    });
    console.log("Total usinas em São Paulo (SP):", spCount);

    const sample = await prisma.aneelInstallation.findMany({
      where: { uf: "SP", cityName: { contains: "São Paulo", mode: "insensitive" } },
      take: 5,
      select: {
        id: true,
        codeAneel: true,
        cityName: true,
        uf: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
        powerKwp: true,
      },
    });
    console.log("Amostra de Usinas em SP:", sample);
    const distinctCoords = await prisma.aneelInstallation.groupBy({
      by: ["latitude", "longitude"],
      where: { uf: "SP", cityName: { contains: "São Paulo", mode: "insensitive" } },
      _count: { id: true },
      take: 10,
    });
    console.log("Distinct coords in SP:", distinctCoords);
  } catch (err) {
    console.error("Erro na conexão:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
