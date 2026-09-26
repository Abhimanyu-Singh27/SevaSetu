CREATE TABLE "WorkerAvailabilitySession" (
  "id" UUID NOT NULL,
  "workerId" UUID NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "WorkerAvailabilitySession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkerAvailabilitySession_workerId_startedAt_idx" ON "WorkerAvailabilitySession"("workerId", "startedAt");
CREATE INDEX "WorkerAvailabilitySession_workerId_endedAt_idx" ON "WorkerAvailabilitySession"("workerId", "endedAt");

ALTER TABLE "WorkerAvailabilitySession"
ADD CONSTRAINT "WorkerAvailabilitySession_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "WorkerAvailabilitySession" ("id", "workerId", "startedAt")
SELECT gen_random_uuid(), "id", CURRENT_TIMESTAMP
FROM "WorkerProfile"
WHERE "availability" IN ('AVAILABLE', 'BUSY');