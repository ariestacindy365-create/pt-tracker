import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOwnedClient } from "@/lib/clients";

const schema = z.object({
  calories: z.coerce.number().int().positive().optional().nullable(),
  protein: z.coerce.number().positive().optional().nullable(),
  carbs: z.coerce.number().positive().optional().nullable(),
  fat: z.coerce.number().positive().optional().nullable(),
});

export async function PUT(
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

  const { calories, protein, carbs, fat } = parsed.data;

  const target = await prisma.nutritionTarget.upsert({
    where: { clientId },
    create: { clientId, calories, protein, carbs, fat },
    update: { calories, protein, carbs, fat },
  });

  return NextResponse.json({ target });
}
