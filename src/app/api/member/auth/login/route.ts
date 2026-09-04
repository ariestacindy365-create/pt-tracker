import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createMemberSession } from "@/lib/memberSession";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  pin: z.string().min(4, "PIN wajib diisi"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const { email, pin } = parsed.data;

  const client = await prisma.client.findUnique({ where: { email } });
  if (!client || !client.isActive || !client.pinHash) {
    return NextResponse.json({ error: "Email atau PIN salah" }, { status: 401 });
  }
  if (!(await verifyPassword(pin, client.pinHash))) {
    return NextResponse.json({ error: "Email atau PIN salah" }, { status: 401 });
  }

  await createMemberSession({
    clientId: client.id,
    trainerId: client.trainerId,
    name: client.name,
  });

  return NextResponse.json({ ok: true });
}
