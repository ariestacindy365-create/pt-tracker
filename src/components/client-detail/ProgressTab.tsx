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

  const chartData = visibleMetrics.map((m) => ({
    date: fmtDate(m.recordedDate),
    weight: m.weight,
    bodyFatPercent: m.bodyFatPercent,
    skeletalMuscleMass: m.skeletalMuscleMass,
    visceralFat: m.visceralFat,
  }));

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

      {chartData.length > 1 && (
        <div className="card p-4">
          <p className="label mb-2">Tren berat badan (kg)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} domain={["auto", "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
