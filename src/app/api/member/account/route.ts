import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/memberSession";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid").optional(),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN harus 4-6 digit angka")
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getMemberSession();
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
  if (!email && !pin) {
    return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
  }

  if (email) {
    const existing = await prisma.client.findUnique({ where: { email } });
    if (existing && existing.id !== session.clientId) {
      return NextResponse.json({ error: "Email sudah dipakai" }, { status: 409 });
    }
  }

  await prisma.client.update({
    where: { id: session.clientId },
    data: {
      ...(email ? { email } : {}),
      ...(pin ? { pinHash: await hashPassword(pin) } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
