ALTER TABLE orders
ADD COLUMN IF NOT EXISTS price_per_unit numeric(10,2) NOT NULL DEFAULT 0;

UPDATE orders
SET price_per_unit = ROUND((price / NULLIF(quantity, 0))::numeric, 2)
WHERE quantity > 0 AND price > 0;
