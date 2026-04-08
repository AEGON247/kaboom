const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const cols = await prisma.$queryRaw`PRAGMA table_info("Function")`;
    console.log('COLUMNS:', cols.map(c => c.name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
