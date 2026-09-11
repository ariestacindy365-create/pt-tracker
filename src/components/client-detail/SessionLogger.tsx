"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProgramDayDTO, ProgramExerciseDTO } from "@/lib/types";

type SetRow = { weight: string; reps: string };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Default number of input rows for an exercise = its planned target sets
// (so "3x12" starts with 3 rows ready to fill), falling back to 1.
function defaultRows(ex: ProgramExerciseDTO): SetRow[] {
  const n = ex.targetSets && ex.targetSets > 0 ? ex.targetSets : 1;
  return Array.from({ length: n }, () => ({ weight: "", reps: "" }));
}

export function SessionLogger({ apiBase, days }: { apiBase: string; days: ProgramDayDTO[] }) {
  const router = useRouter();
  const [dayId, setDayId] = useState(days[0]?.id ?? "");
  const [recordedDate, setRecordedDate] = useState(todayStr());
  const [actuals, setActuals] = useState<Record<string, SetRow[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedDay = days.find((d) => d.id === dayId);

  function getRows(ex: ProgramExerciseDTO): SetRow[] {
    return actuals[ex.id] ?? defaultRows(ex);
  }

  function setSetValue(ex: ProgramExerciseDTO, setIdx: number, field: "weight" | "reps", value: string) {
    setActuals((prev) => {
      const rows = prev[ex.id] ? [...prev[ex.id]] : defaultRows(ex);
      rows[setIdx] = { ...rows[setIdx], [field]: value };
      return { ...prev, [ex.id]: rows };
    });
  }

  function addSetRow(ex: ProgramExerciseDTO) {
    setActuals((prev) => {
      const rows = prev[ex.id] ? [...prev[ex.id]] : defaultRows(ex);
      return { ...prev, [ex.id]: [...rows, { weight: "", reps: "" }] };
    });
  }

  function removeSetRow(ex: ProgramExerciseDTO, setIdx: number) {
    setActuals((prev) => {
      const rows = prev[ex.id] ? [...prev[ex.id]] : defaultRows(ex);
      if (rows.length <= 1) return prev;
      return { ...prev, [ex.id]: rows.filter((_, i) => i !== setIdx) };
    });
  }

  async function handleSave() {
    if (!selectedDay) return;
    setError(null);
    setSaving(true);
    try {
      const entries = selectedDay.exercises.flatMap((ex) =>
        getRows(ex)
          .map((row, idx) => ({ ex, row, setNumber: idx + 1 }))
          .filter(({ row }) => row.weight && row.reps)
      );

      if (entries.length === 0) {
        setError("Isi minimal satu set (beban & reps).");
        return;
      }

      for (const { ex, row, setNumber } of entries) {
        const res = await fetch(`${apiBase}/loads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseName: ex.exerciseName,
            recordedDate,
            setNumber,
            weight: row.weight,
            reps: row.reps,
            programExerciseId: ex.id,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Gagal menyimpan sesi");
          return;
        }
      }

      setActuals({});
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (days.length === 0) return null;

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="label">Catat sesi hari ini</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sl-date">Tanggal</label>
          <input
            id="sl-date"
            type="date"
            className="input"
            value={recordedDate}
            onChange={(e) => setRecordedDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="sl-day">Hari program</label>
          <select id="sl-day" className="input" value={dayId} onChange={(e) => setDayId(e.target.value)}>
            {days.map((d) => (
              <option key={d.id} value={d.id}>
                {d.dayLabel}
                {d.date
                  ? ` — ${new Date(d.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedDay && (
        <div className="flex flex-col gap-4">
          {selectedDay.exercises.map((ex) => {
            const rows = getRows(ex);
            return (
              <div key={ex.id} className="flex flex-col gap-2">
                <div>
                  <p className="text-sm font-medium">{ex.exerciseName}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Target: {ex.targetSets ?? "-"}x{ex.targetReps ?? "-"} {ex.targetWeight ? `@ ${ex.targetWeight}kg` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {rows.map((row, setIdx) => (
                    <div key={setIdx} className="grid grid-cols-[3rem_1fr_1fr_auto] gap-2 items-end">
                      <p className="text-xs text-[var(--muted)] pb-2">Set {setIdx + 1}</p>
                      <div>
                        <label className="label">Beban aktual (kg)</label>
                        <input
                          type="number"
                          step="0.5"
                          className="input"
                          value={row.weight}
                          onChange={(e) => setSetValue(ex, setIdx, "weight", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">Reps aktual</label>
                        <input
                          type="number"
                          className="input"
                          value={row.reps}
                          onChange={(e) => setSetValue(ex, setIdx, "reps", e.target.value)}
                        />
                      </div>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSetRow(ex, setIdx)}
                          className="text-[var(--danger)] text-xs pb-2.5"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addSetRow(ex)}
                    className="text-[var(--accent)] text-xs self-start"
                  >
                    + Set
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="button" className="btn-primary self-start" onClick={handleSave} disabled={saving}>
        {saving ? "Menyimpan..." : "Simpan sesi"}
      </button>
    </div>
  );
}
