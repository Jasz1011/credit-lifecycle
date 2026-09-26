import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await argon2.hash('Credito2026!');

  await prisma.user.upsert({
    where: { username: 'analista' },
    update: {
      email: 'analista@mcsystems.local',
      fullName: 'Analista de Crédito',
      passwordHash,
      active: true,
    },
    create: {
      username: 'analista',
      email: 'analista@mcsystems.local',
      fullName: 'Analista de Crédito',
      passwordHash,
    },
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

