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
    expect(revalidatePath).toHaveBeenCalledWith("/publik/fasilitas");
    expect(revalidatePath).toHaveBeenCalledWith("/publik/fasilitas/1");
  });

  it("memakai id fasilitas pada path detail", () => {
    revalidateFacilityViews(42);

    expect(revalidatePath).toHaveBeenCalledWith("/fasilitas/42");
    expect(revalidatePath).toHaveBeenCalledWith("/publik/fasilitas/42");
    expect(revalidatePath).toHaveBeenCalledTimes(4);
  });
});
