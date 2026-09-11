import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";
import { programInputSchema } from "@/lib/programSchema";

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
  const parsed = programInputSchema.safeParse(body);
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
            date: day.date ? new Date(day.date) : null,
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
