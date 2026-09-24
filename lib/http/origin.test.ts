import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { validateOrigin } from "./origin";

function reqWithOrigin(origin: string | null, extraHeaders: Record<string, string> = {}): NextRequest {
  const headers = new Headers();
  if (origin !== null) headers.set("origin", origin);
  for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  return new NextRequest("http://127.0.0.1:3000/api/reservations", { headers });
}

describe("validateOrigin", () => {
  const allowed = ["http://127.0.0.1:3000", "https://app.example.invalid"];

  it("menerima origin yang di-allowlist", () => {
    const req = reqWithOrigin("http://127.0.0.1:3000");
    expect(validateOrigin(req, allowed).ok).toBe(true);
  });

  it("menolak missing origin", () => {
    const req = new NextRequest("http://127.0.0.1:3000/api/reservations");
    const r = validateOrigin(req, allowed);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("missing");
  });

  it("menolak literal null", () => {
    const req = reqWithOrigin("null");
    expect(validateOrigin(req, allowed).ok).toBe(false);
  });

  it("menolak multiple values (comma)", () => {
    const req = reqWithOrigin("http://127.0.0.1:3000, http://evil.com");
    const r = validateOrigin(req, allowed);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("multiple");
  });

  it("menolak malformed", () => {
    const req = reqWithOrigin("not-a-url");
    expect(validateOrigin(req, allowed).ok).toBe(false);
  });

  it("menolak tidak di allowlist", () => {
    const req = reqWithOrigin("http://evil.com");
    const r = validateOrigin(req, allowed);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("not_allowed");
  });

  it("menolak origin dengan path", () => {
    const req = reqWithOrigin("http://127.0.0.1:3000/evil");
    expect(validateOrigin(req, allowed).ok).toBe(false);
  });
});
