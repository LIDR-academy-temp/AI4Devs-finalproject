-- AlterTable
ALTER TABLE "match_items" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- Una transacción solo puede estar en un cruce activo (CONFIRMED o PROPOSED)
CREATE UNIQUE INDEX "match_items_active_pos_key" ON "match_items" ("pos_transaction_id")
  WHERE "active" AND "pos_transaction_id" IS NOT NULL;
CREATE UNIQUE INDEX "match_items_active_bank_key" ON "match_items" ("bank_movement_id")
  WHERE "active" AND "bank_movement_id" IS NOT NULL;
