import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL ?? "file:dev.db";
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.argv[2] ?? "agency003";
  const agency = await prisma.agency.findUnique({
    where: { username },
    select: { id: true, name: true, _count: { select: { implementations: true } } },
  });
  if (!agency) {
    console.log(`No agency with username "${username}"`);
    return;
  }
  console.log(`Found ${agency.name} (${username}) with ${agency._count.implementations} implementations`);

  const impls = await prisma.implementation.findMany({
    where: { agencyId: agency.id },
    select: { id: true },
  });
  const ids = impls.map((i) => i.id);

  const logs = await prisma.implementationLog.deleteMany({
    where: { implementationId: { in: ids } },
  });
  console.log(`Deleted ${logs.count} log entries`);

  const result = await prisma.implementation.deleteMany({
    where: { agencyId: agency.id },
  });
  console.log(`Deleted ${result.count} implementations`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
