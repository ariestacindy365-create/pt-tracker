import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-1">Daftar Trainer</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Butuh kode undangan dari pemilik studio.
        </p>
        <RegisterForm />
        <p className="text-sm text-[var(--muted)] mt-6">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-[var(--accent)] font-medium">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
