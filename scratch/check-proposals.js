const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log("Tenants:", tenants);

  const proposals = await prisma.proposal.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { proposalTemplate: true },
  });
  console.log("Proposals:", JSON.stringify(proposals, null, 2));

  const templates = await prisma.proposalTemplate.findMany();
  console.log("Templates:", templates);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
