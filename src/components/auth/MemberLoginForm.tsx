"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MemberLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/member/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal login");
        return;
      }
      router.push("/member");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="m-email">
          Email
        </label>
        <input
          id="m-email"
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="m-pin">
          PIN
        </label>
        <input
          id="m-pin"
          inputMode="numeric"
          required
          className="input"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Masuk..." : "Masuk"}
      </button>
    </form>
  );
}
