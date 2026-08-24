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
    const under50 = await prisma.aneelInstallation.count({
      where: {
        uf: "SP",
        cityName: { contains: "São Paulo", mode: "insensitive" },
        powerKwp: { lte: 50 },
      },
    });
    const over50 = await prisma.aneelInstallation.count({
      where: {
        uf: "SP",
        cityName: { contains: "São Paulo", mode: "insensitive" },
        powerKwp: { gt: 50 },
      },
    });
    console.log("Usinas em SP <= 50 kWp (Residenciais/Peq. Comércio):", under50);
    console.log("Usinas em SP > 50 kWp (Grandes usinas comerciais/industriais):", over50);

    const sampleRes = await prisma.aneelInstallation.findMany({
      where: {
        uf: "SP",
        cityName: { contains: "São Paulo", mode: "insensitive" },
        classType: "RESIDENTIAL",
      },
      take: 5,
      select: { codeAneel: true, powerKwp: true, classType: true, connectionDate: true },
    });
    console.log("Amostra de Usinas Residenciais:", sampleRes);
  } catch (err) {
    console.error("Erro na conexão:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
