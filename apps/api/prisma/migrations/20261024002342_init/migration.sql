-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANALYST');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('POS', 'BANK');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('UPLOADED', 'MAPPED', 'IMPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'MATCHED', 'PROPOSED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('EXACT', 'TOLERANCE', 'GROUPED', 'AI', 'MANUAL');

-- CreateEnum
CREATE TYPE "MatchCardinality" AS ENUM ('ONE_TO_ONE', 'MANY_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_templates" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "column_mapping" JSONB NOT NULL,
    "date_format" TEXT NOT NULL,
    "decimal_separator" VARCHAR(1) NOT NULL,
    "header_row" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL,
    "stats" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_files" (
    "id" UUID NOT NULL,
    "reconciliation_id" UUID NOT NULL,
    "template_id" UUID,
    "source_type" "SourceType" NOT NULL,
    "original_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'UPLOADED',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_transactions" (
    "id" UUID NOT NULL,
    "reconciliation_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "transaction_at" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "card_last4" VARCHAR(4),
    "auth_code" TEXT,
    "card_brand" TEXT,
    "batch_number" TEXT,
    "terminal_id" TEXT,
    "store_code" TEXT,
    "reference" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "exception_reason" TEXT,
    "exception_note" TEXT,
    "raw_data" JSONB NOT NULL,

    CONSTRAINT "pos_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_movements" (
    "id" UUID NOT NULL,
    "reconciliation_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "posted_at" DATE NOT NULL,
    "value_date" DATE,
    "amount" DECIMAL(14,2) NOT NULL,
    "gross_amount" DECIMAL(14,2),
    "fee_amount" DECIMAL(14,2),
    "withholding_amount" DECIMAL(14,2),
    "description" TEXT,
    "reference" TEXT,
    "batch_number" TEXT,
    "auth_code" TEXT,
    "card_last4" VARCHAR(4),
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "exception_reason" TEXT,
    "exception_note" TEXT,
    "raw_data" JSONB NOT NULL,

    CONSTRAINT "bank_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "reconciliation_id" UUID NOT NULL,
    "method" "MatchMethod" NOT NULL,
    "cardinality" "MatchCardinality" NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "confidence" DECIMAL(4,3) NOT NULL,
    "pos_total" DECIMAL(14,2) NOT NULL,
    "bank_total" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "explanation" TEXT,
    "created_by_id" UUID,
    "confirmed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_items" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "pos_transaction_id" UUID,
    "bank_movement_id" UUID,

    CONSTRAINT "match_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_tax_id_key" ON "companies"("tax_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_templates_company_id_name_key" ON "import_templates"("company_id", "name");

-- CreateIndex
CREATE INDEX "reconciliations_company_id_status_idx" ON "reconciliations"("company_id", "status");

-- CreateIndex
CREATE INDEX "reconciliations_company_id_period_start_period_end_idx" ON "reconciliations"("company_id", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "imported_files_reconciliation_id_sha256_key" ON "imported_files"("reconciliation_id", "sha256");

-- CreateIndex
CREATE INDEX "pos_transactions_reconciliation_id_status_idx" ON "pos_transactions"("reconciliation_id", "status");

-- CreateIndex
CREATE INDEX "pos_transactions_reconciliation_id_auth_code_idx" ON "pos_transactions"("reconciliation_id", "auth_code");

-- CreateIndex
CREATE INDEX "pos_transactions_reconciliation_id_amount_transaction_at_idx" ON "pos_transactions"("reconciliation_id", "amount", "transaction_at");

-- CreateIndex
CREATE INDEX "pos_transactions_file_id_idx" ON "pos_transactions"("file_id");

-- CreateIndex
CREATE INDEX "bank_movements_reconciliation_id_status_idx" ON "bank_movements"("reconciliation_id", "status");

-- CreateIndex
CREATE INDEX "bank_movements_reconciliation_id_auth_code_idx" ON "bank_movements"("reconciliation_id", "auth_code");

-- CreateIndex
CREATE INDEX "bank_movements_reconciliation_id_amount_posted_at_idx" ON "bank_movements"("reconciliation_id", "amount", "posted_at");

-- CreateIndex
CREATE INDEX "bank_movements_file_id_idx" ON "bank_movements"("file_id");

-- CreateIndex
CREATE INDEX "matches_reconciliation_id_status_idx" ON "matches"("reconciliation_id", "status");

-- CreateIndex
CREATE INDEX "matches_reconciliation_id_method_idx" ON "matches"("reconciliation_id", "method");

-- CreateIndex
CREATE INDEX "match_items_match_id_idx" ON "match_items"("match_id");

-- CreateIndex
CREATE INDEX "match_items_pos_transaction_id_idx" ON "match_items"("pos_transaction_id");

-- CreateIndex
CREATE INDEX "match_items_bank_movement_id_idx" ON "match_items"("bank_movement_id");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_files" ADD CONSTRAINT "imported_files_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_files" ADD CONSTRAINT "imported_files_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "import_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "imported_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_movements" ADD CONSTRAINT "bank_movements_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_movements" ADD CONSTRAINT "bank_movements_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "imported_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_items" ADD CONSTRAINT "match_items_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_items" ADD CONSTRAINT "match_items_pos_transaction_id_fkey" FOREIGN KEY ("pos_transaction_id") REFERENCES "pos_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_items" ADD CONSTRAINT "match_items_bank_movement_id_fkey" FOREIGN KEY ("bank_movement_id") REFERENCES "bank_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Restricciones añadidas a mano (no modelables en Prisma) ──────────────────
-- Cada detalle de cruce referencia exactamente una transacción POS O un movimiento bancario.
ALTER TABLE "match_items"
  ADD CONSTRAINT "match_items_exactly_one_side_check"
  CHECK (
    ("pos_transaction_id" IS NOT NULL AND "bank_movement_id" IS NULL) OR
    ("pos_transaction_id" IS NULL AND "bank_movement_id" IS NOT NULL)
  );

-- La confianza de un cruce es un valor entre 0 y 1.
ALTER TABLE "matches"
  ADD CONSTRAINT "matches_confidence_range_check"
  CHECK ("confidence" >= 0 AND "confidence" <= 1);

-- El período de una conciliación no puede terminar antes de empezar.
ALTER TABLE "reconciliations"
  ADD CONSTRAINT "reconciliations_period_check"
  CHECK ("period_end" >= "period_start");
