import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL ?? "file:dev.db";
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const all = await prisma.implementation.findMany({
    where: { status: "NOT_STARTED" },
    select: {
      id: true,
      content: true,
      evidenceUrl: true,
      contactName: true,
      contactTitle: true,
      contactPhone: true,
      agency: { select: { name: true } },
      proposal: { select: { title: true } },
    },
  });

  const trulyEmpty = all.filter(
    (i) =>
      !i.content?.trim() &&
      !i.evidenceUrl?.trim() &&
      !i.contactName?.trim() &&
      !i.contactTitle?.trim() &&
      !i.contactPhone?.trim()
  );

  console.log(`Found ${trulyEmpty.length} empty NOT_STARTED records`);
  trulyEmpty
    .slice(0, 20)
    .forEach((i) => console.log(`  - ${i.agency.name} / ${i.proposal.title.slice(0, 50)}`));
  if (trulyEmpty.length > 20) console.log(`  ... and ${trulyEmpty.length - 20} more`);

  if (trulyEmpty.length > 0) {
    const result = await prisma.implementation.deleteMany({
      where: { id: { in: trulyEmpty.map((i) => i.id) } },
    });
    console.log(`Deleted ${result.count} records`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
