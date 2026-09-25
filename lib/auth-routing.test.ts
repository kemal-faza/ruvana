import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { getPostLoginPath } from "@/lib/auth-routing";

describe("tujuan setelah login", () => {
  it("membuka dashboard sesuai peran", () => {
    expect(getPostLoginPath(Role.admin)).toBe("/admin");
    expect(getPostLoginPath(Role.petugas)).toBe("/petugas");
    expect(getPostLoginPath(Role.pengguna)).toBe("/fasilitas");
  });
});
