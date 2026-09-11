"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProgramDayDTO, ProgramExerciseDTO } from "@/lib/types";

type SetRow = { weight: string; reps: string };
type Person = { id: string; name: string; apiBase: string };

const SELF = "__self__";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Default number of input rows for an exercise = its planned target sets
// (so "3x12" starts with 3 rows ready to fill), falling back to 1.
function defaultRows(ex: ProgramExerciseDTO): SetRow[] {
  const n = ex.targetSets && ex.targetSets > 0 ? ex.targetSets : 1;
  return Array.from({ length: n }, () => ({ weight: "", reps: "" }));
}

export function SessionLogger({
  apiBase,
  days,
  people,
}: {
  apiBase: string;
  days: ProgramDayDTO[];
  // Other people sharing this program (private couple/group) — when given
  // with more than one entry, the logger shows a column per person so the
  // trainer can fill everyone's actual weight/reps on one page instead of
  // visiting each client's page separately. Falls back to the single-person
  // layout (using `apiBase` directly, e.g. the member's own `/api/member`)
  // when omitted or solo.
  people?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [dayId, setDayId] = useState(days[0]?.id ?? "");
  const [recordedDate, setRecordedDate] = useState(todayStr());
  // actuals[exerciseId][personId] = rows
  const [actuals, setActuals] = useState<Record<string, Record<string, SetRow[]>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedDay = days.find((d) => d.id === dayId);

  const allPeople: Person[] =
    people && people.length > 1
      ? people.map((p) => ({ id: p.id, name: p.name, apiBase: `/api/clients/${p.id}` }))
      : [{ id: SELF, name: "", apiBase }];
  const multiPerson = allPeople.length > 1;

  function getRows(ex: ProgramExerciseDTO, personId: string): SetRow[] {
    return actuals[ex.id]?.[personId] ?? defaultRows(ex);
  }

  function setSetValue(
    ex: ProgramExerciseDTO,
    personId: string,
    setIdx: number,
    field: "weight" | "reps",
    value: string
  ) {
    setActuals((prev) => {
      const exState = prev[ex.id] ?? {};
      const rows = exState[personId] ? [...exState[personId]] : defaultRows(ex);
      rows[setIdx] = { ...rows[setIdx], [field]: value };
      return { ...prev, [ex.id]: { ...exState, [personId]: rows } };
    });
  }

  // Adding/removing a set row applies to every person at once, since a
  // couple/group session normally runs the same number of sets for
  // everyone — a person who genuinely did fewer just leaves their fields
  // blank on the extra row(s), which get skipped on save.
  function addSetRow(ex: ProgramExerciseDTO) {
    setActuals((prev) => {
      const exState = { ...(prev[ex.id] ?? {}) };
      for (const p of allPeople) {
        const rows = exState[p.id] ? [...exState[p.id]] : defaultRows(ex);
        exState[p.id] = [...rows, { weight: "", reps: "" }];
      }
      return { ...prev, [ex.id]: exState };
    });
  }

  function removeSetRow(ex: ProgramExerciseDTO, setIdx: number) {
    setActuals((prev) => {
      const exState = { ...(prev[ex.id] ?? {}) };
      for (const p of allPeople) {
        const rows = exState[p.id] ? [...exState[p.id]] : defaultRows(ex);
        if (rows.length <= 1) continue;
        exState[p.id] = rows.filter((_, i) => i !== setIdx);
      }
      return { ...prev, [ex.id]: exState };
    });
  }

  async function handleSave() {
    if (!selectedDay) return;
    setError(null);
    setSaving(true);
    try {
      const entries = selectedDay.exercises.flatMap((ex) =>
        allPeople.flatMap((person) =>
          getRows(ex, person.id)
            .map((row, idx) => ({ ex, person, row, setNumber: idx + 1 }))
            .filter(({ row }) => row.weight && row.reps)
        )
      );

      if (entries.length === 0) {
        setError("Isi minimal satu set (beban & reps).");
        return;
      }

      for (const { ex, person, row, setNumber } of entries) {
        const res = await fetch(`${person.apiBase}/loads`, {
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
          setError(
            multiPerson
              ? `Gagal simpan set ${person.name}: ${data.error ?? "error"}`
              : data.error ?? "Gagal menyimpan sesi"
          );
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
            const rowCount = getRows(ex, allPeople[0].id).length;
            return (
              <div key={ex.id} className="flex flex-col gap-2">
                <div>
                  <p className="text-sm font-medium">{ex.exerciseName}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Target: {ex.targetSets ?? "-"}x{ex.targetReps ?? "-"} {ex.targetWeight ? `@ ${ex.targetWeight}kg` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: rowCount }, (_, setIdx) =>
                    multiPerson ? (
                      <div
                        key={setIdx}
                        className="rounded-md border border-[var(--border)] p-2 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[var(--muted)]">Set {setIdx + 1}</p>
                          {rowCount > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSetRow(ex, setIdx)}
                              className="text-[var(--danger)] text-xs"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {allPeople.map((person) => {
                            const row = getRows(ex, person.id)[setIdx] ?? { weight: "", reps: "" };
                            return (
                              <div key={person.id} className="flex flex-col gap-1 min-w-[9rem]">
                                <span className="text-xs font-medium text-[var(--accent)]">
                                  {person.name}
                                </span>
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    placeholder="kg"
                                    className="input"
                                    value={row.weight}
                                    onChange={(e) => setSetValue(ex, person.id, setIdx, "weight", e.target.value)}
                                  />
                                  <input
                                    type="number"
                                    placeholder="reps"
                                    className="input"
                                    value={row.reps}
                                    onChange={(e) => setSetValue(ex, person.id, setIdx, "reps", e.target.value)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div key={setIdx} className="grid grid-cols-[3rem_1fr_1fr_auto] gap-2 items-end">
                        <p className="text-xs text-[var(--muted)] pb-2">Set {setIdx + 1}</p>
                        <div>
                          <label className="label">Beban aktual (kg)</label>
                          <input
                            type="number"
                            step="0.5"
                            className="input"
                            value={getRows(ex, SELF)[setIdx]?.weight ?? ""}
                            onChange={(e) => setSetValue(ex, SELF, setIdx, "weight", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Reps aktual</label>
                          <input
                            type="number"
                            className="input"
                            value={getRows(ex, SELF)[setIdx]?.reps ?? ""}
                            onChange={(e) => setSetValue(ex, SELF, setIdx, "reps", e.target.value)}
                          />
                        </div>
                        {rowCount > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSetRow(ex, setIdx)}
                            className="text-[var(--danger)] text-xs pb-2.5"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    )
                  )}
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
