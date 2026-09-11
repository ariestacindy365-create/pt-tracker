import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";
import { estimate1RM } from "@/lib/loads";

const schema = z.object({
  exerciseName: z.string().trim().min(1, "Nama gerakan wajib diisi"),
  recordedDate: z.string().min(1, "Tanggal wajib diisi"),
  setNumber: z.coerce.number().int().positive().default(1),
  // 0 is valid — bodyweight/timer gerakan (plank, hang, dll) often have no
  // external load.
  weight: z.coerce.number().nonnegative("Beban tidak boleh minus"),
  reps: z.coerce.number().int().positive("Repetisi/durasi harus lebih dari 0"),
  note: z.string().trim().optional().nullable(),
  programExerciseId: z.string().trim().optional().nullable(),
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

  const loadEntries = await prisma.loadEntry.findMany({
    where: { clientId },
    orderBy: [{ recordedDate: "asc" }, { setNumber: "asc" }],
  });

  return NextResponse.json({ loadEntries });
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

  const { exerciseName, recordedDate, setNumber, weight, reps, note, programExerciseId } =
    parsed.data;
  const estimated1RM = estimate1RM(weight, reps);

  const loadEntry = await prisma.loadEntry.upsert({
    where: {
      clientId_exerciseName_recordedDate_setNumber: {
        clientId,
        exerciseName,
        recordedDate: new Date(recordedDate),
        setNumber,
      },
    },
    create: {
      clientId,
      exerciseName,
      recordedDate: new Date(recordedDate),
      setNumber,
      weight,
      reps,
      estimated1RM,
      note: note || null,
      programExerciseId: programExerciseId || null,
    },
    update: {
      weight,
      reps,
      estimated1RM,
      note: note || null,
      programExerciseId: programExerciseId || null,
    },
  });

  return NextResponse.json({ loadEntry });
}
