import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import {
  BATAS_EMAIL_AKUN_KARAKTER,
  BATAS_NAMA_AKUN_KARAKTER,
  BATAS_PASSWORD_AKUN_BYTE,
} from "@/config/business";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ManagedUsersQuery = {
  search?: string;
  role?: Role;
  status?: AccountStatus;
  page: number;
  perPage: number;
};

export async function getManagedUsers(query: ManagedUsersQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? {
      OR: [
        { nama: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ],
    } : {}),
  };
  const [items, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { id: "asc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      select: { id: true, nama: true, email: true, role: true, status: true, waktuDaftar: true, waktuVerifikasi: true },
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items: items.map((user) => ({
      ...user,
      waktuDaftar: user.waktuDaftar.toISOString(),
      waktuVerifikasi: user.waktuVerifikasi?.toISOString() ?? null,
    })),
    meta: {
      page: query.page,
      perPage: query.perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / query.perPage),
    },
  };
}

export type CreateManagedUserResult =
  | { kind: "ok"; user: { id: number; nama: string; email: string; role: Role; status: AccountStatus; waktuDaftar: string; waktuVerifikasi: string | null } }
  | { kind: "validation"; errors: { field: string; code: string; message: string }[] }
  | { kind: "duplicate" }
  | { kind: "key_reused" };

export async function createManagedUser(adminId: number, _idempotencyKey: string, body: unknown): Promise<CreateManagedUserResult> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { kind: "validation", errors: [{ field: "body", code: "INVALID_BODY", message: "Data akun tidak valid." }] };
  }
  const input = body as Record<string, unknown>;
  const nama = typeof input.nama === "string" ? input.nama.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role;
  const errors: { field: string; code: string; message: string }[] = [];
  if (!nama || nama.length > BATAS_NAMA_AKUN_KARAKTER) errors.push({ field: "nama", code: "NAME_INVALID", message: "Nama wajib diisi dan maksimal 100 karakter." });
  if (!EMAIL_RE.test(email) || email.length > BATAS_EMAIL_AKUN_KARAKTER) errors.push({ field: "email", code: "EMAIL_INVALID", message: "Format email tidak valid." });
  const passwordBytes = Buffer.byteLength(password, "utf8");
  if (passwordBytes < 8 || passwordBytes > BATAS_PASSWORD_AKUN_BYTE) errors.push({ field: "password", code: "PASSWORD_INVALID", message: "Kata sandi harus berukuran 8 sampai 72 byte UTF-8." });
  if (role !== Role.pengguna && role !== Role.petugas) errors.push({ field: "role", code: "ROLE_INVALID", message: "Role akun tidak valid." });
  if (Object.keys(input).some((key) => !["nama", "email", "password", "role"].includes(key))) errors.push({ field: "body", code: "UNKNOWN_FIELD", message: "Data akun tidak valid." });
  if (errors.length) return { kind: "validation", errors };

  try {
    const user = await prisma.user.create({
      data: {
        nama,
        email,
        password: await bcrypt.hash(password, 10),
        role: role as Role,
        status: AccountStatus.ACTIVE,
        dibuatOleh: adminId,
        waktuVerifikasi: new Date(),
      },
      select: { id: true, nama: true, email: true, role: true, status: true, waktuDaftar: true, waktuVerifikasi: true },
    });
    return { kind: "ok", user: { ...user, waktuDaftar: user.waktuDaftar.toISOString(), waktuVerifikasi: user.waktuVerifikasi?.toISOString() ?? null } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { kind: "duplicate" };
    throw error;
  }
}
