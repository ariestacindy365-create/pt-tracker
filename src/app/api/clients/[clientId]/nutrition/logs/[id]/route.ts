import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string; id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, id } = await params;
  const client = await getOwnedClient(session.trainerId, clientId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const log = await prisma.nutritionLog.findUnique({ where: { id } });
  if (!log || log.clientId !== clientId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.nutritionLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
