ALTER TABLE orders
ADD COLUMN IF NOT EXISTS material_cost numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS machine_cost numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_price numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS grand_total numeric(10,2) NOT NULL DEFAULT 0;

UPDATE orders
SET
  subtotal = CASE
    WHEN subtotal = 0 THEN COALESCE(NULLIF(material_cost, 0), 0) + COALESCE(NULLIF(machine_cost, 0), 0)
    ELSE subtotal
  END,
  final_price = CASE
    WHEN final_price = 0 AND total_price > 0 THEN GREATEST(total_price - COALESCE(discount, 0), 0)
    ELSE final_price
  END,
  grand_total = CASE
    WHEN grand_total = 0 THEN COALESCE(NULLIF(final_price, 0), GREATEST(total_price - COALESCE(discount, 0), 0), total_price, 0) + COALESCE(delivery_charge, 0)
    ELSE grand_total
  END
WHERE subtotal = 0 OR final_price = 0 OR grand_total = 0;

UPDATE orders
SET final_price = GREATEST(total_price - COALESCE(discount, 0), 0)
WHERE final_price = 0 AND total_price > 0;
