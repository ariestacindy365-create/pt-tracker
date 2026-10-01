"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientDTO } from "@/lib/types";

export function ProfileTab({ client }: { client: ClientDTO }) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [pin, setPin] = useState("");
  const [goalWeight, setGoalWeight] = useState(client.goalWeight != null ? String(client.goalWeight) : "");
  const [goalBodyFatPercent, setGoalBodyFatPercent] = useState(
    client.goalBodyFatPercent != null ? String(client.goalBodyFatPercent) : ""
  );
  const [goalDate, setGoalDate] = useState(client.goalDate ? client.goalDate.slice(0, 10) : "");
  const [goalNote, setGoalNote] = useState(client.goalNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          notes,
          email: email || null,
          pin: pin || undefined,
          goalWeight: goalWeight ? Number(goalWeight) : null,
          goalBodyFatPercent: goalBodyFatPercent ? Number(goalBodyFatPercent) : null,
          goalDate: goalDate || null,
          goalNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan");
        return;
      }
      setPin("");
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Hapus klien "${client.name}"? Data histori tetap tersimpan tapi klien akan disembunyikan dari daftar.`)) {
      return;
    }
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSave} className="card p-4 flex flex-col gap-3 max-w-md">
      <div>
        <label className="label" htmlFor="p-name">
          Nama klien
        </label>
        <input
          id="p-name"
          required
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="p-phone">
          No. HP
        </label>
        <input
          id="p-phone"
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="p-notes">
          Catatan
        </label>
        <textarea
          id="p-notes"
          className="input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-[var(--border)] p-3 flex flex-col gap-3">
        <p className="text-sm font-medium">Target progress</p>
        <p className="text-xs text-[var(--muted)] -mt-2">
          Dibandingkan ke body metric terbaru klien di tab Progress. Kosongkan yang tidak dipakai.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-goal-weight">
              Target berat (kg)
            </label>
            <input
              id="p-goal-weight"
              type="number"
              step="0.1"
              className="input"
              value={goalWeight}
              onChange={(e) => setGoalWeight(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-goal-bf">
              Target body fat (%)
            </label>
            <input
              id="p-goal-bf"
              type="number"
              step="0.1"
              className="input"
              value={goalBodyFatPercent}
              onChange={(e) => setGoalBodyFatPercent(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-goal-date">
              Target tanggal
            </label>
            <input
              id="p-goal-date"
              type="date"
              className="input"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-goal-note">
              Catatan target
            </label>
            <input
              id="p-goal-note"
              className="input"
              value={goalNote}
              onChange={(e) => setGoalNote(e.target.value)}
              placeholder="mis. siap lomba Maret"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] p-3 flex flex-col gap-3">
        <p className="text-sm font-medium">
          Akses login klien{" "}
          <span
            className={`text-xs font-normal ${
              client.hasLoginAccess ? "text-[var(--success)]" : "text-[var(--muted)]"
            }`}
          >
            {client.hasLoginAccess ? "· aktif" : "· belum aktif"}
          </span>
        </p>
        <p className="text-xs text-[var(--muted)] -mt-2">
          Klien login sendiri di <code>/member/login</code> pakai email + PIN di bawah, untuk
          lihat & input progress/latihan/nutrisinya sendiri.
        </p>
        <div>
          <label className="label" htmlFor="p-email">
            Email klien
          </label>
          <input
            id="p-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="p-pin">
            {client.hasLoginAccess ? "Reset PIN (kosongkan jika tidak diubah)" : "PIN awal (4-6 digit)"}
          </label>
          <input
            id="p-pin"
            inputMode="numeric"
            className="input"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="mis. 1234"
          />
        </div>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {saved && <p className="text-sm text-[var(--success)]">Tersimpan.</p>}
      <div className="flex gap-2 justify-between pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="text-sm text-[var(--danger)] hover:underline"
        >
          Hapus klien
        </button>
      </div>
    </form>
  );
}
