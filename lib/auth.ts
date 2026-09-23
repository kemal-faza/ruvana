import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MASA_SESI_JAM } from "@/config/business";
import { prisma } from "@/lib/prisma";
import { AccountStatus, Role } from "@/generated/prisma/enums";

const COOKIE_NAME = "ruvana_session";
const MAX_AGE = MASA_SESI_JAM * 60 * 60;

export type SessionUser = {
  id: number;
  nama: string;
  email: string;
  role: Role;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + MAX_AGE * 1000),
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true, expiresAt: true },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.userId;
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

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== Role.admin) redirect("/403");
  return user;
}
