import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const updated = await prisma.function.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[rename]", error);
    return NextResponse.json({ error: "Failed to rename gadget" }, { status: 500 });
  }
}
