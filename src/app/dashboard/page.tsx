import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/NavBar";
import { AddClientForm } from "@/components/AddClientForm";
import { initials, avatarColor } from "@/lib/format";

// A client with no body metric or load entry logged in this many days gets
// flagged — long enough that a normal gap between sessions doesn't trip it,
// short enough that a trainer actually notices someone going quiet.
const STALE_AFTER_DAYS = 14;

export default async function DashboardPage() {
  const session = await requireTrainer();

  const clients = await prisma.client.findMany({
    where: { trainerId: session.trainerId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      bodyMetrics: { orderBy: { recordedDate: "desc" }, take: 2 },
      loadEntries: { orderBy: { recordedDate: "desc" }, take: 1 },
      programs: { orderBy: { startDate: "asc" }, take: 1, select: { startDate: true } },
    },
  });

  // A server page legitimately needs "now" to show staleness — there's no
  // render-purity concern here (no client-side re-render to desync from).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div className="flex flex-1 flex-col">
      <NavBar trainerName={session.name} />
      <main className="max-w-5xl mx-auto w-full p-4 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Klien Saya</h1>
            <p className="text-sm text-[var(--muted)] mt-0.5">
              {clients.length > 0 ? `${clients.length} klien aktif` : "Belum ada klien"}
            </p>
          </div>
          <AddClientForm />
        </div>

        {clients.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada klien. Tambah klien pertamamu di atas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => {
              const [latest, previous] = client.bodyMetrics;
              const latestLoad = client.loadEntries[0];
              const trainingStart = client.programs[0]?.startDate ?? null;

              const lastActivity = [latest?.recordedDate, latestLoad?.recordedDate]
                .filter((d): d is Date => d != null)
                .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
              const daysSinceActivity = lastActivity
                ? Math.floor((now - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const isStale = daysSinceActivity !== null && daysSinceActivity > STALE_AFTER_DAYS;

              const weightDelta =
                latest && previous ? Math.round((latest.weight - previous.weight) * 100) / 100 : null;
              const avatar = avatarColor(client.name);

              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className={`card p-4 flex flex-col hover:shadow-md hover:border-[var(--accent)] transition-[box-shadow,border-color] ${
                    isStale ? "border-[var(--danger)]/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="avatar w-10 h-10 text-sm"
                      style={{ background: avatar.bg, color: avatar.fg }}
                    >
                      {initials(client.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium truncate">{client.name}</p>
                        {isStale && (
                          <span className="badge badge-danger shrink-0">{daysSinceActivity}+ hari</span>
                        )}
                      </div>
                      {client.phone && (
                        <p className="text-sm text-[var(--muted)] truncate">{client.phone}</p>
                      )}
                    </div>
                  </div>
                  {trainingStart && (
                    <p className="text-xs text-[var(--muted)] mt-2">
                      Latihan sejak {trainingStart.toLocaleDateString("id-ID")}
                    </p>
                  )}
                  <div className="mt-3 text-sm flex flex-col gap-0.5">
                    {latest ? (
                      <p className="text-[var(--muted)]">
                        Berat terakhir:{" "}
                        <span className="text-[var(--foreground)] font-medium">{latest.weight} kg</span>
                        {weightDelta != null && weightDelta !== 0 && (
                          <span
                            className={weightDelta > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}
                          >
                            {" "}
                            {weightDelta > 0 ? `↑${weightDelta}` : `↓${Math.abs(weightDelta)}`}
                          </span>
                        )}
                        {client.goalWeight != null && (
                          <span className="text-[var(--muted)]"> · target {client.goalWeight}kg</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[var(--muted)]">Belum ada data body metric</p>
                    )}
                    {lastActivity && !isStale && (
                      <p className="text-xs text-[var(--muted)]">
                        Aktivitas terakhir:{" "}
                        {formatDistanceToNow(lastActivity, { addSuffix: true, locale: idLocale })}
                      </p>
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
