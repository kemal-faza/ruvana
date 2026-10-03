import { Role } from "@/generated/prisma/enums";

const nextPathsByRole: Record<Role, readonly string[]> = {
  [Role.pengguna]: ["/reservasi", "/reports", "/pengaturan", "/fasilitas"],
  [Role.petugas]: ["/petugas", "/fasilitas"],
  [Role.admin]: ["/admin", "/petugas/antrian", "/fasilitas"],
};

function isAllowedNextPath(role: Role, next: string): boolean {
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return false;

  const rawPath = next.split(/[?#]/, 1)[0];
  if (/%2f|%5c/i.test(rawPath)) return false;

  try {
    const url = new URL(next, "https://ruvana.invalid");
    return (
      url.origin === "https://ruvana.invalid" &&
      (url.pathname === "/" ||
        nextPathsByRole[role].some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)))
    );
  } catch {
    return false;
  }
}

export function getReservationReturnPath(searchParams: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();

  for (const key of ["type", "date"] as const) {
    const value = searchParams[key];
    if (typeof value === "string" && value !== "") query.set(key, value);
  }

  const search = query.toString();
  return search ? `/reservasi?${search}` : "/reservasi";
}

export function getPostLoginPath(role: Role, next?: string): string {
  if (next && isAllowedNextPath(role, next)) return next;
  if (role === Role.admin) return "/admin/analitik";
  if (role === Role.petugas) return "/petugas";
  return "/reservasi";
}
