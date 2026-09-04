"use client";

import { useRouter } from "next/navigation";
import type { LoadEntryDTO } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function LoadHistoryTable({
  apiBase,
  loadEntries,
}: {
  apiBase: string;
  loadEntries: LoadEntryDTO[];
}) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan set ini?")) return;
    const res = await fetch(`${apiBase}/loads/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  const sorted = [...loadEntries].sort(
    (a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime()
  );

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
            <th className="p-3">Tanggal</th>
            <th className="p-3">Gerakan</th>
            <th className="p-3">Set</th>
            <th className="p-3">Beban x Reps</th>
            <th className="p-3">Est. 1RM</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="p-3 text-[var(--muted)]">
                Belum ada riwayat latihan.
              </td>
            </tr>
          )}
          {sorted.map((l) => (
            <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
              <td className="p-3">{fmtDate(l.recordedDate)}</td>
              <td className="p-3">{l.exerciseName}</td>
              <td className="p-3">{l.setNumber}</td>
              <td className="p-3">{l.weight}kg x {l.reps}</td>
              <td className="p-3 font-medium">{l.estimated1RM}kg</td>
              <td className="p-3 text-right">
                <button onClick={() => handleDelete(l.id)} className="text-[var(--danger)] text-xs hover:underline">
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
