"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementDTO, ProgramDTO } from "@/lib/types";
import { MovementCombobox } from "./MovementCombobox";

type ExerciseDraft = {
  exerciseName: string;
  targetSets: string;
  targetReps: string;
  targetWeight: string;
  note: string;
};

type DayDraft = {
  dayLabel: string;
  date: string;
  exercises: ExerciseDraft[];
};

function emptyExercise(): ExerciseDraft {
  return { exerciseName: "", targetSets: "", targetReps: "", targetWeight: "", note: "" };
}

function emptyDay(n: number): DayDraft {
  return { dayLabel: `Hari ${n}`, date: "", exercises: [emptyExercise()] };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toDraft(program: ProgramDTO): { name: string; startDate: string; days: DayDraft[] } {
  return {
    name: program.name,
    startDate: program.startDate.slice(0, 10),
    days: program.days.map((d) => ({
      dayLabel: d.dayLabel,
      date: d.date ? d.date.slice(0, 10) : "",
      exercises: d.exercises.map((ex) => ({
        exerciseName: ex.exerciseName,
        targetSets: ex.targetSets != null ? String(ex.targetSets) : "",
        targetReps: ex.targetReps ?? "",
        targetWeight: ex.targetWeight != null ? String(ex.targetWeight) : "",
        note: ex.note ?? "",
      })),
    })),
  };
}

export function ProgramBuilderForm({
  clientId,
  onDone,
  editingProgram,
}: {
  clientId: string;
  onDone: () => void;
  editingProgram?: ProgramDTO;
}) {
  const router = useRouter();
  const initial = editingProgram
    ? toDraft(editingProgram)
    : { name: "", startDate: todayStr(), days: [emptyDay(1)] };
  const [name, setName] = useState(initial.name);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [days, setDays] = useState<DayDraft[]>(initial.days);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<MovementDTO[]>([]);

  useEffect(() => {
    fetch("/api/movements")
      .then((res) => res.json())
      .then((data) => setMovements(data.movements ?? []))
      .catch(() => {});
  }, []);

  function updateDay(i: number, patch: Partial<DayDraft>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function updateExercise(dayIdx: number, exIdx: number, patch: Partial<ExerciseDraft>) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === dayIdx
          ? { ...d, exercises: d.exercises.map((ex, i2) => (i2 === exIdx ? { ...ex, ...patch } : ex)) }
          : d
      )
    );
  }

  function addDay() {
    setDays((prev) => [...prev, emptyDay(prev.length + 1)]);
  }

  function removeDay(i: number) {
    setDays((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addExercise(dayIdx: number) {
    setDays((prev) =>
      prev.map((d, idx) => (idx === dayIdx ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d))
    );
  }

  function removeExercise(dayIdx: number, exIdx: number) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === dayIdx ? { ...d, exercises: d.exercises.filter((_, i2) => i2 !== exIdx) } : d
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name,
        startDate,
        days: days.map((d) => ({
          dayLabel: d.dayLabel,
          date: d.date || null,
          exercises: d.exercises
            .filter((ex) => ex.exerciseName.trim())
            .map((ex) => ({
              exerciseName: ex.exerciseName,
              targetSets: ex.targetSets || null,
              targetReps: ex.targetReps || null,
              targetWeight: ex.targetWeight || null,
              note: ex.note || null,
            })),
        })),
      };
      const url = editingProgram
        ? `/api/clients/${clientId}/programs/${editingProgram.id}`
        : `/api/clients/${clientId}/programs`;
      const res = await fetch(url, {
        method: editingProgram ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan program");
        return;
      }
      router.refresh();
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-4">
      <p className="label">{editingProgram ? "Edit program" : "Susun program baru"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="prog-name">Nama program</label>
          <input id="prog-name" required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Program Bulking Sept" />
        </div>
        <div>
          <label className="label" htmlFor="prog-start">Tanggal mulai</label>
          <input id="prog-start" type="date" required className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day, dayIdx) => (
          <div key={dayIdx} className="rounded-lg border border-[var(--border)] p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                className="input font-medium"
                value={day.dayLabel}
                onChange={(e) => updateDay(dayIdx, { dayLabel: e.target.value })}
                placeholder="mis. Hari 1 - Push"
              />
              <input
                type="date"
                className="input max-w-[10rem]"
                value={day.date}
                onChange={(e) => updateDay(dayIdx, { date: e.target.value })}
              />
              {days.length > 1 && (
                <button type="button" onClick={() => removeDay(dayIdx)} className="text-[var(--danger)] text-xs whitespace-nowrap">
                  Hapus hari
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {day.exercises.map((ex, exIdx) => (
                <div key={exIdx} className="grid gap-2 grid-cols-2 sm:grid-cols-5 items-end">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label">Gerakan</label>
                    <MovementCombobox
                      movements={movements}
                      value={ex.exerciseName}
                      onChange={(v) => updateExercise(dayIdx, exIdx, { exerciseName: v })}
                      onMovementCreated={(m) => setMovements((prev) => [...prev, m])}
                      onPickHints={(hints) => {
                        // targetReps is free text so any hint fits; targetSets
                        // is a strict integer field, so only use the hint
                        // when it's a clean whole number (setRangeHint can
                        // also be a range like "3-5", which wouldn't fit).
                        const setsHint =
                          hints.setRangeHint && /^\d+$/.test(hints.setRangeHint.trim())
                            ? hints.setRangeHint.trim()
                            : "";
                        updateExercise(dayIdx, exIdx, {
                          targetReps: ex.targetReps || hints.repRangeHint || "",
                          targetSets: ex.targetSets || setsHint,
                        });
                      }}
                      placeholder="Bench press"
                    />
                  </div>
                  <div>
                    <label className="label">Set</label>
                    <input
                      type="number"
                      className="input"
                      value={ex.targetSets}
                      onChange={(e) => updateExercise(dayIdx, exIdx, { targetSets: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Reps</label>
                    <input
                      className="input"
                      value={ex.targetReps}
                      onChange={(e) => updateExercise(dayIdx, exIdx, { targetReps: e.target.value })}
                      placeholder="8-10"
                    />
                  </div>
                  <div>
                    <label className="label">Target beban</label>
                    <input
                      type="number"
                      step="0.5"
                      className="input"
                      value={ex.targetWeight}
                      onChange={(e) => updateExercise(dayIdx, exIdx, { targetWeight: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="input"
                      value={ex.note}
                      onChange={(e) => updateExercise(dayIdx, exIdx, { note: e.target.value })}
                      placeholder="Catatan"
                    />
                    {day.exercises.length > 1 && (
                      <button type="button" onClick={() => removeExercise(dayIdx, exIdx)} className="text-[var(--danger)] text-xs">
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addExercise(dayIdx)} className="text-[var(--accent)] text-sm self-start">
                + Gerakan
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addDay} className="btn-secondary self-start text-sm">
          + Tambah hari
        </button>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Menyimpan..." : editingProgram ? "Simpan perubahan" : "Simpan program"}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Batal
        </button>
      </div>
    </form>
  );
}
