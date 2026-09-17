CREATE TABLE "RealtimeEvent" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "audienceUserIds" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RealtimeEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RealtimeEvent_createdAt_idx" ON "RealtimeEvent"("createdAt");
CREATE INDEX "RealtimeEvent_actorId_createdAt_idx" ON "RealtimeEvent"("actorId", "createdAt");
ALTER TABLE "RealtimeEvent" ADD CONSTRAINT "RealtimeEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
