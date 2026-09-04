import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";

const schema = z.object({
  recordedDate: z.string().min(1, "Tanggal wajib diisi"),
  calories: z.coerce.number().int().positive().optional().nullable(),
  protein: z.coerce.number().positive().optional().nullable(),
  carbs: z.coerce.number().positive().optional().nullable(),
  fat: z.coerce.number().positive().optional().nullable(),
  note: z.string().trim().optional().nullable(),
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

  const [target, logs] = await Promise.all([
    prisma.nutritionTarget.findUnique({ where: { clientId } }),
    prisma.nutritionLog.findMany({
      where: { clientId },
      orderBy: { recordedDate: "desc" },
    }),
  ]);

  return NextResponse.json({ target, logs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const client = await getOwnedClient(session.trainerId, clientId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
      clientId_recordedDate: { clientId, recordedDate: new Date(recordedDate) },
    },
    create: { clientId, recordedDate: new Date(recordedDate), calories, protein, carbs, fat, note: note || null },
    update: { calories, protein, carbs, fat, note: note || null },
  });

  return NextResponse.json({ log });
}
