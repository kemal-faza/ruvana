import { serializeAnalyticsCsv } from "@/lib/exports/analytics-csv";
import type { AnalyticsExportModel } from "@/lib/exports/analytics-export-model";

export function createAnalyticsCsvResponse(model: AnalyticsExportModel): Response {
  const { startDate, endDate } = model.metadata;
  const filename = `analitik-${startDate}-${endDate}.csv`;

  return new Response(serializeAnalyticsCsv(model.csvRows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
