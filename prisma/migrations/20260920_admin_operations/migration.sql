-- Admin operations: financial ledger, disputes, consented location history, fraud signals, broadcasts, and completion proof.
CREATE TYPE "LedgerEntryType" AS ENUM ('EARNING', 'PLATFORM_FEE', 'REFUND', 'PAYOUT');
CREATE TYPE "FraudSignalStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED', 'CONFIRMED');

ALTER TABLE "ServiceRequest" ADD COLUMN "completedAt" TIMESTAMP(3), ADD COLUMN "completionApprovedAt" TIMESTAMP(3);

CREATE TABLE "FinancialEntry" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "requestId" UUID,
  "type" "LedgerEntryType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FinancialEntry_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "FinancialEntry_userId_type_createdAt_idx" ON "FinancialEntry"("userId", "type", "createdAt");
CREATE INDEX "FinancialEntry_requestId_type_idx" ON "FinancialEntry"("requestId", "type");

CREATE TABLE "CompletionProof" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "submittedBy" UUID NOT NULL,
  "note" TEXT,
  "objectKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompletionProof_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompletionProof_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CompletionProof_requestId_createdAt_idx" ON "CompletionProof"("requestId", "createdAt");

CREATE TABLE "DisputeCase" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "openedBy" UUID NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
  "resolution" TEXT,
  "resolvedBy" UUID,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DisputeCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DisputeCase_requestId_key" UNIQUE ("requestId"),
  CONSTRAINT "DisputeCase_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DisputeCase_status_createdAt_idx" ON "DisputeCase"("status", "createdAt");

CREATE TABLE "LocationEvent" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "requestId" UUID,
  "latitude" DECIMAL(9,6) NOT NULL,
  "longitude" DECIMAL(9,6) NOT NULL,
  "consented" BOOLEAN NOT NULL DEFAULT false,
  "retentionUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocationEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LocationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LocationEvent_userId_createdAt_idx" ON "LocationEvent"("userId", "createdAt");
CREATE INDEX "LocationEvent_requestId_createdAt_idx" ON "LocationEvent"("requestId", "createdAt");

CREATE TABLE "FraudSignal" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "fingerprint" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "status" "FraudSignalStatus" NOT NULL DEFAULT 'OPEN',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FraudSignal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FraudSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "FraudSignal_status_score_createdAt_idx" ON "FraudSignal"("status", "score", "createdAt");
CREATE INDEX "FraudSignal_fingerprint_idx" ON "FraudSignal"("fingerprint");

CREATE TABLE "Broadcast" (
  "id" UUID NOT NULL,
  "createdBy" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "audienceRole" "UserRole",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Broadcast_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Broadcast_createdAt_idx" ON "Broadcast"("createdAt");
