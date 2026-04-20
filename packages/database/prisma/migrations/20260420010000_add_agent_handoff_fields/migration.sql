-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'bot';
ALTER TABLE "Conversation" ADD COLUMN "escalatedAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN "escalationReason" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "senderType" TEXT NOT NULL DEFAULT 'bot';
