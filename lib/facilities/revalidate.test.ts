import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";

import { revalidateFacilityViews } from "./revalidate";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("revalidateFacilityViews", () => {
  it("menginvalidasi daftar dan detail fasilitas publik", () => {
    revalidateFacilityViews(1);

    expect(revalidatePath).toHaveBeenCalledWith("/fasilitas");
    expect(revalidatePath).toHaveBeenCalledWith("/fasilitas/1");
  });

  it("menginvalidasi daftar dan detail fasilitas admin", () => {
    revalidateFacilityViews(1);

    expect(revalidatePath).toHaveBeenCalledWith("/admin/fasilitas");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/fasilitas/1");
  });

  it("memakai id fasilitas pada path detail dan total empat path", () => {
    revalidateFacilityViews(42);

    expect(revalidatePath).toHaveBeenCalledWith("/fasilitas/42");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/fasilitas/42");
    expect(revalidatePath).toHaveBeenCalledTimes(4);
  });
});
