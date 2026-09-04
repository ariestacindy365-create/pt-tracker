import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const schema = z.object({
  name: z.string().trim().min(2, "Nama gerakan minimal 2 karakter"),
  primaryMuscle: z.string().trim().min(1, "Otot primer wajib diisi"),
  category: z.string().trim().min(1, "Kategori wajib diisi"),
  equipment: z.string().trim().min(1, "Alat wajib diisi"),
  secondaryMuscle: z.string().trim().optional().nullable(),
  repRangeHint: z.string().trim().optional().nullable(),
  setRangeHint: z.string().trim().optional().nullable(),
});

// Kamus gerakan bersama — dibaca oleh semua trainer, bukan milik satu
// trainer. Login trainer tetap wajib supaya tidak publik.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const movements = await prisma.movement.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ movements });
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

  const existing = await prisma.movement.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: "Gerakan dengan nama itu sudah ada" }, { status: 409 });
  }

  const movement = await prisma.movement.create({
    data: {
      name: parsed.data.name,
      primaryMuscle: parsed.data.primaryMuscle,
      secondaryMuscle: parsed.data.secondaryMuscle || null,
      category: parsed.data.category,
      equipment: parsed.data.equipment,
      repRangeHint: parsed.data.repRangeHint || null,
      setRangeHint: parsed.data.setRangeHint || null,
    },
  });

  return NextResponse.json({ movement });
}
