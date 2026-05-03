export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  featured_image?: string
  author_name: string
  author_avatar?: string
  category?: string
  tags?: string[]
  meta_keywords?: string[]
  status: 'draft' | 'published' | 'archived'
  read_time?: number
  views?: number
  created_at: string
  updated_at?: string
  published_at?: string
}
