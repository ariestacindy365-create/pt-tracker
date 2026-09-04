import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";
import { hashPassword } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  email: z.string().trim().toLowerCase().email("Email tidak valid").optional().nullable(),
  // New PIN to set (blank/omitted = leave the current PIN untouched).
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN harus 4-6 digit angka")
    .optional()
    .or(z.literal("")),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const client = await getOwnedClient(session.trainerId, clientId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ client });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const existing = await getOwnedClient(session.trainerId, clientId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const { pin, email, ...rest } = parsed.data;

  if (email) {
    const other = await prisma.client.findUnique({ where: { email } });
    if (other && other.id !== clientId) {
      return NextResponse.json({ error: "Email sudah dipakai klien lain" }, { status: 409 });
    }
  }

  const client = await prisma.client.update({
    where: { id: clientId },
    data: {
      ...rest,
      ...(email !== undefined ? { email: email || null } : {}),
      ...(pin ? { pinHash: await hashPassword(pin) } : {}),
    },
  });

  return NextResponse.json({ client });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const existing = await getOwnedClient(session.trainerId, clientId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete so history stays intact.
  await prisma.client.update({
    where: { id: clientId },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
