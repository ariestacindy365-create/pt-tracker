import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/memberSession";
import { estimate1RM } from "@/lib/loads";

const schema = z.object({
  exerciseName: z.string().trim().min(1, "Nama gerakan wajib diisi"),
  recordedDate: z.string().min(1, "Tanggal wajib diisi"),
  setNumber: z.coerce.number().int().positive().default(1),
  weight: z.coerce.number().positive("Beban harus lebih dari 0"),
  reps: z.coerce.number().int().positive("Repetisi harus lebih dari 0"),
  note: z.string().trim().optional().nullable(),
  programExerciseId: z.string().trim().optional().nullable(),
});

export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loadEntries = await prisma.loadEntry.findMany({
    where: { clientId: session.clientId },
    orderBy: [{ recordedDate: "asc" }, { setNumber: "asc" }],
  });

  return NextResponse.json({ loadEntries });
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

  const { exerciseName, recordedDate, setNumber, weight, reps, note, programExerciseId } =
    parsed.data;

  // If a programExerciseId is given, make sure it actually belongs to a
  // program this client can see — either they own it, or it's a shared
  // private couple/group session they're a participant in.
  if (programExerciseId) {
    const ex = await prisma.programExercise.findUnique({
      where: { id: programExerciseId },
      include: { day: { include: { program: { include: { participants: true } } } } },
    });
    const program = ex?.day.program;
    const hasAccess =
      program &&
      (program.clientId === session.clientId ||
        program.participants.some((p) => p.clientId === session.clientId));
    if (!hasAccess) {
      return NextResponse.json({ error: "Gerakan program tidak valid" }, { status: 400 });
    }
  }

  const estimated1RM = estimate1RM(weight, reps);

  const loadEntry = await prisma.loadEntry.upsert({
    where: {
      clientId_exerciseName_recordedDate_setNumber: {
        clientId: session.clientId,
        exerciseName,
        recordedDate: new Date(recordedDate),
        setNumber,
      },
    },
    create: {
      clientId: session.clientId,
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
