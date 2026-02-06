-- CreateTable
CREATE TABLE "special_days" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "is_overtime" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "special_days_date_key" ON "special_days"("date");

-- CreateIndex
CREATE INDEX "special_days_date_idx" ON "special_days"("date");
