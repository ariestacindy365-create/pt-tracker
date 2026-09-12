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

  // Every set is its own point, in chronological order (by date, then set
  // number within a date) — plots the real beban actually lifted, not the
  // calculated/estimated 1RM, and doesn't collapse multiple sets from the
  // same day into one point.
  const chartData = useMemo(() => {
    if (!activeExercise) return [];
    return loadEntries
      .filter((l) => l.exerciseName === activeExercise)
      .sort((a, b) => {
        const byDate = a.recordedDate.localeCompare(b.recordedDate);
        return byDate !== 0 ? byDate : a.setNumber - b.setNumber;
      })
      .map((l) => ({
        key: l.id,
        label: `${fmtDate(l.recordedDate)} · S${l.setNumber}`,
        weight: l.weight,
      }));
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
  const delta = first && last ? Math.round((last.weight - first.weight) * 100) / 100 : 0;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <label className="label" htmlFor="ex-select">
            Grafik progres per gerakan (beban aktual per set)
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
            <div className="text-xs text-[var(--muted)] font-normal">sejak {first.label}</div>
          </div>
        )}
      </div>

      {chartData.length > 1 ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" fontSize={11} interval="preserveStartEnd" />
              <YAxis fontSize={12} domain={["auto", "auto"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : first ? (
        <p className="text-sm text-[var(--muted)]">
          Baru ada 1 set tercatat ({first.label}, {first.weight}kg). Catat satu set lagi
          untuk gerakan ini biar grafiknya muncul.
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Belum ada riwayat untuk gerakan ini.
        </p>
      )}
    </div>
  );
}
