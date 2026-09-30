-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "statusChangedAt" TIMESTAMPTZ(3),
ADD COLUMN     "statusChangedById" INTEGER;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_statusChangedById_fkey" FOREIGN KEY ("statusChangedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
