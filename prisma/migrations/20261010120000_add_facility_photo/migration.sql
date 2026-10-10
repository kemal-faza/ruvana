-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "foto" TEXT,
ADD COLUMN     "fotoContentType" TEXT,
ADD COLUMN     "fotoSize" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "facilities_foto_key" ON "facilities"("foto");
