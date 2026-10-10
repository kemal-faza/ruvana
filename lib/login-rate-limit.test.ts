import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteLoginAttempts, reserveLoginAttemptSlot } from "@/lib/db/auth";
import { clearLoginFailures, loginAttemptKey, reserveLoginAttempt } from "./login-rate-limit";

vi.mock("@/lib/db/auth", () => ({ deleteLoginAttempts: vi.fn(), reserveLoginAttemptSlot: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("batas percobaan login", () => {
  it("meminta satu slot atomik dari database dengan batas 10 per 2 menit", async () => {
    vi.mocked(reserveLoginAttemptSlot).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const key = loginAttemptKey("ayu@example.test", "127.0.0.1");

    expect(await reserveLoginAttempt(key)).toBe(true);
    expect(await reserveLoginAttempt(key)).toBe(false);
    expect(reserveLoginAttemptSlot).toHaveBeenCalledTimes(2);
    expect(reserveLoginAttemptSlot).toHaveBeenCalledWith(key, 2, 10);
    expect(key).not.toContain("ayu@example.test");
  });

  it("menghapus batas setelah login berhasil", async () => {
    await clearLoginFailures("bucket-key");
    expect(deleteLoginAttempts).toHaveBeenCalledWith("bucket-key");
  });
});
