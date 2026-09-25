import { Role } from "@/generated/prisma/enums";

export function getPostLoginPath(role: Role): string {
  if (role === Role.admin) return "/admin";
  if (role === Role.petugas) return "/petugas";
  return "/fasilitas";
}
