"use server";

import { revalidatePath } from "next/cache";

import { Role } from "@/generated/prisma/enums";
import { getSessionUser } from "@/lib/auth";
import { createReport, type CreateReportResult } from "@/lib/services/report-service";

export type CreateReportActionResult = CreateReportResult;

function parseFacilityId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function createReportAction(formData: FormData): Promise<CreateReportActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, errors: {}, message: "Sesi berakhir. Masuk kembali sebelum mengirim laporan." };
  if (user.role !== Role.pengguna) {
    return { ok: false, errors: {}, message: "Hanya pengguna yang dapat mengirim laporan." };
  }

  const kategori = formData.get("kategori");
  const deskripsi = formData.get("deskripsi");
  const fotoPathname = formData.get("fotoPathname");
  const fotoType = formData.get("fotoType");
  const fotoSizeValue = formData.get("fotoSize");
  const fotoSize = typeof fotoSizeValue === "string" && /^\d+$/.test(fotoSizeValue) ? Number(fotoSizeValue) : 0;
  const foto =
    typeof fotoPathname === "string"
      ? { pathname: fotoPathname, contentType: typeof fotoType === "string" ? fotoType : "", size: fotoSize }
      : null;

  const result = await createReport({
    userId: user.id,
    facilityId: parseFacilityId(formData.get("facilityId")),
    kategori: typeof kategori === "string" ? kategori : "",
    deskripsi: typeof deskripsi === "string" ? deskripsi : "",
    foto,
  });

  if (result.ok) {
    revalidatePath("/reports");
  }
  return result;
}
