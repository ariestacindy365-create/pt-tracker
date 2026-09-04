import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/memberSession";

const schema = z.object({
  recordedDate: z.string().min(1, "Tanggal wajib diisi"),
  weight: z.coerce.number().positive("Berat badan harus lebih dari 0"),
  bodyFatPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  skeletalMuscleMass: z.coerce.number().positive().optional().nullable(),
  visceralFat: z.coerce.number().positive().optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bodyMetrics = await prisma.bodyMetric.findMany({
    where: { clientId: session.clientId },
    orderBy: { recordedDate: "asc" },
  });

  return NextResponse.json({ bodyMetrics });
}

export async function POST(req: NextRequest) {
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

  const { recordedDate, weight, bodyFatPercent, skeletalMuscleMass, visceralFat, note } =
    parsed.data;

  const bodyMetric = await prisma.bodyMetric.upsert({
    where: {
      clientId_recordedDate: {
        clientId: session.clientId,
        recordedDate: new Date(recordedDate),
      },
    },
    create: {
      clientId: session.clientId,
      recordedDate: new Date(recordedDate),
      weight,
      bodyFatPercent: bodyFatPercent ?? null,
      skeletalMuscleMass: skeletalMuscleMass ?? null,
      visceralFat: visceralFat ?? null,
      note: note || null,
    },
    update: {
      weight,
      bodyFatPercent: bodyFatPercent ?? null,
      skeletalMuscleMass: skeletalMuscleMass ?? null,
      visceralFat: visceralFat ?? null,
      note: note || null,
    },
  });

  return NextResponse.json({ bodyMetric });
}
