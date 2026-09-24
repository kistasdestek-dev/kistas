import { createClient } from '@/lib/supabase/server';
import { getBlogPostBySlug } from '@kistas/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const post = await getBlogPostBySlug(supabase, slug);

  if (!post) {
    return { title: 'Yazı Bulunamadı — Kıstas' };
  }

  return {
    title: `${post.title} — Kıstas Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const post = await getBlogPostBySlug(supabase, slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/blog" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          ← Blog’a Geri Dön
        </Link>
      </div>

      <header className="border-b border-slate-800/80 pb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl leading-tight">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span>Yazar: <strong className="text-white">{post.author_name}</strong></span>
          <span>·</span>
          <span>{post.reading_time_minutes} dakika okuma</span>
          <span>·</span>
          <span>{post.published_at ? new Date(post.published_at).toLocaleDateString('tr-TR') : ''}</span>
        </div>
      </header>

      <div className="mt-8 prose prose-invert max-w-none text-slate-300 text-base leading-relaxed whitespace-pre-line">
        {post.content}
      </div>
    </article>
  );
}
