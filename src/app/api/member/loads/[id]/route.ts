import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/memberSession";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.loadEntry.findUnique({ where: { id } });
  if (!entry || entry.clientId !== session.clientId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.loadEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
