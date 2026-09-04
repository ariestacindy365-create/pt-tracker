import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-1">PT Tracker</h1>
        <p className="text-sm text-[var(--muted)] mb-6">Masuk sebagai personal trainer</p>
        <LoginForm />
        <p className="text-sm text-[var(--muted)] mt-6">
          Belum punya akun?{" "}
          <Link href="/register" className="text-[var(--accent)] font-medium">
            Daftar
          </Link>
        </p>
        <p className="text-sm text-[var(--muted)] mt-2">
          Klien PT?{" "}
          <Link href="/member/login" className="text-[var(--accent)] font-medium">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
