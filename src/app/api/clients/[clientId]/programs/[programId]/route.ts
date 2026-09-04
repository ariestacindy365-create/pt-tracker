import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";

const patchSchema = z.object({
  isActive: z.boolean(),
});

async function getOwnedProgram(trainerId: string, clientId: string, programId: string) {
  const client = await getOwnedClient(trainerId, clientId);
  if (!client) return null;
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.clientId !== clientId) return null;
  return program;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; programId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, programId } = await params;
  const existing = await getOwnedProgram(session.trainerId, clientId, programId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  if (parsed.data.isActive) {
    // Only one active program at a time.
    await prisma.program.updateMany({
      where: { clientId, isActive: true },
      data: { isActive: false },
    });
  }

  const program = await prisma.program.update({
    where: { id: programId },
    data: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ program });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string; programId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, programId } = await params;
  const existing = await getOwnedProgram(session.trainerId, clientId, programId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.program.delete({ where: { id: programId } });
  return NextResponse.json({ ok: true });
}
