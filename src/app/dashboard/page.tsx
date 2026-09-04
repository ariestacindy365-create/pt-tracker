import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/NavBar";
import { AddClientForm } from "@/components/AddClientForm";

export default async function DashboardPage() {
  const session = await requireTrainer();

  const clients = await prisma.client.findMany({
    where: { trainerId: session.trainerId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      bodyMetrics: { orderBy: { recordedDate: "desc" }, take: 1 },
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <NavBar trainerName={session.name} />
      <main className="max-w-5xl mx-auto w-full p-4 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Klien Saya</h1>
        </div>

        <AddClientForm />

        {clients.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada klien. Tambah klien pertamamu di atas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => {
              const latest = client.bodyMetrics[0];
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="card p-4 hover:border-[var(--accent)] transition-colors"
                >
                  <p className="font-medium">{client.name}</p>
                  {client.phone && (
                    <p className="text-sm text-[var(--muted)]">{client.phone}</p>
                  )}
                  <div className="mt-3 text-sm">
                    {latest ? (
                      <p className="text-[var(--muted)]">
                        Berat terakhir: <span className="text-[var(--foreground)] font-medium">{latest.weight} kg</span>
                      </p>
                    ) : (
                      <p className="text-[var(--muted)]">Belum ada data body metric</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
