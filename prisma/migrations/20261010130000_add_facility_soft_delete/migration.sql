-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "deletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "deletedById" INTEGER,
ADD COLUMN     "deletedByNama" TEXT;
