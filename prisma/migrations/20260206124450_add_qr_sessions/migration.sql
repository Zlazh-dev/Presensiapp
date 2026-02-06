-- CreateEnum
CREATE TYPE "QrSessionType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateTable
CREATE TABLE "qr_sessions" (
    "id" SERIAL NOT NULL,
    "type" "QrSessionType" NOT NULL,
    "token" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qr_sessions_token_key" ON "qr_sessions"("token");

-- CreateIndex
CREATE INDEX "qr_sessions_date_type_idx" ON "qr_sessions"("date", "type");
