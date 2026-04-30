-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseBinding" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "mt5Account" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "brokerServer" TEXT NOT NULL DEFAULT '',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIp" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "LicenseBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseValidationLog" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT,
    "keyAttempted" TEXT NOT NULL,
    "mt5Account" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseValidationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_userId_key" ON "License"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "License_key_key" ON "License"("key");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseBinding_licenseId_mt5Account_key" ON "LicenseBinding"("licenseId", "mt5Account");

-- CreateIndex
CREATE INDEX "LicenseValidationLog_licenseId_createdAt_idx" ON "LicenseValidationLog"("licenseId", "createdAt");

-- CreateIndex
CREATE INDEX "LicenseValidationLog_createdAt_idx" ON "LicenseValidationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseBinding" ADD CONSTRAINT "LicenseBinding_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseValidationLog" ADD CONSTRAINT "LicenseValidationLog_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;
