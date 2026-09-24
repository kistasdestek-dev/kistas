import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iojgqicgeztqwkbetboa.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  let title = 'Kıstas — Proje ve Girişim Vitrini';
  let tagline = 'Türkiye\'nin bağımsız yazılımcı ve dijital girişimcileri için topluluk ve dağıtım motoru.';
  let upvoteCount = 0;
  let categoryName = 'Girişim';

  if (id && id !== 'default') {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          title,
          tagline,
          upvotes_count,
          category:categories(name)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        title = data.title || title;
        tagline = data.tagline || tagline;
        upvoteCount = data.upvotes_count ?? 0;
        if (data.category && typeof data.category === 'object' && 'name' in data.category) {
          categoryName = (data.category as { name: string }).name || categoryName;
        }
      }
    } catch {
      // Fallback to default
    }
  }

  // Safe truncation
  const displayTitle = title.length > 50 ? `${title.slice(0, 48)}...` : title;
  const displayTagline = tagline.length > 120 ? `${tagline.slice(0, 118)}...` : tagline;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#080C14',
          backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.25) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.2) 0%, transparent 50%)',
          padding: '60px 80px',
          justifyContent: 'space-between',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top Header: Kıstas Brand & Category */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            zIndex: 10,
          }}
        >
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(59, 130, 246, 0.5)',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C12 2 14.5 5.5 14.5 7.5C14.5 9 13.5 10 12 10C10.5 10 9.5 9 9.5 7.5C9.5 6.5 10 5 10 5C8.5 6.5 7 8.5 7 11.5C7 15.5 10 18.5 14 18.5C18 18.5 21 15.5 21 11.5C21 7 17 4 17 4C17 4 18 6.5 18 8C18 10 16.5 11.5 14.5 11.5C13 11.5 12 10.5 12 9C12 7.5 13 6 13 6C11 7.5 9.5 9.5 9.5 12C9.5 14.5 11.5 16.5 14 16.5C16.5 16.5 18.5 14.5 18.5 12"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                KISTAS
              </span>
              <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.5px' }}>
                PROJE & DAĞITIM VİTRİNİ
              </span>
            </div>
          </div>

          {/* Launch Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '999px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60A5FA',
              fontSize: '15px',
              fontWeight: 700,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)',
            }}
          >
            <span>🚀</span>
            <span>LANSMANDA</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>•</span>
            <span style={{ color: '#E2E8F0' }}>{categoryName}</span>
          </div>
        </div>

        {/* Center Main Content: Title & Tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            zIndex: 10,
            maxWidth: '1000px',
          }}
        >
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-1.5px',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {displayTitle}
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 500,
              lineHeight: 1.4,
              color: '#94A3B8',
            }}
          >
            {displayTagline}
          </div>
        </div>

        {/* Bottom Footer: Stats & Call to Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '30px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10,
          }}
        >
          {/* Upvotes Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '12px 24px',
              borderRadius: '16px',
            }}
          >
            <span style={{ color: '#3B82F6', fontSize: '22px', fontWeight: 900 }}>▲</span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF' }}>{upvoteCount}</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Topluluk Desteği
            </span>
          </div>

          {/* URL & Invitation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#64748B' }}>
              Keşfet ve Oy Ver:
            </span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#38BDF8',
                letterSpacing: '-0.3px',
              }}
            >
              kistas.com.tr
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=86400',
      },
    }
  );
}
