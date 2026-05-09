ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS difficulty_factor numeric NOT NULL DEFAULT 1.1;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS post_processing_level text NOT NULL DEFAULT 'none';

ALTER TABLE orders
  DROP COLUMN IF EXISTS scale_percent,
  DROP COLUMN IF EXISTS difficulty_factor;
