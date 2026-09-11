import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";
import { programInputSchema } from "@/lib/programSchema";

const activateSchema = z.object({
  isActive: z.boolean(),
});

async function getOwnedProgram(trainerId: string, clientId: string, programId: string) {
  const client = await getOwnedClient(trainerId, clientId);
  if (!client) return null;
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.clientId !== clientId) return null;
  return program;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; programId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, programId } = await params;
  const existing = await getOwnedProgram(session.trainerId, clientId, programId);
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
    const { name, startDate, days } = parsed.data;

    const program = await prisma.$transaction(async (tx) => {
      await tx.programDay.deleteMany({ where: { programId } });
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

  // Otherwise: just activate/deactivate.
  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  if (parsed.data.isActive) {
    // Only one active program at a time.
    await prisma.program.updateMany({
      where: { clientId, isActive: true },
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
  const existing = await getOwnedProgram(session.trainerId, clientId, programId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.program.delete({ where: { id: programId } });
  return NextResponse.json({ ok: true });
}
