"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { BodyMetricDTO } from "@/lib/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

type MetricPoint = { date: string; value: number };

// One small trend chart per body metric (berat, body fat, SMM, visceral
// fat) — each has its own scale, so they're plotted separately rather
// than crammed onto one shared axis.
function MetricChart({
  title,
  unit,
  points,
}: {
  title: string;
  unit: string;
  points: MetricPoint[];
}) {
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const delta = Math.round((last.value - first.value) * 100) / 100;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="label mb-0">{title}</p>
        <span
          className={`text-xs font-medium ${
            trend === "up"
              ? "text-[var(--success)]"
              : trend === "down"
              ? "text-[var(--danger)]"
              : "text-[var(--muted)]"
          }`}
        >
          {trend === "up" && `↑ ${delta}${unit}`}
          {trend === "down" && `↓ ${Math.abs(delta)}${unit}`}
          {trend === "flat" && "Stabil"}
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={11} domain={["auto", "auto"]} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProgressTab({
  apiBase,
  bodyMetrics,
}: {
  apiBase: string;
  bodyMetrics: BodyMetricDTO[];
}) {
  const router = useRouter();
  const [recordedDate, setRecordedDate] = useState(todayStr());
  const [weight, setWeight] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Hide deleted rows immediately instead of waiting for the DELETE
  // request + full page refresh to round-trip.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/body-metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordedDate,
          weight,
          bodyFatPercent: bodyFatPercent || null,
          skeletalMuscleMass: skeletalMuscleMass || null,
          visceralFat: visceralFat || null,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan");
        return;
      }
      setWeight("");
      setBodyFatPercent("");
      setSkeletalMuscleMass("");
      setVisceralFat("");
      setNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setHiddenIds((prev) => new Set(prev).add(id));
    const res = await fetch(`${apiBase}/body-metrics/${id}`, {
      method: "DELETE",
    });
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

  const visibleMetrics = bodyMetrics.filter((m) => !hiddenIds.has(m.id));

  const sortedAsc = [...visibleMetrics].sort(
    (a, b) => new Date(a.recordedDate).getTime() - new Date(b.recordedDate).getTime()
  );

  function pointsFor(field: keyof BodyMetricDTO): MetricPoint[] {
    return sortedAsc
      .filter((m) => m[field] != null)
      .map((m) => ({ date: fmtDate(m.recordedDate), value: m[field] as number }));
  }

  const weightPoints = pointsFor("weight");
  const bodyFatPoints = pointsFor("bodyFatPercent");
  const smmPoints = pointsFor("skeletalMuscleMass");
  const visceralFatPoints = pointsFor("visceralFat");

  const anyChart =
    weightPoints.length > 1 ||
    bodyFatPoints.length > 1 ||
    smmPoints.length > 1 ||
    visceralFatPoints.length > 1;

  const sorted = [...visibleMetrics].sort(
    (a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="label" htmlFor="bm-date">
            Tanggal
          </label>
          <input
            id="bm-date"
            type="date"
            required
            className="input"
            value={recordedDate}
            onChange={(e) => setRecordedDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="bm-weight">
            Berat (kg)
          </label>
          <input
            id="bm-weight"
            type="number"
            step="0.1"
            required
            className="input"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="bm-bf">
            Body fat (%)
          </label>
          <input
            id="bm-bf"
            type="number"
            step="0.1"
            className="input"
            value={bodyFatPercent}
            onChange={(e) => setBodyFatPercent(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="bm-smm">
            SMM (kg)
          </label>
          <input
            id="bm-smm"
            type="number"
            step="0.1"
            className="input"
            value={skeletalMuscleMass}
            onChange={(e) => setSkeletalMuscleMass(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="bm-vf">
            Visceral fat
          </label>
          <input
            id="bm-vf"
            type="number"
            step="0.1"
            className="input"
            value={visceralFat}
            onChange={(e) => setVisceralFat(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="bm-note">
            Catatan
          </label>
          <input
            id="bm-note"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[var(--danger)] sm:col-span-2 lg:col-span-6">{error}</p>}
        <div className="sm:col-span-2 lg:col-span-6">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan data"}
          </button>
        </div>
      </form>

      {anyChart && (
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricChart title="Berat badan (kg)" unit="kg" points={weightPoints} />
          <MetricChart title="Body fat (%)" unit="%" points={bodyFatPoints} />
          <MetricChart title="Skeletal muscle mass (kg)" unit="kg" points={smmPoints} />
          <MetricChart title="Visceral fat" unit="" points={visceralFatPoints} />
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <th className="p-3">Tanggal</th>
              <th className="p-3">Berat</th>
              <th className="p-3">Body fat</th>
              <th className="p-3">SMM</th>
              <th className="p-3">Visceral fat</th>
              <th className="p-3">Catatan</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-[var(--muted)]">
                  Belum ada data.
                </td>
              </tr>
            )}
            {sorted.map((m) => (
              <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3">{fmtDate(m.recordedDate)}</td>
                <td className="p-3">{m.weight} kg</td>
                <td className="p-3">{m.bodyFatPercent ?? "-"}{m.bodyFatPercent != null ? "%" : ""}</td>
                <td className="p-3">{m.skeletalMuscleMass ?? "-"}</td>
                <td className="p-3">{m.visceralFat ?? "-"}</td>
                <td className="p-3 text-[var(--muted)]">{m.note ?? ""}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-[var(--danger)] text-xs hover:underline"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
