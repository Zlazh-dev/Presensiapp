/*
  Warnings:

  - A unique constraint covering the columns `[teacher_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "teacher_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_teacher_id_key" ON "users"("teacher_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
