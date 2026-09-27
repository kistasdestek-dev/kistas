import { cache } from 'react';
import { createAnonClient, getBlogPostBySlug } from '@kistas/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Image from 'next/image';
import { BlogArticleContent } from '@/components/blog/BlogArticleContent';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const revalidate = 300;

const getPost = cache(async (slug: string) => {
  const supabase = createAnonClient();
  return getBlogPostBySlug(supabase, slug);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: 'Yazı Bulunamadı — Kıstas' };
  }

  return {
    title: post.meta_title || `${post.title} — Kıstas Blog`,
    description: post.meta_description || post.excerpt,
    alternates: { canonical: post.canonical_url || `https://kistas.com.tr/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      url: post.canonical_url || `https://kistas.com.tr/blog/${post.slug}`,
      publishedTime: post.published_at || undefined,
      authors: [post.author_name],
      images: post.cover_image_url?.startsWith('https://') ? [{ url: post.cover_image_url, alt: post.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: post.cover_image_url?.startsWith('https://') ? [post.cover_image_url] : [],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const canonicalUrl = post.canonical_url || `https://kistas.com.tr/blog/${post.slug}`;
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: post.cover_image_url?.startsWith('https://') ? [post.cover_image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.created_at,
    author: { '@type': 'Organization', name: post.author_name },
    publisher: { '@type': 'Organization', name: 'Kıstas', url: 'https://kistas.com.tr' },
    mainEntityOfPage: canonicalUrl,
  };

  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <script type="application/ld+json">
        {JSON.stringify(articleJsonLd).replace(/</g, '\\u003c')}
      </script>
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

      {post.cover_image_url?.startsWith('https://') && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1424] shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <Image src={post.cover_image_url} alt={`${post.title} kapak görseli`} fill priority unoptimized className="object-cover" />
        </div>
      )}

      <div className="mt-8 max-w-none">
        <BlogArticleContent content={post.content} />
      </div>
    </article>
  );
}
