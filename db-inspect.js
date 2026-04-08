const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log('Tables in DB:', JSON.stringify(tables, null, 2));

    const columns = await prisma.$queryRaw`PRAGMA table_info("Function")`;
    console.log('Columns in Function table:', JSON.stringify(columns, null, 2));
  } catch (err) {
    console.error('Error during inspection:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
