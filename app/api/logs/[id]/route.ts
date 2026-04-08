import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const func = await prisma.function.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { timestamp: 'desc' },
        take: 100,
      },
    },
  });

  if (!func) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(func);
}
