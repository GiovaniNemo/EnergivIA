const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  try {
    await prisma.$connect();
    console.log('Conectado com sucesso ao banco Postgres!');
    const count = await prisma.aneelInstallation.count();
    console.log('Total de usinas cadastradas no banco:', count);
  } catch (err) {
    console.error('Erro na conexão:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
