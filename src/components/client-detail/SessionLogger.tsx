"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProgramDayDTO } from "@/lib/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function SessionLogger({ apiBase, days }: { apiBase: string; days: ProgramDayDTO[] }) {
  const router = useRouter();
  const [dayId, setDayId] = useState(days[0]?.id ?? "");
  const [recordedDate, setRecordedDate] = useState(todayStr());
  const [actuals, setActuals] = useState<Record<string, { weight: string; reps: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedDay = days.find((d) => d.id === dayId);

  function setActual(exId: string, field: "weight" | "reps", value: string) {
    setActuals((prev) => ({ ...prev, [exId]: { ...prev[exId], [field]: value } }));
  }

  async function handleSave() {
    if (!selectedDay) return;
    setError(null);
    setSaving(true);
    try {
      const entries = selectedDay.exercises
        .map((ex) => ({ ex, val: actuals[ex.id] }))
        .filter((e) => e.val?.weight && e.val?.reps);

      if (entries.length === 0) {
        setError("Isi minimal satu gerakan (beban & reps).");
        return;
      }

      for (const { ex, val } of entries) {
        const res = await fetch(`${apiBase}/loads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseName: ex.exerciseName,
            recordedDate,
            setNumber: 1,
            weight: val.weight,
            reps: val.reps,
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
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedDay && (
        <div className="flex flex-col gap-2">
          {selectedDay.exercises.map((ex) => (
            <div key={ex.id} className="grid grid-cols-3 gap-2 items-end">
              <div>
                <p className="text-sm font-medium">{ex.exerciseName}</p>
                <p className="text-xs text-[var(--muted)]">
                  Target: {ex.targetSets ?? "-"}x{ex.targetReps ?? "-"} {ex.targetWeight ? `@ ${ex.targetWeight}kg` : ""}
                </p>
              </div>
              <div>
                <label className="label">Beban aktual (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  className="input"
                  value={actuals[ex.id]?.weight ?? ""}
                  onChange={(e) => setActual(ex.id, "weight", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Reps aktual</label>
                <input
                  type="number"
                  className="input"
                  value={actuals[ex.id]?.reps ?? ""}
                  onChange={(e) => setActual(ex.id, "reps", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="button" className="btn-primary self-start" onClick={handleSave} disabled={saving}>
        {saving ? "Menyimpan..." : "Simpan sesi"}
      </button>
    </div>
  );
}
