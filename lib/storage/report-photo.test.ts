import { describe, expect, it } from "vitest";

import { detectImageKind } from "./report-photo";

describe("detectImageKind", () => {
  it("mengenali JPEG dari magic bytes FF D8 FF", () => {
    expect(detectImageKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe("jpeg");
  });

  it("mengenali PNG dari signature delapan byte", () => {
    expect(detectImageKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
  });

  it("mengenali WebP dari container RIFF....WEBP", () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(detectImageKind(webp)).toBe("webp");
  });

  it("menolak berkas yang bukan gambar", () => {
    expect(detectImageKind(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]))).toBeNull();
    expect(detectImageKind(new Uint8Array([]))).toBeNull();
  });
});