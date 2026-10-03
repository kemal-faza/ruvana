import { createAnalyticsCsvResponse } from "@/lib/exports/analytics-csv-response";
import { loadAuthorizedAnalyticsExport } from "@/lib/exports/analytics-export-loader";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const result = await loadAuthorizedAnalyticsExport(request);
  if (!result.ok) return result.response;
  return createAnalyticsCsvResponse(result.model);
}
