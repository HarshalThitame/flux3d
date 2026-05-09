ALTER TABLE orders
ADD COLUMN post_processing_charges numeric(10,2) NOT NULL DEFAULT 0;
