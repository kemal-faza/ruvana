-- CreateTable IdempotencyKey durable storage for Idempotency-Key header (retensi 24 jam)
-- Sesuai OpenAPI: identity = authenticated principal + method/operation + canonical path + canonical body
-- Hanya hasil deterministik (200/201/204 dan 4xx tertentu) yang disimpan; 401/403/5xx tidak disimpan.

CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "principalId" INTEGER NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_keys_key_principalId_scope_key" ON "idempotency_keys"("key", "principalId", "scope");
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");
