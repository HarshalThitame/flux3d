import type { BlogSchemaData, BlogSchemaType } from '@/lib/blog/seo'

export interface BlogAuthor {
  id: string
  name: string
  bio?: string | null
  photo_url?: string | null
  linkedin_url?: string | null
  twitter_url?: string | null
  profile_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  featured_image?: string
  featured_image_alt?: string
  author_name: string
  author_avatar?: string
  author_id?: string | null
  author?: BlogAuthor | null
  category?: string
  tags?: string[]
  meta_keywords?: string[]
  seo_title?: string
  meta_description?: string
  focus_keyword?: string
  primary_keyword?: string
  secondary_keywords?: string[]
  canonical_url?: string
  og_title?: string
  og_description?: string
  og_image_url?: string
  twitter_card_type?: 'summary' | 'summary_large_image'
  schema_type?: BlogSchemaType
  schema_data?: BlogSchemaData | null
  reading_time_minutes?: number
  word_count?: number
  last_modified_at?: string
  toc_enabled?: boolean
  language?: 'en' | 'hi' | 'mr'
  seo_score?: number
  ai_generated?: boolean
  ai_model?: string | null
  topic_fingerprint?: string | null
  topic_category?: string | null
  ai_topic_score?: number | null
  research_data?: Record<string, unknown> | null
  featured_image_prompt?: string | null
  quality_score?: number | null
  seo_quality_score?: number | null
  uniqueness_score?: number | null
  readability_score?: number | null
  generation_id?: string | null
  status: 'draft' | 'published' | 'archived'
  read_time?: number
  views?: number
  created_at: string
  updated_at?: string
  published_at?: string
}
