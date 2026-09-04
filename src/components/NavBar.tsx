import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export function NavBar({ trainerName }: { trainerName: string }) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold text-[var(--accent)]">
          PT Tracker
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--muted)]">{trainerName}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
