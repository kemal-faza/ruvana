"use server";

import { revalidatePath } from "next/cache";

import { findDefaultReportOwner } from "@/lib/db/reports";
import { createReport, type CreateReportResult } from "@/lib/services/report-service";

export type CreateReportActionResult = CreateReportResult;

function parseFacilityId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function createReportAction(formData: FormData): Promise<CreateReportActionResult> {
  const owner = await findDefaultReportOwner();
  if (!owner) {
    return { ok: false, errors: {}, message: "Akun pengguna belum tersedia. Hubungi administrator." };
  }

  const kategori = formData.get("kategori");
  const deskripsi = formData.get("deskripsi");
  const foto = formData.get("foto");

  const result = await createReport({
    userId: owner.id,
    facilityId: parseFacilityId(formData.get("facilityId")),
    kategori: typeof kategori === "string" ? kategori : "",
    deskripsi: typeof deskripsi === "string" ? deskripsi : "",
    foto: foto instanceof File ? foto : null,
  });

  if (result.ok) {
    revalidatePath("/reports");
  }
  return result;
}