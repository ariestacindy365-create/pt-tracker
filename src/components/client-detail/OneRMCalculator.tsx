"use client";

import { useState } from "react";
import { estimate1RM, repWeightTable } from "@/lib/loads";

function roundToHalf(n: number) {
  return Math.round(n * 2) / 2;
}

export function OneRMCalculator() {
  const [expanded, setExpanded] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  const oneRM = Number.isFinite(w) && w > 0 && Number.isFinite(r) && r > 0 ? estimate1RM(w, r) : 0;

  return (
    <div className="card p-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <p className="label">Kalkulator 1RM</p>
        <span className="text-sm text-[var(--accent)] font-medium">
          {expanded ? "Sembunyikan ▲" : "Buka kalkulator ▾"}
        </span>
      </button>

      {expanded && (
        <>
          <p className="text-xs text-[var(--muted)] -mt-1">
            Isi beban & reps angkatan terakhir untuk hitung persentase dan target berat per reps.
          </p>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label" htmlFor="rm-weight">
                Beban Terakhir (kg)
              </label>
              <input
                id="rm-weight"
                type="number"
                step="0.5"
                placeholder="mis. 80"
                className="input"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="rm-reps">
                Reps
              </label>
              <input
                id="rm-reps"
                type="number"
                placeholder="mis. 5"
                className="input"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
          </div>

          {oneRM <= 0 ? (
            <p className="text-sm text-[var(--muted)]">Isi beban & reps di atas untuk lihat estimasi.</p>
          ) : (
            <>
              <p className="text-xs text-[var(--muted)]">
                Estimasi 1RM dari input kamu: {roundToHalf(oneRM)}kg. Tinggal pilih jumlah reps
                target hari ini.
              </p>
              <div className="flex flex-col gap-1.5">
                {repWeightTable(oneRM).map((row) => (
                  <div
                    key={row.reps}
                    className="grid grid-cols-3 items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <span className="text-sm text-[var(--muted)]">{row.reps} reps</span>
                    <span className="text-center text-xs text-[var(--muted)]">
                      {Math.round(row.percent)}%
                    </span>
                    <span className="text-right text-base font-bold text-[var(--accent)]">
                      {roundToHalf(row.weight)}kg
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
