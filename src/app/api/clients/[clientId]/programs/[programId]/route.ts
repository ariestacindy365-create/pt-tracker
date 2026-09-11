import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";
import { programInputSchema } from "@/lib/programSchema";
import { getAccessibleProgram, programInclude } from "@/lib/programs";

const activateSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; programId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, programId } = await params;
  const client = await getOwnedClient(session.trainerId, clientId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await getAccessibleProgram(clientId, programId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);

  // Full edit: name/startDate/days present — rebuild the day/exercise tree
  // in place (same pattern olympus-gym-tracker uses for its program editor:
  // delete and recreate the plan rows on save). LoadEntry rows that pointed
  // at the old ProgramExercise ids just lose that link (onDelete: SetNull)
  // — their history stays, they just stop being "linked to the plan".
  if (body && typeof body === "object" && "days" in body) {
    const parsed = programInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      );
    }
    const { name, startDate, days, participantClientIds = [] } = parsed.data;

    const uniqueParticipantIds = Array.from(new Set(participantClientIds)).filter(
      (id) => id !== existing.clientId
    );
    if (uniqueParticipantIds.length > 0) {
      const validParticipants = await prisma.client.count({
        where: { id: { in: uniqueParticipantIds }, trainerId: session.trainerId },
      });
      if (validParticipants !== uniqueParticipantIds.length) {
        return NextResponse.json({ error: "Klien tambahan tidak valid" }, { status: 400 });
      }
    }

    const program = await prisma.$transaction(async (tx) => {
      await tx.programDay.deleteMany({ where: { programId } });
      await tx.programParticipant.deleteMany({ where: { programId } });
      return tx.program.update({
        where: { id: programId },
        data: {
          name,
          startDate: new Date(startDate),
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

  // Otherwise: just activate/deactivate.
  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  if (parsed.data.isActive) {
    // Only one active program at a time for the program's owner client.
    await prisma.program.updateMany({
      where: { clientId: existing.clientId, isActive: true },
      data: { isActive: false },
    });
  }

  const program = await prisma.program.update({
    where: { id: programId },
    data: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ program });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string; programId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, programId } = await params;
  const client = await getOwnedClient(session.trainerId, clientId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await getAccessibleProgram(clientId, programId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.program.delete({ where: { id: programId } });
  return NextResponse.json({ ok: true });
}
