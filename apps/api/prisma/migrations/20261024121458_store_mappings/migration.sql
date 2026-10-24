-- CreateTable
CREATE TABLE "store_mappings" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "pos_store_name" TEXT NOT NULL,
    "bank_store_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_mappings_company_id_idx" ON "store_mappings"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_mappings_company_id_pos_store_name_key" ON "store_mappings"("company_id", "pos_store_name");

-- AddForeignKey
ALTER TABLE "store_mappings" ADD CONSTRAINT "store_mappings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
