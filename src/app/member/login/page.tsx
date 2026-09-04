import Link from "next/link";
import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/memberSession";
import { MemberLoginForm } from "@/components/auth/MemberLoginForm";

export default async function MemberLoginPage() {
  const session = await getMemberSession();
  if (session) redirect("/member");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-1">PT Tracker</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Login klien — pakai email & PIN dari trainer kamu.
        </p>
        <MemberLoginForm />
        <p className="text-sm text-[var(--muted)] mt-6">
          Kamu personal trainer?{" "}
          <Link href="/login" className="text-[var(--accent)] font-medium">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
