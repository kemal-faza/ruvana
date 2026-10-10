-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
