-- AlterTable
ALTER TABLE "Bot" ADD COLUMN     "connected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "connectingAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastUpdateId" INTEGER,
ADD COLUMN     "quarantined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telegramId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "webhookSecret" TEXT,
ALTER COLUMN "token" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ManagedCloneAttempt" (
    "ownerId" TEXT NOT NULL,
    "generation" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "botTelegramId" TEXT,

    CONSTRAINT "ManagedCloneAttempt_pkey" PRIMARY KEY ("ownerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bot_telegramId_key" ON "Bot"("telegramId");
