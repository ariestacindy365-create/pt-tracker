"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProgramDTO, LoadEntryDTO } from "@/lib/types";
import { ProgramBuilderForm } from "./ProgramBuilderForm";
import { SessionLogger } from "./SessionLogger";
import { LoadHistoryTable } from "./LoadHistoryTable";
import { ExerciseProgressChart } from "./ExerciseProgressChart";
import { ProgramCalendar } from "./ProgramCalendar";
import { OneRMCalculator } from "./OneRMCalculator";

type BuildMode = "none" | "new" | "edit";

export function ProgramTab({
  clientId,
  programs,
  loadEntries,
}: {
  clientId: string;
  programs: ProgramDTO[];
  loadEntries: LoadEntryDTO[];
}) {
  const router = useRouter();
  const [buildMode, setBuildMode] = useState<BuildMode>("none");
  const [planExpanded, setPlanExpanded] = useState(false);
  const apiBase = `/api/clients/${clientId}`;

  const activeProgram = programs.find((p) => p.isActive);
  const pastPrograms = programs.filter((p) => !p.isActive);
  const building = buildMode !== "none";

  async function handleReactivate(programId: string) {
    const res = await fetch(`${apiBase}/programs/${programId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) router.refresh();
  }

  async function handleDeleteProgram(programId: string) {
    if (!confirm("Hapus program ini beserta rencana harinya? (riwayat set latihan tidak ikut terhapus)")) return;
    const res = await fetch(`${apiBase}/programs/${programId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {!activeProgram && !building && (
        <div className="card p-4 flex items-center justify-between">
          <p className="text-sm text-[var(--muted)]">Belum ada program aktif untuk klien ini.</p>
          <button className="btn-primary" onClick={() => setBuildMode("new")}>
            + Susun Program
          </button>
        </div>
      )}

      {activeProgram && !building && (
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium">{activeProgram.name}</p>
              <p className="text-xs text-[var(--muted)]">
                Mulai {new Date(activeProgram.startDate).toLocaleDateString("id-ID")}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-sm" onClick={() => setBuildMode("edit")}>
                Edit program
              </button>
              <button className="btn-secondary text-sm" onClick={() => setBuildMode("new")}>
                + Program baru
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPlanExpanded((v) => !v)}
            className="text-sm text-[var(--accent)] font-medium self-start"
          >
            {planExpanded ? "Sembunyikan rencana ▲" : "Lihat rencana lengkap ▾"}
          </button>

          {planExpanded && (
            <div className="grid gap-2 sm:grid-cols-2">
              {activeProgram.days.map((day) => (
                <div key={day.id} className="rounded-lg border border-[var(--border)] p-3">
                  <p className="font-medium text-sm mb-1">
                    {day.dayLabel}
                    {day.date && (
                      <span className="font-normal text-[var(--muted)]">
                        {" "}
                        — {new Date(day.date).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </p>
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
          )}
        </div>
      )}

      {building && (
        <ProgramBuilderForm
          clientId={clientId}
          editingProgram={buildMode === "edit" ? activeProgram : undefined}
          onDone={() => setBuildMode("none")}
        />
      )}

      {activeProgram && !building && (
        <SessionLogger apiBase={apiBase} days={activeProgram.days} />
      )}

      {!building && <ProgramCalendar programs={programs} loadEntries={loadEntries} />}

      {!building && <OneRMCalculator />}

      {pastPrograms.length > 0 && !building && (
        <div className="card p-4">
          <p className="label mb-2">Program sebelumnya</p>
          <ul className="flex flex-col gap-2">
            {pastPrograms.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span>
                  {p.name} <span className="text-[var(--muted)]">({new Date(p.startDate).toLocaleDateString("id-ID")})</span>
                </span>
                <span className="flex gap-3">
                  <button onClick={() => handleReactivate(p.id)} className="text-[var(--accent)] hover:underline">
                    Aktifkan
                  </button>
                  <button onClick={() => handleDeleteProgram(p.id)} className="text-[var(--danger)] hover:underline">
                    Hapus
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!building && <ExerciseProgressChart loadEntries={loadEntries} />}

      {!building && (
        <div>
          <p className="label mb-2">Riwayat latihan</p>
          <LoadHistoryTable apiBase={apiBase} loadEntries={loadEntries} />
        </div>
      )}
    </div>
  );
}
