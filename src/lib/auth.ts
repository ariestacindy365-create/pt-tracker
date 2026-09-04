import "server-only";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { getMemberSession } from "@/lib/memberSession";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Use in server components / route handlers that require a logged-in trainer.
// Redirects to /login when there is no valid session.
export async function requireTrainer() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

// Use in server components / route handlers that require a logged-in client
// (member). Redirects to /member/login when there is no valid session.
export async function requireMember() {
  const session = await getMemberSession();
  if (!session) {
    redirect("/member/login");
  }
  return session;
}
