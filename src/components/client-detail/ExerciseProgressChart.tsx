"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LoadEntryDTO } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function ExerciseProgressChart({ loadEntries }: { loadEntries: LoadEntryDTO[] }) {
  const exerciseNames = useMemo(() => {
    return Array.from(new Set(loadEntries.map((l) => l.exerciseName))).sort();
  }, [loadEntries]);

  const [selected, setSelected] = useState<string | null>(null);
  const activeExercise = selected && exerciseNames.includes(selected) ? selected : exerciseNames[0] ?? "";

  // Best (highest) estimated 1RM per date for the selected exercise — one
  // point per day even if several sets were logged that day.
  const chartData = useMemo(() => {
    if (!activeExercise) return [];
    const byDate = new Map<string, number>();
    for (const l of loadEntries) {
      if (l.exerciseName !== activeExercise) continue;
      const key = l.recordedDate.slice(0, 10);
      const current = byDate.get(key) ?? 0;
      if (l.estimated1RM > current) byDate.set(key, l.estimated1RM);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([iso, best1RM]) => ({ iso, date: fmtDate(iso), best1RM }));
  }, [loadEntries, activeExercise]);

  if (exerciseNames.length === 0) {
    return (
      <div className="card p-4">
        <p className="label mb-1">Grafik progres per gerakan</p>
        <p className="text-sm text-[var(--muted)]">Belum ada riwayat latihan untuk ditampilkan.</p>
      </div>
    );
  }

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const delta = first && last ? Math.round((last.best1RM - first.best1RM) * 100) / 100 : 0;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <label className="label" htmlFor="ex-select">
            Grafik progres per gerakan (estimasi 1RM)
          </label>
          <select
            id="ex-select"
            className="input max-w-xs"
            value={activeExercise}
            onChange={(e) => setSelected(e.target.value)}
          >
            {exerciseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {chartData.length > 1 && (
          <div
            className={`text-sm font-medium text-right ${
              trend === "up"
                ? "text-[var(--success)]"
                : trend === "down"
                ? "text-[var(--danger)]"
                : "text-[var(--muted)]"
            }`}
          >
            {trend === "up" && `↑ Naik ${delta}kg`}
            {trend === "down" && `↓ Turun ${Math.abs(delta)}kg`}
            {trend === "flat" && "Stabil"}
            <div className="text-xs text-[var(--muted)] font-normal">sejak {first.date}</div>
          </div>
        )}
      </div>

      {chartData.length > 1 ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} domain={["auto", "auto"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="best1RM"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Butuh minimal 2 sesi tercatat untuk gerakan ini agar grafik muncul.
        </p>
      )}
    </div>
  );
}
