-- Add meta_keywords column to blog_posts table for SEO optimization
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_keywords TEXT[];
