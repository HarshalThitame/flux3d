export type GalleryStatus = "draft" | "published";

export type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  alt_text: string;
  category: string;
  materials: string[];
  status: GalleryStatus;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};
