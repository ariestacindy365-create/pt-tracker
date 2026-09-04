import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";

const schema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi"),
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  inviteCode: z.string().min(1, "Kode undangan wajib diisi"),
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

  const { name, email, password, inviteCode } = parsed.data;

  if (inviteCode !== process.env.TRAINER_INVITE_CODE) {
    return NextResponse.json(
      { error: "Kode undangan salah" },
      { status: 403 }
    );
  }

  const existing = await prisma.trainer.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email sudah terdaftar" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const trainer = await prisma.trainer.create({
    data: { name, email, passwordHash },
  });

  await createSession({
    trainerId: trainer.id,
    email: trainer.email,
    name: trainer.name,
  });

  return NextResponse.json({ ok: true });
}
