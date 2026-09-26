-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "fotoContentType" TEXT,
ADD COLUMN     "fotoSize" INTEGER;

-- CreateTable
CREATE TABLE "report_upload_rate_limits" (
    "key" VARCHAR(80) NOT NULL,
    "windowStartedAt" TIMESTAMPTZ(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "report_upload_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "report_upload_rate_limits_updatedAt_idx" ON "report_upload_rate_limits"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "reports_foto_key" ON "reports"("foto");
