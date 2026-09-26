import { internalError } from "@/lib/http/problem";
import { loadAuthorizedAnalyticsExport } from "@/lib/exports/analytics-export-loader";
import { serializeAnalyticsPdf } from "@/lib/exports/analytics-pdf";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const instance = new URL(request.url).pathname;
  const result = await loadAuthorizedAnalyticsExport(request);
  if (!result.ok) return result.response;

  const { startDate, endDate } = result.model.metadata;
  try {
    const pdf = await serializeAnalyticsPdf(result.model);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="analitik-${startDate}-${endDate}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Gagal membuat PDF analitik", error);
    return internalError(instance);
  }
}
