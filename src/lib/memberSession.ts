import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pt_member_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

export type MemberSessionPayload = {
  clientId: string;
  trainerId: string;
  name: string;
};

export async function createMemberSession(payload: MemberSessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function destroyMemberSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getMemberSession(): Promise<MemberSessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as MemberSessionPayload;
  } catch {
    return null;
  }
}
