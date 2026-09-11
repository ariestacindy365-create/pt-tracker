import "server-only";
import { prisma } from "@/lib/prisma";

// Shared include shape so program payloads look the same everywhere
// (trainer routes, member routes, edit form).
export const programInclude = {
  days: {
    orderBy: { order: "asc" as const },
    include: { exercises: { orderBy: { order: "asc" as const } } },
  },
  client: { select: { id: true, name: true } },
  participants: {
    include: { client: { select: { id: true, name: true } } },
  },
} as const;

// A program is visible/editable from a client's page if that client owns
// it OR is a participant (private couple/group sessions shared across
// clients of the same trainer).
export async function getAccessibleProgram(clientId: string, programId: string) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { participants: true },
  });
  if (!program) return null;
  const hasAccess =
    program.clientId === clientId || program.participants.some((p) => p.clientId === clientId);
  return hasAccess ? program : null;
}

export function programsWhereAccessible(clientId: string) {
  return {
    OR: [{ clientId }, { participants: { some: { clientId } } }],
  };
}
