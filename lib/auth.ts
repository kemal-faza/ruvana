import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AccountStatus, Role } from "@/generated/prisma/enums";

const COOKIE_NAME = "ruvana_session";
const MAX_AGE = 60 * 60 * 12; // 12 jam

const SESSION_SECRET = process.env.SESSION_SECRET ?? "ruvana-dev-secret";

type SessionPayload = { uid: number; exp: number };

export type SessionUser = {
  id: number;
  nama: string;
  email: string;
  role: Role;
};

function sign(data: string): string {
  return createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

function encodeToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeToken(token: string): SessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.uid !== "number" || typeof payload.exp !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: number) {
  const cookieStore = await cookies();
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  cookieStore.set(COOKIE_NAME, encodeToken({ uid: userId, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload.uid;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const uid = await getSessionUserId();
  if (uid === null) return null;
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, nama: true, email: true, role: true, status: true },
  });
  if (!user || user.status !== AccountStatus.ACTIVE) return null;
  return user;
}

// Guard untuk area admin (Modul 5): wajib sesi aktif & role admin.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== Role.admin) redirect("/login");
  return user;
}