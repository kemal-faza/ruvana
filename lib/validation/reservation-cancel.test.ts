import { describe, expect, it } from "vitest";

import { parseCancelBody } from "./reservation";

describe("parseCancelBody", () => {
  it("menerima alasan valid (di-trim)", () => {
    const r = parseCancelBody({ alasan: "  Jadwal kegiatan berubah.  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.alasan).toBe("Jadwal kegiatan berubah.");
  });

  it("menolak body bukan objek", () => {
    for (const body of [null, [], "alasan", 42]) {
      const r = parseCancelBody(body);
      expect(r.ok).toBe(false);
    }
  });

  it("menolak alasan hilang atau bukan string", () => {
    for (const body of [{}, { alasan: 123 }, { alasan: null }]) {
      const r = parseCancelBody(body);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[0].field).toBe("alasan");
    }
  });

  it("menolak alasan kosong setelah trim", () => {
    const r = parseCancelBody({ alasan: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].field).toBe("alasan");
  });

  it("menolak alasan lebih dari 500 karakter", () => {
    const r = parseCancelBody({ alasan: "a".repeat(501) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].field).toBe("alasan");
  });

  it("menerima alasan tepat 500 karakter", () => {
    const r = parseCancelBody({ alasan: "a".repeat(500) });
    expect(r.ok).toBe(true);
  });
});
