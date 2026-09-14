import React, { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlogPost, BLOG_CATEGORIES } from '../domain/BlogPost';
import { BlogService } from '../application/BlogService';
import { BlogSeoHelper } from '../infrastructure/BlogSeoHelper.web';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { toSafeHttpsUrl } from '../../../core/security/ExternalUrl';
import { blogPostUrl } from '../../../core/config/siteUrls';

export interface BlogScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onCreateProject?: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  initialPostSlug?: string | null;
  onPostChange?: (slug: string | null) => void;
}

const STYLE_ID = 'kistas-blog-styles';
const safeBlogPostUrl = (slug: string) =>
  toSafeHttpsUrl(blogPostUrl(slug), { allowedHosts: ['www.xn--kstas-n4a.com'] }) || '#';
const STYLES = `
.kblog-page{height:100%;overflow-x:hidden;overflow-y:auto;color:#252333;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#F1F5FA}
.kblog-page *{box-sizing:border-box}
.kblog-page a{color:inherit;text-decoration:none}
.kblog-page a:hover{text-decoration:underline}
.kblog-wrap{width:min(1180px,calc(100% - 40px));margin:0 auto}

/* HEADER & HERO */
.kblog-hero{padding:42px 0 28px;text-align:center}
.kblog-back{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 14px;border:1px solid rgba(50,105,199,.2);border-radius:20px;background:rgba(255,255,255,.9);color:#526680;font:700 12px/1 inherit;cursor:pointer;transition:all .2s ease;margin-bottom:24px}
.kblog-back:hover{color:#252333;border-color:#3269C7;background:#FFFFFF;transform:translateX(-2px)}
.kblog-kicker{margin:0 0 10px;color:#3269C7;font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase}
.kblog-title{margin:0;font-size:clamp(38px,6vw,76px);line-height:1.02;font-weight:900;letter-spacing:-0.025em;color:#252333;text-shadow:0 10px 36px rgba(50,105,199,.12)}
.kblog-lead{max-width:700px;margin:10px auto 0;color:#55657A;font-size:clamp(15px,1.6vw,18px);line-height:1.6}

/* CONTROLS (SEARCH & CATEGORIES) */
.kblog-controls{margin:36px 0 40px;display:flex;flex-direction:column;align-items:center;gap:20px}
.kblog-search-shell{width:min(540px,100%);position:relative}
.kblog-search-icon{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:#71849F}
.kblog-search-input{width:100%;height:48px;padding:0 18px 0 48px;border-radius:24px;border:1px solid #CBD9EC;background:#FFFFFF;color:#252333;font:500 14px/1 inherit;box-shadow:0 6px 18px -4px rgba(50,105,199,.06);outline:none;transition:border-color .2s ease,box-shadow .2s ease}
.kblog-search-input:focus{border-color:#3269C7;box-shadow:0 8px 24px -4px rgba(50,105,199,.15)}
.kblog-search-input::placeholder{color:#8A9BB2}

.kblog-categories{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.kblog-cat-btn{padding:8px 18px;border-radius:20px;border:1px solid #D8E3F2;background:rgba(255,255,255,.8);color:#55667E;font:700 12.5px/1 inherit;cursor:pointer;transition:all .2s ease}
.kblog-cat-btn:hover{color:#252333;border-color:#3269C7;background:#FFFFFF}
.kblog-cat-btn.active{background:#252333;color:#FFFFFF;border-color:#252333;box-shadow:0 4px 14px -2px rgba(37,35,51,.25)}

/* FEATURED HERO CARD */
.kblog-featured{margin-bottom:48px;cursor:pointer;display:grid;grid-template-columns:1.15fr 1fr;gap:36px;align-items:center;background:#FFFFFF;border:1px solid #DCE5F1;border-radius:20px;padding:32px;box-shadow:0 14px 40px -16px rgba(31,62,105,.12);transition:all .25s ease}
.kblog-featured:hover{border-color:#A6BFDF;box-shadow:0 20px 48px -16px rgba(31,62,105,.2);transform:translateY(-2px)}
.kblog-featured-img-wrap{border-radius:14px;overflow:hidden;aspect-ratio:16/10;background:#EAF1FA;position:relative}
.kblog-featured-img{width:100%;height:100%;object-fit:cover;transition:transform .4s ease}
.kblog-featured:hover .kblog-featured-img{transform:scale(1.03)}
.kblog-featured-content{display:flex;flex-direction:column;align-items:flex-start}
.kblog-badge-row{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.kblog-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:12px;font:700 11px/1 inherit;letter-spacing:.03em;text-transform:uppercase}
.kblog-pill-cat{background:#EDF4FD;color:#3269C7}
.kblog-meta-time{color:#71849F;font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px}
.kblog-featured-title{margin:0 0 14px;font-size:clamp(22px,2.4vw,34px);font-weight:900;line-height:1.2;color:#252333;letter-spacing:-.015em}
.kblog-featured-desc{margin:0 0 22px;color:#55657A;font-size:15px;line-height:1.65}
.kblog-author-row{display:flex;align-items:center;gap:12px}
.kblog-author-avatar{width:38px;height:38px;border-radius:50%;background:#EDF4FD;color:#3269C7;display:grid;place-items:center;font-weight:800;font-size:13px;border:1px solid #CBD9EC}
.kblog-author-name{font-size:13px;font-weight:700;color:#252333}
.kblog-author-title{font-size:11px;color:#71849F;margin-top:2px}

/* POSTS GRID */
.kblog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-bottom:80px}
.kblog-card{background:#FFFFFF;border:1px solid #DCE5F1;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;box-shadow:0 8px 24px -14px rgba(31,62,105,.1);transition:all .25s ease}
.kblog-card:hover{border-color:#A6BFDF;box-shadow:0 16px 36px -14px rgba(31,62,105,.18);transform:translateY(-3px)}
.kblog-card-img-wrap{aspect-ratio:16/10;overflow:hidden;background:#EAF1FA}
.kblog-card-img{width:100%;height:100%;object-fit:cover;transition:transform .4s ease}
.kblog-card:hover .kblog-card-img{transform:scale(1.04)}
.kblog-card-body{padding:22px;display:flex;flex-direction:column;flex:1}
.kblog-card-title{margin:10px 0 10px;font-size:18px;font-weight:800;line-height:1.35;color:#252333;letter-spacing:-.01em}
.kblog-card-desc{margin:0 0 18px;color:#5E6E85;font-size:13.5px;line-height:1.6;flex:1}
.kblog-card-footer{padding-top:14px;border-top:1px solid #EFF3F9;display:flex;align-items:center;justify-content:space-between;color:#71849F;font-size:11.5px;font-weight:600}

/* EMPTY STATE */
.kblog-empty{text-align:center;padding:70px 20px;color:#71849F}
.kblog-empty-icon{font-size:42px;color:#94A3B8;margin-bottom:12px}
.kblog-empty h3{margin:0 0 6px;color:#252333;font-size:20px;font-weight:800}

/* ARTICLE DETAIL VIEW */
.kblog-article-wrap{width:min(860px,calc(100% - 40px));margin:0 auto;padding:40px 0 90px}
.kblog-article-header{text-align:left;margin-bottom:34px}
.kblog-article-title{margin:16px 0 16px;font-size:clamp(32px,5vw,54px);font-weight:900;line-height:1.15;color:#252333;letter-spacing:-.02em}
.kblog-article-lead{font-size:clamp(17px,2vw,21px);color:#475569;line-height:1.6;margin:0 0 24px}
.kblog-article-cover{width:100%;border-radius:18px;overflow:hidden;aspect-ratio:16/9;background:#EAF1FA;margin-bottom:44px;box-shadow:0 14px 40px -16px rgba(31,62,105,.18)}
.kblog-article-cover img{width:100%;height:100%;object-fit:cover}

/* ARTICLE BODY STYLING */
.kblog-content{color:#2F3D4E;font-size:17.5px;line-height:1.8;letter-spacing:-.003em}
.kblog-content h2{margin:48px 0 18px;font-size:28px;font-weight:900;color:#1E293B;letter-spacing:-.015em;line-height:1.25;padding-bottom:10px;border-bottom:1px solid #E2E8F0}
.kblog-content h3{margin:36px 0 14px;font-size:22px;font-weight:800;color:#1E293B;letter-spacing:-.01em;line-height:1.3}
.kblog-content p{margin:0 0 22px}
.kblog-content hr{margin:38px 0;border:none;border-top:1px solid #E2E8F0}
.kblog-content ul{margin:0 0 26px;padding-left:24px}
.kblog-content li{margin-bottom:10px;line-height:1.7}
.kblog-content strong{color:#0F172A;font-weight:700}
.kblog-content blockquote{margin:28px 0;padding:18px 24px;border-left:4px solid #3269C7;background:#F6FAFF;border-radius:0 12px 12px 0;font-style:italic;color:#334155}

/* SHARE & AUTHOR FOOTER */
.kblog-share-band{margin:54px 0 42px;padding:24px;background:#F8FAFD;border:1px solid #DCE5F1;border-radius:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.kblog-share-label{font-size:13.5px;font-weight:800;color:#252333;display:flex;align-items:center;gap:8px}
.kblog-share-actions{display:flex;gap:10px}
.kblog-share-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:20px;border:1px solid #CBD9EC;background:#FFFFFF;color:#334155;font:700 12.5px/1 inherit;cursor:pointer;transition:all .2s ease;text-decoration:none}
.kblog-share-btn:hover{border-color:#3269C7;color:#3269C7;transform:translateY(-1px);box-shadow:0 6px 16px -4px rgba(50,105,199,.15)}

.kblog-author-card{margin-bottom:60px;padding:28px;background:#FFFFFF;border:1px solid #DCE5F1;border-radius:18px;display:flex;gap:20px;align-items:center;box-shadow:0 8px 24px -14px rgba(31,62,105,.08)}
.kblog-author-big-avatar{width:56px;height:56px;border-radius:50%;background:#EDF4FD;color:#3269C7;display:grid;place-items:center;font-size:18px;font-weight:800;flex-shrink:0;border:1px solid #CBD9EC}
.kblog-author-info h4{margin:0 0 4px;font-size:16px;font-weight:800;color:#252333}
.kblog-author-info p{margin:0;font-size:13.5px;color:#64748B;line-height:1.5}

/* CTA BANNER */
.kblog-cta-box{margin:40px 0 80px;background:linear-gradient(135deg,#252333 0%,#1B3864 100%);border-radius:24px;padding:48px 32px;color:#FFFFFF;text-align:center;box-shadow:0 20px 50px -15px rgba(27,56,100,.35)}
.kblog-cta-box h3{margin:0 0 10px;font-size:clamp(24px,3.5vw,36px);font-weight:900}
.kblog-cta-box p{max-width:520px;margin:0 auto 28px;color:rgba(255,255,255,.82);font-size:15px;line-height:1.6}
.kblog-cta-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:24px;background:#FFFFFF;color:#252333;font:700 13.5px/1 inherit;cursor:pointer;border:none;transition:transform .2s ease,box-shadow .2s ease}
.kblog-cta-btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.22)}

/* TOAST */
.kblog-toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#252333;color:#FFFFFF;padding:12px 24px;border-radius:24px;font:700 13px/1 inherit;box-shadow:0 12px 32px rgba(0,0,0,.25);z-index:9999;display:flex;align-items:center;gap:8px;animation:kblog-pop .25s ease}
@keyframes kblog-pop{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}

@media(max-width:960px){
  .kblog-featured{grid-template-columns:1fr;gap:24px}
  .kblog-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:767px){
  .kblog-wrap{width:min(100% - 32px,1180px)}
  .kblog-article-wrap{width:min(100% - 32px,860px)}
  .kblog-grid{grid-template-columns:1fr;gap:20px}
  .kblog-featured{padding:20px}
  .kblog-share-band{flex-direction:column;align-items:flex-start}
  .kblog-share-actions{width:100%;flex-direction:column}
  .kblog-share-btn{width:100%;justify-content:center}
  .kblog-author-card{flex-direction:column;text-align:center}
}
`;

export const BlogScreen: React.FC<BlogScreenProps> = ({
  onBack,
  onExplore,
  onCreateProject,
  onOpenAbout,
  onOpenPrivacy,
  onOpenSupport,
  onOpenHowItWorks,
  initialPostSlug,
  onPostChange,
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // CSS Enjeksiyonu
  useEffect(() => {
    const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    if (!style.parentNode) document.head.appendChild(style);
  }, []);

  // Yazıları yükle
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    BlogService.getPublishedPosts(selectedCategory)
      .then((data) => {
        if (isMounted) {
          setPosts(data);
          // Eğer initialPostSlug verildiyse o yazıyı aç
          setSelectedPost(initialPostSlug ? data.find((p) => p.slug === initialPostSlug) || null : null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, initialPostSlug]);

  // SEO Yönetimi: Sayfa veya Yazı değiştiğinde Google Schema & Meta güncelle
  useEffect(() => {
    if (selectedPost) {
      BlogSeoHelper.applyBlogPostSeo(selectedPost);
    } else {
      BlogSeoHelper.applyBlogListSeo();
    }

    return () => {
      BlogSeoHelper.restoreOriginalSeo();
    };
  }, [selectedPost]);

  // Arama ve filtreleme
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, searchQuery]);

  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const standardPosts = filteredPosts.length > 1 ? filteredPosts.slice(1) : [];

  const handleSelectPost = (post: BlogPost) => {
    setSelectedPost(post);
    onPostChange?.(post.slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedPost(null);
    onPostChange?.(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && selectedPost) {
      const url = blogPostUrl(selectedPost.slug);
      navigator.clipboard.writeText(url);
      showToast('Yazı bağlantısı panoya kopyalandı');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return 'Yakın zamanda';
    }
  };

  // Basit Markdown biçimlendirici
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<div key={`empty-${index}`} style={{ height: 12 }} />);
      } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={`h2-${index}`}>{trimmed.replace('## ', '')}</h2>);
      } else if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={`h3-${index}`}>{trimmed.replace('### ', '')}</h3>);
      } else if (trimmed.startsWith('---')) {
        elements.push(<hr key={`hr-${index}`} />);
      } else if (trimmed.startsWith('- ')) {
        elements.push(
          <ul key={`ul-${index}`}>
            <li>{trimmed.replace('- ', '')}</li>
          </ul>
        );
      } else if (trimmed.startsWith('> ')) {
        elements.push(<blockquote key={`quote-${index}`}>{trimmed.replace('> ', '')}</blockquote>);
      } else {
        elements.push(<p key={`p-${index}`}>{trimmed}</p>);
      }
    });

    return elements;
  };

  return (
    <main className="kblog-page" aria-label="Kıstas Blog ve Perspektif">
      {selectedPost ? (
        /* YAZI DETAY VE OKUMA GÖRÜNÜMÜ */
        <article className="kblog-article-wrap">
          <button className="kblog-back" type="button" onClick={handleBackToList} aria-label="Tüm yazılara dön">
            <Ionicons name="arrow-back" size={16} /> Tüm Yazılara Dön
          </button>

          <header className="kblog-article-header">
            <div className="kblog-badge-row">
              <span className="kblog-pill kblog-pill-cat">{selectedPost.category}</span>
              <span className="kblog-meta-time">
                <Ionicons name="time-outline" size={13} /> {selectedPost.reading_time_minutes} dk okuma
              </span>
              <span className="kblog-meta-time">·</span>
              <time className="kblog-meta-time" dateTime={selectedPost.published_at}>
                {formatDate(selectedPost.published_at)}
              </time>
            </div>

            <h1 className="kblog-article-title">{selectedPost.title}</h1>
            <p className="kblog-article-lead">{selectedPost.excerpt}</p>

            <div className="kblog-author-row">
              <div className="kblog-author-avatar">
                {selectedPost.author_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="kblog-author-name">{selectedPost.author_name}</div>
                <div className="kblog-author-title">{selectedPost.author_title}</div>
              </div>
            </div>
          </header>

          <div className="kblog-article-cover">
            <img src={selectedPost.cover_image_url} alt={selectedPost.title} loading="lazy" />
          </div>

          <div className="kblog-content">
            {renderFormattedContent(selectedPost.content)}
          </div>

          {/* Paylaşım Alanı */}
          <section className="kblog-share-band" aria-label="Yazıyı Paylaş">
            <div className="kblog-share-label">
              <Ionicons name="share-social-outline" size={18} color="#3269C7" />
              <span>Bu yazıyı bağımsız geliştiricilerle paylaş:</span>
            </div>
            {(() => {
              const twitterRaw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(selectedPost.title)}&url=${encodeURIComponent(blogPostUrl(selectedPost.slug))}`;
              const linkedinRaw = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(blogPostUrl(selectedPost.slug))}`;
              const safeTwitterUrl = toSafeHttpsUrl(twitterRaw) || '#';
              const safeLinkedInUrl = toSafeHttpsUrl(linkedinRaw) || '#';
              return (
                <div className="kblog-share-actions">
                  <a
                    className="kblog-share-btn"
                    href={safeTwitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Ionicons name="logo-twitter" size={15} color="#1DA1F2" /> X (Twitter)
                  </a>
                  <a
                    className="kblog-share-btn"
                    href={safeLinkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Ionicons name="logo-linkedin" size={15} color="#0A66C2" /> LinkedIn
                  </a>
                  <button className="kblog-share-btn" type="button" onClick={handleCopyLink}>
                    <Ionicons name="link-outline" size={16} /> Bağlantıyı Kopyala
                  </button>
                </div>
              );
            })()}
          </section>

          {/* Yazar Kartı */}
          <div className="kblog-author-card">
            <div className="kblog-author-big-avatar">
              {selectedPost.author_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="kblog-author-info">
              <h4>{selectedPost.author_name}</h4>
              <p>{selectedPost.author_title} · Bağımsız dijital ürün ekosistemini ve teknoloji trendlerini inceliyor.</p>
            </div>
          </div>

          {/* Dönüşüm CTA */}
          <div className="kblog-cta-box">
            <h3>Kendi projeni Kıstas vitrinine taşımak ister misin?</h3>
            <p>Haftalarca onay kuyruklarında bekleme. Dikey görsellerin ve vizyonunla 2 dakikada lansmanını başlat.</p>
            <button
              className="kblog-cta-btn"
              type="button"
              onClick={onCreateProject || onExplore}
            >
              <Ionicons name="rocket" size={16} color="#3269C7" /> Hemen Projeni Tanıt
            </button>
          </div>
        </article>
      ) : (
        /* BLOG LİSTE GÖRÜNÜMÜ */
        <div className="kblog-wrap">
          <header className="kblog-hero">
            <button className="kblog-back" type="button" onClick={onBack} aria-label="Geri dön">
              <Ionicons name="arrow-back" size={16} /> Vitrine Dön
            </button>

            <p className="kblog-kicker">KISTAS PERSPEKTİF & EDİTORYAL</p>
            <h1 className="kblog-title">Kıstas Blog</h1>
            <p className="kblog-lead">
              Bağımsız geliştiricilik, dijital ürün mimarisi, yapay zekâ trendleri ve sıfır bütçeyle organik büyüme rehberleri.
            </p>

            <div className="kblog-controls">
              <div className="kblog-search-shell">
                <Ionicons name="search-outline" size={18} className="kblog-search-icon" />
                <input
                  type="search"
                  className="kblog-search-input"
                  placeholder="Yazı, kategori veya etiket ara…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Blog yazılarında ara"
                />
              </div>

              <div className="kblog-categories" role="tablist">
                {BLOG_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`kblog-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* Öne Çıkan Yazı */}
          {featuredPost && !searchQuery ? (
            <article className="kblog-featured">
              <div className="kblog-featured-img-wrap">
                <img
                  src={featuredPost.cover_image_url}
                  alt={featuredPost.title}
                  className="kblog-featured-img"
                  loading="lazy"
                />
              </div>
              <div className="kblog-featured-content">
                <div className="kblog-badge-row">
                  <span className="kblog-pill kblog-pill-cat">{featuredPost.category}</span>
                  <span className="kblog-meta-time">
                    <Ionicons name="time-outline" size={13} /> {featuredPost.reading_time_minutes} dk okuma
                  </span>
                </div>
                <h2 className="kblog-featured-title"><a href={safeBlogPostUrl(featuredPost.slug)} onClick={(event) => { event.preventDefault(); handleSelectPost(featuredPost); }}>{featuredPost.title}</a></h2>
                <p className="kblog-featured-desc">{featuredPost.excerpt}</p>
                <div className="kblog-author-row">
                  <div className="kblog-author-avatar">
                    {featuredPost.author_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="kblog-author-name">{featuredPost.author_name}</div>
                    <div className="kblog-author-title">{formatDate(featuredPost.published_at)}</div>
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          {/* Standart Yazı Kartları Izgarası */}
          {standardPosts.length > 0 ? (
            <div className="kblog-grid">
              {standardPosts.map((post) => (
                <article
                  className="kblog-card"
                  key={post.id}
                >
                  <div className="kblog-card-img-wrap">
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="kblog-card-img"
                      loading="lazy"
                    />
                  </div>
                  <div className="kblog-card-body">
                    <div className="kblog-badge-row">
                      <span className="kblog-pill kblog-pill-cat">{post.category}</span>
                      <span className="kblog-meta-time">
                        <Ionicons name="time-outline" size={12} /> {post.reading_time_minutes} dk
                      </span>
                    </div>
                    <h3 className="kblog-card-title"><a href={safeBlogPostUrl(post.slug)} onClick={(event) => { event.preventDefault(); handleSelectPost(post); }}>{post.title}</a></h3>
                    <p className="kblog-card-desc">{post.excerpt}</p>
                    <div className="kblog-card-footer">
                      <span>{post.author_name}</span>
                      <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : !featuredPost && !isLoading ? (
            <div className="kblog-empty">
              <Ionicons name="document-text-outline" size={44} className="kblog-empty-icon" />
              <h3>Aramanıza uygun yazı bulunamadı</h3>
              <p>Farklı bir anahtar kelime deneyebilir veya tüm kategorileri listeleyebilirsiniz.</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage ? (
        <div className="kblog-toast" role="status" aria-live="polite">
          <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
          <span>{toastMessage}</span>
        </div>
      ) : null}

      <CinematicFooter
        compact
        onOpenAbout={onOpenAbout}
        onOpenPrivacy={onOpenPrivacy}
        onOpenSupport={onOpenSupport}
        onOpenHowItWorks={onOpenHowItWorks}
      />
    </main>
  );
};
