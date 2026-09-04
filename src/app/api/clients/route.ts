import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi"),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("Email tidak valid").optional().or(z.literal("")),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN harus 4-6 digit angka")
    .optional()
    .or(z.literal("")),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await prisma.client.findMany({
    where: { trainerId: session.trainerId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      bodyMetrics: { orderBy: { recordedDate: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const { email, pin } = parsed.data;
  if (email && !pin) {
    return NextResponse.json(
      { error: "Isi PIN awal kalau ingin klien bisa login sendiri" },
      { status: 400 }
    );
  }

  if (email) {
    const existing = await prisma.client.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah dipakai klien lain" }, { status: 409 });
    }
  }

  const client = await prisma.client.create({
    data: {
      trainerId: session.trainerId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
      email: email || null,
      pinHash: pin ? await hashPassword(pin) : null,
    },
  });

  return NextResponse.json({ client });
}
