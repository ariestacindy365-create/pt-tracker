import "server-only";
import { prisma } from "@/lib/prisma";

// Fetches a client only if it belongs to the given trainer — the
// authorization check every client-scoped route needs, in one place.
export async function getOwnedClient(trainerId: string, clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.trainerId !== trainerId) return null;
  return client;
}
