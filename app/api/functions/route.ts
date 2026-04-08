import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const functions = await prisma.function.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { logs: true } },
    },
  });
  return NextResponse.json(functions);
}
