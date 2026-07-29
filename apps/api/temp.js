const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.tenant.findFirst().then(t => {
  console.log('--- SEU TENANT ID É ---');
  console.log(t.id);
  console.log('-----------------------');
}).catch(console.error).finally(() => prisma.$disconnect());
