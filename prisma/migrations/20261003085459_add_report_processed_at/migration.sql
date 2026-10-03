-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "waktuDiproses" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "reports_status_createdAt_id_idx" ON "reports"("status", "createdAt", "id");
