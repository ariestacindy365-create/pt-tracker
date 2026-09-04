import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/memberSession";

const schema = z.object({
  recordedDate: z.string().min(1, "Tanggal wajib diisi"),
  calories: z.coerce.number().int().positive().optional().nullable(),
  protein: z.coerce.number().positive().optional().nullable(),
  carbs: z.coerce.number().positive().optional().nullable(),
  fat: z.coerce.number().positive().optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [target, logs] = await Promise.all([
    prisma.nutritionTarget.findUnique({ where: { clientId: session.clientId } }),
    prisma.nutritionLog.findMany({
      where: { clientId: session.clientId },
      orderBy: { recordedDate: "desc" },
    }),
  ]);

  return NextResponse.json({ target, logs });
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

  const { recordedDate, calories, protein, carbs, fat, note } = parsed.data;

  const log = await prisma.nutritionLog.upsert({
    where: {
      clientId_recordedDate: { clientId: session.clientId, recordedDate: new Date(recordedDate) },
    },
    create: {
      clientId: session.clientId,
      recordedDate: new Date(recordedDate),
      calories,
      protein,
      carbs,
      fat,
      note: note || null,
    },
    update: { calories, protein, carbs, fat, note: note || null },
  });

  return NextResponse.json({ log });
}
