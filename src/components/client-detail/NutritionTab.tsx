"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NutritionTargetDTO, NutritionLogDTO } from "@/lib/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function NutritionTab({
  apiBase,
  target,
  logs,
  canEditTarget = true,
}: {
  apiBase: string;
  target: NutritionTargetDTO;
  logs: NutritionLogDTO[];
  canEditTarget?: boolean;
}) {
  const router = useRouter();

  const [calories, setCalories] = useState(target?.calories?.toString() ?? "");
  const [protein, setProtein] = useState(target?.protein?.toString() ?? "");
  const [carbs, setCarbs] = useState(target?.carbs?.toString() ?? "");
  const [fat, setFat] = useState(target?.fat?.toString() ?? "");
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);

  const [recordedDate, setRecordedDate] = useState(todayStr());
  const [lCalories, setLCalories] = useState("");
  const [lProtein, setLProtein] = useState("");
  const [lCarbs, setLCarbs] = useState("");
  const [lFat, setLFat] = useState("");
  const [note, setNote] = useState("");
  const [logError, setLogError] = useState<string | null>(null);
  const [logSaving, setLogSaving] = useState(false);

  async function handleSaveTarget(e: React.FormEvent) {
    e.preventDefault();
    setTargetError(null);
    setTargetSaving(true);
    try {
      const res = await fetch(`${apiBase}/nutrition/target`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories: calories || null,
          protein: protein || null,
          carbs: carbs || null,
          fat: fat || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTargetError(data.error ?? "Gagal menyimpan target");
        return;
      }
      router.refresh();
    } finally {
      setTargetSaving(false);
    }
  }

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    setLogError(null);
    setLogSaving(true);
    try {
      const res = await fetch(`${apiBase}/nutrition/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordedDate,
          calories: lCalories || null,
          protein: lProtein || null,
          carbs: lCarbs || null,
          fat: lFat || null,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLogError(data.error ?? "Gagal menyimpan catatan");
        return;
      }
      setLCalories("");
      setLProtein("");
      setLCarbs("");
      setLFat("");
      setNote("");
      router.refresh();
    } finally {
      setLogSaving(false);
    }
  }

  async function handleDeleteLog(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    const res = await fetch(`${apiBase}/nutrition/logs/${id}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <p className="label mb-2">Target harian</p>
        {canEditTarget ? (
          <form onSubmit={handleSaveTarget} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="label" htmlFor="t-cal">Kalori (kkal)</label>
              <input id="t-cal" type="number" className="input" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="t-pro">Protein (g)</label>
              <input id="t-pro" type="number" step="0.1" className="input" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="t-carb">Karbo (g)</label>
              <input id="t-carb" type="number" step="0.1" className="input" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="t-fat">Lemak (g)</label>
              <input id="t-fat" type="number" step="0.1" className="input" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full" disabled={targetSaving}>
                {targetSaving ? "..." : "Simpan target"}
              </button>
            </div>
          </form>
        ) : target ? (
          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <div><span className="text-[var(--muted)]">Kalori:</span> {target.calories ?? "-"} kkal</div>
            <div><span className="text-[var(--muted)]">Protein:</span> {target.protein ?? "-"} g</div>
            <div><span className="text-[var(--muted)]">Karbo:</span> {target.carbs ?? "-"} g</div>
            <div><span className="text-[var(--muted)]">Lemak:</span> {target.fat ?? "-"} g</div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Trainer belum mengisi target nutrisi.</p>
        )}
        {targetError && <p className="text-sm text-[var(--danger)] mt-2">{targetError}</p>}
      </div>

      <form onSubmit={handleAddLog} className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="label" htmlFor="n-date">Tanggal</label>
          <input id="n-date" type="date" required className="input" value={recordedDate} onChange={(e) => setRecordedDate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="n-cal">Kalori</label>
          <input id="n-cal" type="number" className="input" value={lCalories} onChange={(e) => setLCalories(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="n-pro">Protein</label>
          <input id="n-pro" type="number" step="0.1" className="input" value={lProtein} onChange={(e) => setLProtein(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="n-carb">Karbo</label>
          <input id="n-carb" type="number" step="0.1" className="input" value={lCarbs} onChange={(e) => setLCarbs(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="n-fat">Lemak</label>
          <input id="n-fat" type="number" step="0.1" className="input" value={lFat} onChange={(e) => setLFat(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="n-note">Catatan</label>
          <input id="n-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. kurangi gula" />
        </div>
        {logError && <p className="text-sm text-[var(--danger)] sm:col-span-2 lg:col-span-6">{logError}</p>}
        <div className="sm:col-span-2 lg:col-span-6">
          <button type="submit" className="btn-primary" disabled={logSaving}>
            {logSaving ? "Menyimpan..." : "Catat hari ini"}
          </button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <th className="p-3">Tanggal</th>
              <th className="p-3">Kalori</th>
              <th className="p-3">Protein</th>
              <th className="p-3">Karbo</th>
              <th className="p-3">Lemak</th>
              <th className="p-3">Catatan</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-[var(--muted)]">Belum ada catatan.</td>
              </tr>
            )}
            {logs.map((l) => {
              const overCal = target?.calories && l.calories && l.calories > target.calories;
              return (
                <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3">{fmtDate(l.recordedDate)}</td>
                  <td className={`p-3 ${overCal ? "text-[var(--danger)]" : ""}`}>
                    {l.calories ?? "-"}
                    {target?.calories ? ` / ${target.calories}` : ""}
                  </td>
                  <td className="p-3">{l.protein ?? "-"}</td>
                  <td className="p-3">{l.carbs ?? "-"}</td>
                  <td className="p-3">{l.fat ?? "-"}</td>
                  <td className="p-3 text-[var(--muted)]">{l.note ?? ""}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDeleteLog(l.id)} className="text-[var(--danger)] text-xs hover:underline">
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
