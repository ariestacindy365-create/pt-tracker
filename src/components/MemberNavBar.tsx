import { MemberLogoutButton } from "@/components/MemberLogoutButton";

export function MemberNavBar({ name, trainerName }: { name: string; trainerName: string }) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-[var(--accent)]">PT Tracker</p>
          <p className="text-xs text-[var(--muted)]">Trainer: {trainerName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--muted)]">{name}</span>
          <MemberLogoutButton />
        </div>
      </div>
    </header>
  );
}
