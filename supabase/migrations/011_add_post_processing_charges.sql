ALTER TABLE orders
ADD COLUMN IF NOT EXISTS post_processing_charges numeric(10,2) NOT NULL DEFAULT 0;
