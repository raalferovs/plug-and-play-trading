-- AlterTable: add risk-limit fields to CopyTradingAccount
ALTER TABLE "CopyTradingAccount"
  ADD COLUMN "metacopierRiskLimitId" TEXT,
  ADD COLUMN "dailyRiskLimit" DOUBLE PRECISION NOT NULL DEFAULT 10;
