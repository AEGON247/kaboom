const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function test() {
  const dbUrl = "file:C:/dev/WT_Track/wt_track/prisma/dev.db";
  console.log('Testing with Prisma Client on path:', dbUrl);
  
  const prisma = new PrismaClient({
    datasourceUrl: dbUrl,
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('Attempting to create a test record with publicUrl...');
    const result = await prisma.function.create({
      data: {
        id: 'test-check-' + Date.now(),
        name: 'test-check',
        code: 'console.log("hello")',
        type: 'snippet',
        status: 'active',
        publicUrl: 'http://test.com',
      }
    });
    console.log('SUCCESS! Record created with publicUrl:', result.id);
  } catch (e) {
    console.error('FAILED! Error details:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
