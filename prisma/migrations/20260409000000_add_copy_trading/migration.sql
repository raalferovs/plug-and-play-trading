-- CreateTable
CREATE TABLE "CopyTradingAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metacopierAccountId" TEXT,
    "metacopierId" TEXT,
    "brokerServer" TEXT NOT NULL,
    "loginNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "riskMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "alias" TEXT NOT NULL DEFAULT '',
    "balance" DOUBLE PRECISION,
    "equity" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopyTradingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CopyTradingAccount_metacopierAccountId_key" ON "CopyTradingAccount"("metacopierAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CopyTradingAccount_metacopierId_key" ON "CopyTradingAccount"("metacopierId");

-- AddForeignKey
ALTER TABLE "CopyTradingAccount" ADD CONSTRAINT "CopyTradingAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
