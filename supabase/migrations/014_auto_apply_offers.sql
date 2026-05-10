-- Migration 014: Add auto-apply support for offers and offer_id on orders

ALTER TABLE offers ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_auto_apply ON offers (auto_apply) WHERE auto_apply = true;
