-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "addonSubscriptionId" TEXT,
  ADD COLUMN "addonStatus" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "addonPriceId" TEXT,
  ADD COLUMN "addonPeriodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_addonSubscriptionId_key" ON "User"("addonSubscriptionId");
