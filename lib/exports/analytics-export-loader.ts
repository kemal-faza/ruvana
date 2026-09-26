import { Role } from "@/generated/prisma/enums";
import { getSessionUser } from "@/lib/auth";
import { forbidden, internalError, unauthorized, validationFailed } from "@/lib/http/problem";
import { buildAnalyticsExportModel } from "@/lib/exports/analytics-export-model";
import { getAnalyticsSnapshot } from "@/lib/services/admin-analytics-service";
import { parseAnalyticsFilters } from "@/lib/validation/admin-analytics";

export type AuthorizedAnalyticsExportResult =
  | { ok: true; model: ReturnType<typeof buildAnalyticsExportModel> }
  | { ok: false; response: Response };

function singleOrRepeated(values: string[]): string | string[] | undefined {
  if (values.length === 0) return undefined;
  if (values.length === 1) return values[0];
  return values;
}

export async function loadAuthorizedAnalyticsExport(request: Request): Promise<AuthorizedAnalyticsExportResult> {
  const instance = new URL(request.url).pathname;
  let user: Awaited<ReturnType<typeof getSessionUser>>;

  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Gagal memeriksa sesi ekspor analitik", error);
    return { ok: false, response: internalError(instance) };
  }

  if (!user) return { ok: false, response: unauthorized(instance) };
  if (user.role !== Role.admin) return { ok: false, response: forbidden(instance) };

  const searchParams = new URL(request.url).searchParams;
  const filtersResult = parseAnalyticsFilters({
    startDate: singleOrRepeated(searchParams.getAll("startDate")),
    endDate: singleOrRepeated(searchParams.getAll("endDate")),
    location: singleOrRepeated(searchParams.getAll("location")),
  });

  if (!filtersResult.ok) {
    return { ok: false, response: validationFailed(instance, filtersResult.errors) };
  }

  try {
    const snapshotResult = await getAnalyticsSnapshot(filtersResult.value);
    if (!snapshotResult.ok) {
      return { ok: false, response: validationFailed(instance, snapshotResult.errors) };
    }

    return { ok: true, model: buildAnalyticsExportModel(snapshotResult.data) };
  } catch (error) {
    console.error("Gagal membuat snapshot ekspor analitik", error);
    return { ok: false, response: internalError(instance) };
  }
}
