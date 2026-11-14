// Explicit, idempotent sync of active customer accounts; never changes existing points.
require('dotenv').config({ quiet: true });
const { PrismaService } = require('../dist/src/database/prisma.service.js');
const { enrollMember } = require('../dist/src/loyalty/enroll-member.js');

(async () => {
  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    const customers = await prisma.users.findMany({
      where: {
        status: 'ACTIVE',
        loyalty_member: { is: null },
        user_roles: {
          some: { roles: { name: 'BUYER' } },
          none: { roles: { name: { in: ['ADMIN', 'SELLER'] } } },
        },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    for (const account of customers)
      await prisma.$transaction((tx) => enrollMember(tx, account.id));
    console.log(`Synchronized ${customers.length} customer accounts. Existing memberships preserved.`);
  } finally {
    await prisma.$disconnect();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
