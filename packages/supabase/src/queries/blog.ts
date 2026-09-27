import { SupabaseClient } from '@supabase/supabase-js';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url?: string | null;
  category: string;
  tags?: string[] | null;
  author_name: string;
  author_title?: string | null;
  reading_time_minutes: number;
  view_count: number;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
}

export async function getPublishedBlogPosts(client: SupabaseClient): Promise<BlogPost[]> {
  const { data, error } = await client
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image_url, category, tags, author_name, author_title, reading_time_minutes, view_count, published_at, meta_title, meta_description, canonical_url, created_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) {
    return [];
  }
  return (data as BlogPost[]) || [];
}

export async function getBlogPostBySlug(client: SupabaseClient, slug: string): Promise<BlogPost | null> {
  const { data, error } = await client
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    return null;
  }
  return data as BlogPost;
}
