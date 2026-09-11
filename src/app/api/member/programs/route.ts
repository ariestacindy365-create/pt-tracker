import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/memberSession";
import { programInclude, programsWhereAccessible } from "@/lib/programs";

// Read-only for members — the program plan itself is trainer-managed.
// Includes programs shared with them as a couple/group session partner.
export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const programs = await prisma.program.findMany({
    where: programsWhereAccessible(session.clientId),
    orderBy: { createdAt: "desc" },
    include: programInclude,
  });

  return NextResponse.json({ programs });
}
