"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MemberAccountTab({
  name,
  email,
  phone,
  trainerName,
}: {
  name: string;
  email: string | null;
  phone: string | null;
  trainerName: string;
}) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (newEmail && newEmail !== email) payload.email = newEmail;
      if (newPin) payload.pin = newPin;

      if (Object.keys(payload).length === 0) {
        setError("Tidak ada perubahan.");
        return;
      }

      const res = await fetch("/api/member/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan");
        return;
      }
      setNewPin("");
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <div className="card p-4 text-sm flex flex-col gap-1">
        <p><span className="text-[var(--muted)]">Nama:</span> {name}</p>
        <p><span className="text-[var(--muted)]">No. HP:</span> {phone ?? "-"}</p>
        <p><span className="text-[var(--muted)]">Trainer:</span> {trainerName}</p>
        <p className="text-xs text-[var(--muted)] mt-1">
          Nama, no. HP, dan trainer dikelola oleh trainer kamu.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-3">
        <p className="label">Ubah email / PIN login</p>
        <div>
          <label className="label" htmlFor="acc-email">Email</label>
          <input
            id="acc-email"
            type="email"
            className="input"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="acc-pin">PIN baru (kosongkan jika tidak diubah)</label>
          <input
            id="acc-pin"
            inputMode="numeric"
            className="input"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="4-6 digit"
          />
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {saved && <p className="text-sm text-[var(--success)]">Tersimpan.</p>}
        <button type="submit" className="btn-primary self-start" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </div>
  );
}
