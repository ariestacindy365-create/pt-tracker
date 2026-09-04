import { NextResponse } from "next/server";
import { destroyMemberSession } from "@/lib/memberSession";

export async function POST() {
  await destroyMemberSession();
  return NextResponse.json({ ok: true });
}
