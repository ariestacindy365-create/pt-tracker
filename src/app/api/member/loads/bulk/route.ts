import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/memberSession";
import { estimate1RM } from "@/lib/loads";
import { bulkLoadEntrySchema } from "@/lib/loadEntrySchema";

// Saves a whole session's worth of sets in one request/transaction instead
// of one HTTP round-trip per set.
export async function POST(req: NextRequest) {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bulkLoadEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  // Validate every distinct programExerciseId referenced actually belongs
  // to a program this client can see — either they own it, or it's a
  // shared private couple/group session they're a participant in.
  const programExerciseIds = Array.from(
    new Set(parsed.data.entries.map((e) => e.programExerciseId).filter((id): id is string => !!id))
  );
  if (programExerciseIds.length > 0) {
    const exercises = await prisma.programExercise.findMany({
      where: { id: { in: programExerciseIds } },
      include: { day: { include: { program: { include: { participants: true } } } } },
    });
    const accessibleIds = new Set(
      exercises
        .filter(
          (ex) =>
            ex.day.program.clientId === session.clientId ||
            ex.day.program.participants.some((p) => p.clientId === session.clientId)
        )
        .map((ex) => ex.id)
    );
    const invalid = programExerciseIds.some((id) => !accessibleIds.has(id));
    if (invalid) {
      return NextResponse.json({ error: "Gerakan program tidak valid" }, { status: 400 });
    }
  }

  const loadEntries = await prisma.$transaction(
    parsed.data.entries.map((e) => {
      const estimated1RM = estimate1RM(e.weight, e.reps);
      const recordedDate = new Date(e.recordedDate);
      return prisma.loadEntry.upsert({
        where: {
          clientId_exerciseName_recordedDate_setNumber: {
            clientId: session.clientId,
            exerciseName: e.exerciseName,
            recordedDate,
            setNumber: e.setNumber,
          },
        },
        create: {
          clientId: session.clientId,
          exerciseName: e.exerciseName,
          recordedDate,
          setNumber: e.setNumber,
          weight: e.weight,
          reps: e.reps,
          estimated1RM,
          note: e.note || null,
          programExerciseId: e.programExerciseId || null,
        },
        update: {
          weight: e.weight,
          reps: e.reps,
          estimated1RM,
          note: e.note || null,
          programExerciseId: e.programExerciseId || null,
        },
      });
    })
  );

  return NextResponse.json({ loadEntries });
}
