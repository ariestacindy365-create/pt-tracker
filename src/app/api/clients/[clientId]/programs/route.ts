import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";

const exerciseSchema = z.object({
  exerciseName: z.string().trim().min(1, "Nama gerakan wajib diisi"),
  targetSets: z.coerce.number().int().positive().optional().nullable(),
  targetReps: z.string().trim().optional().nullable(),
  targetWeight: z.coerce.number().positive().optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

const daySchema = z.object({
  dayLabel: z.string().trim().min(1, "Label hari wajib diisi"),
  exercises: z.array(exerciseSchema).min(1, "Minimal 1 gerakan per hari"),
});

const schema = z.object({
  name: z.string().trim().min(1, "Nama program wajib diisi"),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  days: z.array(daySchema).min(1, "Minimal 1 hari"),
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

  const programs = await prisma.program.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  return NextResponse.json({ programs });
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

  const { name, startDate, days } = parsed.data;

  // Only one active program at a time — deactivate the rest.
  const program = await prisma.$transaction(async (tx) => {
    await tx.program.updateMany({
      where: { clientId, isActive: true },
      data: { isActive: false },
    });

    return tx.program.create({
      data: {
        clientId,
        name,
        startDate: new Date(startDate),
        isActive: true,
        days: {
          create: days.map((day, dayIndex) => ({
            dayLabel: day.dayLabel,
            order: dayIndex,
            exercises: {
              create: day.exercises.map((ex, exIndex) => ({
                exerciseName: ex.exerciseName,
                targetSets: ex.targetSets ?? null,
                targetReps: ex.targetReps || null,
                targetWeight: ex.targetWeight ?? null,
                note: ex.note || null,
                order: exIndex,
              })),
            },
          })),
        },
      },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: { exercises: { orderBy: { order: "asc" } } },
        },
      },
    });
  });

  return NextResponse.json({ program });
}
