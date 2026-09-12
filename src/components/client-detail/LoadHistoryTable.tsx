"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LoadEntryDTO } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

type Draft = {
  exerciseName: string;
  recordedDate: string;
  setNumber: string;
  weight: string;
  reps: string;
};

function toDraft(l: LoadEntryDTO): Draft {
  return {
    exerciseName: l.exerciseName,
    recordedDate: l.recordedDate.slice(0, 10),
    setNumber: String(l.setNumber),
    weight: String(l.weight),
    reps: String(l.reps),
  };
}

const PAGE_SIZE = 10;

export function LoadHistoryTable({
  apiBase,
  loadEntries,
}: {
  apiBase: string;
  loadEntries: LoadEntryDTO[];
}) {
  const router = useRouter();
  // Hide deleted rows immediately instead of waiting for the DELETE request
  // + full page refresh to round-trip — feels instant, and un-hides itself
  // if the request actually fails.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  // Applied edits shown immediately (before router.refresh() catches up),
  // keyed by entry id.
  const [overrides, setOverrides] = useState<Record<string, LoadEntryDTO>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Riwayat dikelompokkan per gerakan dan tertutup secara default — kalau
  // ditumpuk jadi satu daftar panjang, riwayat berbulan-bulan jadi kepanjangan.
  const [openExercises, setOpenExercises] = useState<Set<string>>(new Set());
  // Halaman aktif per gerakan (1-indexed) — biar daftar yang dibuka juga
  // tidak jadi satu scroll panjang saat set-nya banyak.
  const [pageByExercise, setPageByExercise] = useState<Record<string, number>>({});

  async function handleDelete(id: string) {
    setHiddenIds((prev) => new Set(prev).add(id));
    const res = await fetch(`${apiBase}/loads/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      alert("Gagal menghapus. Coba lagi.");
    }
  }

  function startEdit(l: LoadEntryDTO) {
    setEditingId(l.id);
    setDraft(toDraft(l));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    setEditError(null);
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/loads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: draft.exerciseName,
          recordedDate: draft.recordedDate,
          setNumber: draft.setNumber,
          weight: draft.weight || "0",
          reps: draft.reps,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Gagal menyimpan");
        return;
      }
      setOverrides((prev) => ({ ...prev, [id]: data.loadEntry }));
      setEditingId(null);
      setDraft(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function toggleExercise(name: string) {
    setOpenExercises((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function setPage(name: string, page: number) {
    setPageByExercise((prev) => ({ ...prev, [name]: page }));
  }

  const visible = loadEntries.filter((l) => !hiddenIds.has(l.id)).map((l) => overrides[l.id] ?? l);

  const groups = useMemo(() => {
    const map = new Map<string, LoadEntryDTO[]>();
    for (const l of visible) {
      const arr = map.get(l.exerciseName) ?? [];
      arr.push(l);
      map.set(l.exerciseName, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime());
    }
    return Array.from(map.entries())
      .map(([exerciseName, entries]) => ({ exerciseName, entries }))
      .sort(
        (a, b) =>
          new Date(b.entries[0].recordedDate).getTime() -
          new Date(a.entries[0].recordedDate).getTime()
      );
  }, [visible]);

  if (groups.length === 0) {
    return <div className="card p-4 text-sm text-[var(--muted)]">Belum ada riwayat latihan.</div>;
  }

  return (
    <div className="card divide-y divide-[var(--border)]">
      {groups.map((g) => {
        const isOpen = openExercises.has(g.exerciseName);
        const totalPages = Math.max(1, Math.ceil(g.entries.length / PAGE_SIZE));
        const page = Math.min(pageByExercise[g.exerciseName] ?? 1, totalPages);
        const pageEntries = g.entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        return (
          <div key={g.exerciseName}>
            <button
              type="button"
              onClick={() => toggleExercise(g.exerciseName)}
              className="w-full flex items-center justify-between p-3 text-sm text-left"
            >
              <span className="font-medium">{g.exerciseName}</span>
              <span className="text-[var(--muted)] text-xs whitespace-nowrap">
                {g.entries.length} set · terakhir {fmtDate(g.entries[0].recordedDate)}{" "}
                {isOpen ? "▲" : "▾"}
              </span>
            </button>
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Set</th>
                      <th className="p-3">Beban x Reps</th>
                      <th className="p-3">Est. 1RM</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageEntries.map((l) =>
                      editingId === l.id && draft ? (
                        <tr
                          key={l.id}
                          className="border-b border-[var(--border)] last:border-0 bg-[var(--surface-2)]"
                        >
                          <td className="p-2">
                            <input
                              type="date"
                              className="input text-xs"
                              value={draft.recordedDate}
                              onChange={(e) => setDraft({ ...draft, recordedDate: e.target.value })}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              className="input text-xs w-14"
                              value={draft.setNumber}
                              onChange={(e) => setDraft({ ...draft, setNumber: e.target.value })}
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.5"
                                placeholder="kg"
                                className="input text-xs w-16"
                                value={draft.weight}
                                onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                              />
                              <input
                                type="number"
                                placeholder="reps"
                                className="input text-xs w-16"
                                value={draft.reps}
                                onChange={(e) => setDraft({ ...draft, reps: e.target.value })}
                              />
                            </div>
                          </td>
                          <td className="p-2 text-[var(--muted)] text-xs">otomatis</td>
                          <td className="p-2 text-right whitespace-nowrap">
                            <button
                              onClick={() => saveEdit(l.id)}
                              disabled={saving}
                              className="text-[var(--accent)] text-xs hover:underline mr-2"
                            >
                              {saving ? "..." : "Simpan"}
                            </button>
                            <button onClick={cancelEdit} className="text-[var(--muted)] text-xs hover:underline">
                              Batal
                            </button>
                            {editError && <p className="text-[var(--danger)] text-xs mt-1">{editError}</p>}
                          </td>
                        </tr>
                      ) : (
                        <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                          <td className="p-3">{fmtDate(l.recordedDate)}</td>
                          <td className="p-3">{l.setNumber}</td>
                          <td className="p-3">
                            {l.weight > 0 ? `${l.weight}kg x ${l.reps}` : `${l.reps} detik/reps`}
                          </td>
                          <td className="p-3 font-medium">{l.weight > 0 ? `${l.estimated1RM}kg` : "-"}</td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => startEdit(l)}
                              className="text-[var(--accent)] text-xs hover:underline mr-3"
                            >
                              Edit
                            </button>
                            <button onClick={() => handleDelete(l.id)} className="text-[var(--danger)] text-xs hover:underline">
                              Hapus
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-2 text-xs text-[var(--muted)]">
                    <button
                      type="button"
                      onClick={() => setPage(g.exerciseName, page - 1)}
                      disabled={page <= 1}
                      className="btn-secondary px-2 py-1 disabled:opacity-40"
                    >
                      ‹ Sebelumnya
                    </button>
                    <span>
                      Halaman {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage(g.exerciseName, page + 1)}
                      disabled={page >= totalPages}
                      className="btn-secondary px-2 py-1 disabled:opacity-40"
                    >
                      Selanjutnya ›
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
