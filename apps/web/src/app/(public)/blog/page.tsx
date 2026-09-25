import Link from 'next/link';
import { createAnonClient, getPublishedBlogPosts } from '@kistas/supabase';

export const revalidate = 300; // 5 minutes ISR for blog

export default async function BlogPage() {
  const supabase = createAnonClient();
  const posts = await getPublishedBlogPosts(supabase);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-800/80 pb-6 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Kıstas Blog & Ekosistem
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Bağımsız yazılım geliştirme, ürün lansmanı, girişimcilik ve büyüme rehberleri.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {posts.length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center text-slate-400">
            Henüz yayınlanmış bir makale bulunmuyor.
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 p-6 transition-all hover:border-blue-500/30 hover:bg-slate-900/80"
            >
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{post.author_name}</span>
                  <span>·</span>
                  <span>{post.reading_time_minutes} dk okuma süresi</span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-white transition-colors hover:text-blue-400">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs">
                <span className="text-slate-500">
                  {post.published_at ? new Date(post.published_at).toLocaleDateString('tr-TR') : ''}
                </span>
                <Link href={`/blog/${post.slug}`} className="font-semibold text-blue-400 hover:text-blue-300">
                  Yazıyı Oku →
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
