-- Add new columns to materials table for detailed properties
ALTER TABLE materials ADD COLUMN IF NOT EXISTS key_properties TEXT[];
ALTER TABLE materials ADD COLUMN IF NOT EXISTS best_for TEXT[];
ALTER TABLE materials ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard'));
ALTER TABLE materials ADD COLUMN IF NOT EXISTS heat_resistance TEXT CHECK (heat_resistance IN ('Low', 'Medium', 'High'));
ALTER TABLE materials ADD COLUMN IF NOT EXISTS strength_rating TEXT CHECK (strength_rating IN ('Low', 'Medium', 'High'));
ALTER TABLE materials ADD COLUMN IF NOT EXISTS finish_quality TEXT CHECK (finish_quality IN ('Basic', 'Good', 'Excellent'));
ALTER TABLE materials ADD COLUMN IF NOT EXISTS sample_photo TEXT;

-- Add comments for clarity
COMMENT ON COLUMN materials.key_properties IS 'Array of key properties (e.g., Biodegradable, Easy to print)';
COMMENT ON COLUMN materials.best_for IS 'Array of recommended uses (e.g., Students, Architects)';
COMMENT ON COLUMN materials.difficulty_level IS 'Printing difficulty: Easy, Medium, or Hard';
COMMENT ON COLUMN materials.heat_resistance IS 'Heat resistance: Low, Medium, or High';
COMMENT ON COLUMN materials.strength_rating IS 'Strength rating: Low, Medium, or High';
COMMENT ON COLUMN materials.finish_quality IS 'Surface finish quality: Basic, Good, or Excellent';
COMMENT ON COLUMN materials.sample_photo IS 'URL to sample photo of printed material';
