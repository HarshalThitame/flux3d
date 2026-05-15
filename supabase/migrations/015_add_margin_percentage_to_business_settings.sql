ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS margin_percentage numeric(5,2) DEFAULT 30;

UPDATE business_settings
SET margin_percentage = 30
WHERE margin_percentage IS NULL;

ALTER TABLE business_settings
ALTER COLUMN margin_percentage SET DEFAULT 30;

ALTER TABLE business_settings
ALTER COLUMN margin_percentage SET NOT NULL;
