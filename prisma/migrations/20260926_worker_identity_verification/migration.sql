ALTER TABLE "Verification"
ADD COLUMN "documentObjectKey" TEXT,
ADD COLUMN "documentContentType" TEXT,
ADD COLUMN "documentSizeBytes" INTEGER,
ADD COLUMN "submittedAt" TIMESTAMP(3);