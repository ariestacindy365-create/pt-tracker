"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, notes, email, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambah klien");
        return;
      }
      setName("");
      setPhone("");
      setNotes("");
      setEmail("");
      setPin("");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Tambah Klien
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-3 max-w-md">
      <div>
        <label className="label" htmlFor="c-name">
          Nama klien
        </label>
        <input
          id="c-name"
          required
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="c-phone">
          No. HP (opsional)
        </label>
        <input
          id="c-phone"
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="c-notes">
          Catatan (opsional)
        </label>
        <textarea
          id="c-notes"
          className="input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="rounded-lg border border-[var(--border)] p-3 flex flex-col gap-3">
        <p className="text-xs text-[var(--muted)]">
          Opsional: isi email + PIN kalau klien ini perlu login sendiri di{" "}
          <code>/member/login</code> (bisa diaktifkan belakangan lewat tab Profil).
        </p>
        <div>
          <label className="label" htmlFor="c-email">
            Email klien
          </label>
          <input
            id="c-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="c-pin">
            PIN awal (4-6 digit)
          </label>
          <input
            id="c-pin"
            inputMode="numeric"
            className="input"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="mis. 1234"
          />
        </div>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Batal
        </button>
      </div>
    </form>
  );
}
