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
    const city = await prisma.city.findFirst({
      where: { name: { contains: "Ourizona", mode: "insensitive" } },
      include: { state: true },
    });
    console.log("Cidade Ourizona no banco:", city);

    const aneelOurizona = await prisma.aneelInstallation.findMany({
      where: { cityName: { contains: "Ourizona", mode: "insensitive" } },
      take: 5,
      select: {
        codeAneel: true,
        cityName: true,
        uf: true,
        powerKwp: true,
        zipCode: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
      },
    });
    console.log("Usinas em Ourizona:", aneelOurizona);
  } catch (err) {
    console.error("Erro na conexão:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
