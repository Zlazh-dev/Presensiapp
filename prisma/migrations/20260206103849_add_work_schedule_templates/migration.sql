/*
  Warnings:

  - Added the required column `name` to the `work_schedules` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add columns as nullable first
ALTER TABLE "work_schedules" ADD COLUMN "is_default" BOOLEAN DEFAULT false;
ALTER TABLE "work_schedules" ADD COLUMN "name" TEXT;

-- Step 2: Update existing records with default values
UPDATE "work_schedules" SET "name" = 'Default Schedule', "is_default" = true WHERE "name" IS NULL;

-- Step 3: Make name NOT NULL after data migration
ALTER TABLE "work_schedules" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "work_schedules" ALTER COLUMN "is_default" SET NOT NULL;


-- CreateTable
CREATE TABLE "work_schedule_assignments" (
    "id" SERIAL NOT NULL,
    "work_schedule_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_schedule_assignments_start_date_end_date_idx" ON "work_schedule_assignments"("start_date", "end_date");

-- AddForeignKey
ALTER TABLE "work_schedule_assignments" ADD CONSTRAINT "work_schedule_assignments_work_schedule_id_fkey" FOREIGN KEY ("work_schedule_id") REFERENCES "work_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
