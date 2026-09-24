import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MASA_SESI_JAM } from "@/config/business";
import { createAuthSession, deleteAuthSession, findAuthSession, findSessionUser } from "@/lib/db/auth";
import { AccountStatus, Role } from "@/generated/prisma/enums";

const COOKIE_NAME = "ruvana_session";
const MAX_AGE = MASA_SESI_JAM * 60 * 60;

export type SessionUser = {
  id: number;
  nama: string;
  email: string;
  role: Role;
};

export type SessionAccount = SessionUser & {
  status: AccountStatus;
  waktuDaftar: Date;
  waktuVerifikasi: Date | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  await createAuthSession(hashToken(token), userId, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return expiresAt;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await deleteAuthSession(hashToken(token));
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await findAuthSession(hashToken(token));
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.userId;
}

export async function getSessionUser(): Promise<SessionAccount | null> {
  const uid = await getSessionUserId();
  if (uid === null) return null;
  const user = await findSessionUser(uid);
  if (!user || user.status !== AccountStatus.ACTIVE) return null;
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== Role.admin) redirect("/403");
  return user;
}

export async function requirePetugas(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== Role.petugas) redirect("/403");
  return user;
}
