import { loadAuthorizedAnalyticsExport } from "@/lib/exports/analytics-export-loader";
import { serializeAnalyticsXlsx } from "@/lib/exports/analytics-xlsx";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const result = await loadAuthorizedAnalyticsExport(request);
  if (!result.ok) return result.response;

  const { startDate, endDate } = result.model.metadata;
  const workbook = await serializeAnalyticsXlsx(result.model);
  return new Response(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="analitik-${startDate}-${endDate}.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
