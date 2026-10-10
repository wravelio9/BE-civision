-- CreateIndex
CREATE INDEX "Violation_createdAt_id_idx" ON "Violation"("createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "Violation_status_idx" ON "Violation"("status");
