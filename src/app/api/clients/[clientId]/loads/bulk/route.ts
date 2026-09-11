import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";
import { estimate1RM } from "@/lib/loads";
import { bulkLoadEntrySchema } from "@/lib/loadEntrySchema";

// Saves a whole session's worth of sets in one request/transaction instead
// of one HTTP round-trip per set — a couple/group session with several
// exercises x sets x people can be dozens of individual saves otherwise,
// which made "Simpan sesi" feel like it hung.
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
  const parsed = bulkLoadEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const loadEntries = await prisma.$transaction(
    parsed.data.entries.map((e) => {
      const estimated1RM = estimate1RM(e.weight, e.reps);
      const recordedDate = new Date(e.recordedDate);
      return prisma.loadEntry.upsert({
        where: {
          clientId_exerciseName_recordedDate_setNumber: {
            clientId,
            exerciseName: e.exerciseName,
            recordedDate,
            setNumber: e.setNumber,
          },
        },
        create: {
          clientId,
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
