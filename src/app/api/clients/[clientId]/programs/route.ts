import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";
import { programInputSchema } from "@/lib/programSchema";
import { programInclude, programsWhereAccessible } from "@/lib/programs";

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
    where: programsWhereAccessible(clientId),
    orderBy: { createdAt: "desc" },
    include: programInclude,
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

  const { name, startDate, days, participantClientIds = [] } = parsed.data;

  // Participants must be other, active clients of the same trainer — never
  // the owner itself, never someone else's client.
  const uniqueParticipantIds = Array.from(new Set(participantClientIds)).filter(
    (id) => id !== clientId
  );
  if (uniqueParticipantIds.length > 0) {
    const validParticipants = await prisma.client.count({
      where: { id: { in: uniqueParticipantIds }, trainerId: session.trainerId },
    });
    if (validParticipants !== uniqueParticipantIds.length) {
      return NextResponse.json({ error: "Klien tambahan tidak valid" }, { status: 400 });
    }
  }

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
        participants: {
          create: uniqueParticipantIds.map((id) => ({ clientId: id })),
        },
      },
      include: programInclude,
    });
  });

  return NextResponse.json({ program });
}
