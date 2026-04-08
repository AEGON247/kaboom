import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const fn = await prisma.function.findUnique({
      where: { id },
    });

    if (!fn) {
      return NextResponse.json({ error: "Gadget not found" }, { status: 404 });
    }

    // Attempt to purge extraction directory if it exists
    try {
      if (fn.runtimeMeta) {
        const meta = JSON.parse(fn.runtimeMeta);
        if (meta.extractPath && fs.existsSync(meta.extractPath)) {
          fs.rmSync(meta.extractPath, { recursive: true, force: true });
        }
      }
    } catch (e) {
      console.error("Failed to purge extraction dir:", e);
    }

    // Delete from DB (cascade logs if they are linked, let's check prisma schema)
    await prisma.function.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
