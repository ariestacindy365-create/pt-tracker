"use client";

import type { ProgramDTO, LoadEntryDTO } from "@/lib/types";
import { SessionLogger } from "@/components/client-detail/SessionLogger";
import { LoadHistoryTable } from "@/components/client-detail/LoadHistoryTable";
import { ExerciseProgressChart } from "@/components/client-detail/ExerciseProgressChart";
import { ProgramCalendar } from "@/components/client-detail/ProgramCalendar";
import { OneRMCalculator } from "@/components/client-detail/OneRMCalculator";

const API_BASE = "/api/member";

export function MemberProgramView({
  programs,
  loadEntries,
}: {
  programs: ProgramDTO[];
  loadEntries: LoadEntryDTO[];
}) {
  const activeProgram = programs.find((p) => p.isActive);

  return (
    <div className="flex flex-col gap-4">
      {!activeProgram && (
        <div className="card p-4">
          <p className="text-sm text-[var(--muted)]">
            Trainer kamu belum menyusun program latihan.
          </p>
        </div>
      )}

      {activeProgram && (
        <div className="card p-4 flex flex-col gap-3">
          <div>
            <p className="font-medium">{activeProgram.name}</p>
            <p className="text-xs text-[var(--muted)]">
              Mulai {new Date(activeProgram.startDate).toLocaleDateString("id-ID")}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {activeProgram.days.map((day) => (
              <div key={day.id} className="rounded-lg border border-[var(--border)] p-3">
                <p className="font-medium text-sm mb-1">{day.dayLabel}</p>
                <ul className="text-sm text-[var(--muted)] flex flex-col gap-0.5">
                  {day.exercises.map((ex) => (
                    <li key={ex.id}>
                      {ex.exerciseName}
                      {ex.targetSets || ex.targetReps ? ` — ${ex.targetSets ?? "?"}x${ex.targetReps ?? "?"}` : ""}
                      {ex.targetWeight ? ` @ ${ex.targetWeight}kg` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProgramCalendar programs={programs} loadEntries={loadEntries} />

      <OneRMCalculator />

      {activeProgram && <SessionLogger apiBase={API_BASE} days={activeProgram.days} />}

      <ExerciseProgressChart loadEntries={loadEntries} />

      <div>
        <p className="label mb-2">Riwayat latihan</p>
        <LoadHistoryTable apiBase={API_BASE} loadEntries={loadEntries} />
      </div>
    </div>
  );
}
