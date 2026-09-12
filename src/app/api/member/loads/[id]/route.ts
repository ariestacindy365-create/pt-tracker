import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/memberSession";
import { estimate1RM } from "@/lib/loads";

const patchSchema = z.object({
  exerciseName: z.string().trim().min(1, "Nama gerakan wajib diisi"),
  recordedDate: z.string().min(1, "Tanggal wajib diisi"),
  setNumber: z.coerce.number().int().positive(),
  weight: z.coerce.number().nonnegative("Beban tidak boleh minus"),
  reps: z.coerce.number().int().positive("Repetisi/durasi harus lebih dari 0"),
  note: z.string().trim().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.loadEntry.findUnique({ where: { id } });
  if (!entry || entry.clientId !== session.clientId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const { exerciseName, recordedDate, setNumber, weight, reps, note } = parsed.data;
  const estimated1RM = estimate1RM(weight, reps);

  try {
    const updated = await prisma.loadEntry.update({
      where: { id },
      data: {
        exerciseName,
        recordedDate: new Date(recordedDate),
        setNumber,
        weight,
        reps,
        estimated1RM,
        note: note || null,
      },
    });
    return NextResponse.json({ loadEntry: updated });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "Sudah ada set lain di tanggal/gerakan/nomor itu" },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.loadEntry.findUnique({ where: { id } });
  if (!entry || entry.clientId !== session.clientId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.loadEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
