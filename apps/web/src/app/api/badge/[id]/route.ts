import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iojgqicgeztqwkbetboa.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC';

// Shared anon client for public badge queries
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export const runtime = 'edge';

function formatCount(count?: number): string {
  const safe = count ?? 0;
  if (safe >= 1000) return `${(safe / 1000).toFixed(1).replace('.0', '')}B`;
  return String(safe);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const theme = searchParams.get('theme') === 'light' ? 'light' : 'dark';

  let projectTitle = 'Kıstas';
  let upvoteCount = 0;

  if (id && id !== 'featured' && id !== 'default') {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('title, upvotes_count')
        .eq('id', id)
        .single();

      if (!error && data) {
        projectTitle = data.title;
        upvoteCount = data.upvotes_count ?? 0;
      }
    } catch {
      // Fallback to default
    }
  }

  const formattedVotes = formatCount(upvoteCount);
  const isLight = theme === 'light';

  // Kıstas Glass Buton Styling Tokens
  const bgGradient = isLight
    ? `<linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="60%" stop-color="#F8FAFC" />
        <stop offset="100%" stop-color="#EFF6FF" />
      </linearGradient>`
    : `<linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#091326" />
        <stop offset="50%" stop-color="#080E1E" />
        <stop offset="100%" stop-color="#0D1A33" />
      </linearGradient>`;

  const baseStroke = isLight ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.3)';
  const movingGlow = isLight ? '#2563EB' : '#60A5FA';
  const subTextColor = isLight ? '#2563EB' : '#60A5FA';
  const mainTextColor = isLight ? '#0B132B' : '#FFFFFF';
  const pillBg = isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255, 255, 255, 0.08)';
  const pillStroke = isLight ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.16)';
  const pillTextColor = isLight ? '#1E293B' : '#F8FAFC';
  const arrowColor = isLight ? '#2563EB' : '#3B82F6';
  const logoBg = isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)';
  const logoBorder = isLight ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)';
  const shadowColor = isLight ? 'rgba(59, 130, 246, 0.18)' : 'rgba(0, 0, 0, 0.55)';

  // Kıstas Glass Buton SVG: 250x54
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="250" height="54" viewBox="0 0 250 54" role="img" aria-label="Kıstas'ta Öne Çıkan: ${escapeXml(projectTitle)}">
  <defs>
    ${bgGradient}
    <linearGradient id="shimmerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${movingGlow}" stop-opacity="0" />
      <stop offset="50%" stop-color="${movingGlow}" stop-opacity="1" />
      <stop offset="100%" stop-color="#93C5FD" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="flameOuter" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA" />
      <stop offset="60%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="flameInner" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#EF4444" />
    </linearGradient>
    <filter id="glassGlow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="${shadowColor}" />
    </filter>
    <style>
      @keyframes kistasShimmer {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: -560; }
      }
      @keyframes kistasBreathe {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      .glass-border-anim {
        stroke-dasharray: 75 205;
        animation: kistasShimmer 4.5s linear infinite;
      }
      .flame-anim {
        animation: kistasBreathe 3s ease-in-out infinite;
      }
    </style>
  </defs>

  <!-- Base Card Shadow & Glass Fill -->
  <rect x="1.5" y="1.5" width="247" height="51" rx="16" fill="url(#cardGrad)" stroke="${baseStroke}" stroke-width="1.2" filter="url(#glassGlow)" />

  <!-- Animated Conic Shimmer Border (Kıstas Glass Light Ray) -->
  <rect x="1.5" y="1.5" width="247" height="51" rx="16" fill="none" stroke="url(#shimmerGrad)" stroke-width="1.8" stroke-linecap="round" class="glass-border-anim" />

  <!-- Logo Mark Glass Container -->
  <g transform="translate(12, 10)">
    <rect width="34" height="34" rx="10" fill="${logoBg}" stroke="${logoBorder}" stroke-width="1" />

    <!-- Vector Kıstas Flame Icon -->
    <g transform="translate(5, 5)" class="flame-anim">
      <!-- Outer Blue Flame -->
      <path d="M12 2C8 6.5 6.2 9.8 6.2 13.6a5.8 5.8 0 0 0 11.6 0c0-3.8-2.2-7-5.8-11.6z" fill="url(#flameOuter)" />
      <!-- Inner Amber Flame Core -->
      <path d="M12 9.5c-1.3 1.6-2.1 2.8-2.1 4.2a2.1 2.1 0 0 0 4.2 0c0-1.4-0.8-2.6-2.1-4.2z" fill="url(#flameInner)" />
    </g>
  </g>

  <!-- Title & Eyebrow Text -->
  <g transform="translate(56, 12)">
    <text x="0" y="11" fill="${subTextColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" letter-spacing="1.2">FEATURED ON</text>
    <text x="0" y="27" fill="${mainTextColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16.5" font-weight="800" letter-spacing="-0.3">Kıstas</text>
  </g>

  <!-- Upvote Live Counter Pill (Glass Pill) -->
  <g transform="translate(178, 13)">
    <rect width="60" height="28" rx="9" fill="${pillBg}" stroke="${pillStroke}" stroke-width="1" />
    <path d="M7 16.5 L12 9.5 L17 16.5 Z" fill="${arrowColor}" />
    <text x="35" y="18.5" text-anchor="middle" fill="${pillTextColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" letter-spacing="-0.2">${escapeXml(formattedVotes)}</text>
  </g>
</svg>
`.trim();

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
