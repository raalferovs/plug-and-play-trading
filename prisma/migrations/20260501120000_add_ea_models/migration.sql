-- CreateTable
CREATE TABLE "Ea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '📊',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EaVersion" (
    "id" TEXT NOT NULL,
    "eaId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "releaseNotes" TEXT NOT NULL DEFAULT '',
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ea_slug_key" ON "Ea"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EaVersion_eaId_version_key" ON "EaVersion"("eaId", "version");

-- CreateIndex
CREATE INDEX "EaVersion_eaId_releasedAt_idx" ON "EaVersion"("eaId", "releasedAt");

-- AddForeignKey
ALTER TABLE "EaVersion" ADD CONSTRAINT "EaVersion_eaId_fkey" FOREIGN KEY ("eaId") REFERENCES "Ea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed TriEdge EA row (idempotent: ON CONFLICT skips on re-run)
INSERT INTO "Ea" ("id", "slug", "name", "description", "icon", "isPublished", "createdAt", "updatedAt")
VALUES (
  'triedge-default-ea',
  'triedge',
  'TriEdge EA',
  'Unser Flagship Expert Advisor für MT5. Lade die aktuelle Version herunter und starte das automatisierte Trading auf deinem Account.',
  '📊',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO NOTHING;
