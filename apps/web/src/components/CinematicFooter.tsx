'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { KistasLogo } from './KistasLogo';

export const CinematicFooter: React.FC = () => {
  const pathname = usePathname();
  const isListingDetail = /^\/listings\/[^/]+\/?$/.test(pathname);
  const isProfile = pathname.startsWith('/profile');
  const isMessages = pathname.startsWith('/messages');

  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/create-listing' ||
    isProfile ||
    isMessages ||
    isListingDetail
  ) {
    return null;
  }

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="kcf" aria-label="Kıstas Alt Bilgi">
      <div className="kcf-glow" aria-hidden="true" />
      <div className="kcf-shell">
        <div className="kcf-brand">
          <KistasLogo size={36} showWordmark glow />
          <p className="kcf-tagline">
            Türkiye'nin bağımsız dijital projelerini, yenilikçi yazılımlarını ve mikro servislerini bir araya getiren prestijli vitrin.
          </p>
        </div>

        <nav className="kcf-sections">
          <div>
            <h4 className="kcf-section-title">Platform</h4>
            <ul className="kcf-list">
              <li><Link href="/browse" className="kcf-link">Projeleri Keşfet</Link></li>
              <li><Link href="/popular" className="kcf-link">Popüler Projeler</Link></li>
              <li><Link href="/new" className="kcf-link">Yeni Lansmanlar</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="kcf-section-title">Kurumsal</h4>
            <ul className="kcf-list">
              <li><Link href="/hakkimizda" className="kcf-link">Hakkımızda</Link></li>
              <li><Link href="/nasil-calisir" className="kcf-link">Nasıl Çalışır?</Link></li>
              <li><Link href="/blog" className="kcf-link">Kıstas Blog</Link></li>
              <li><Link href="/guvenlik" className="kcf-link">Güvenlik & Şeffaflık</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="kcf-section-title">Topluluk</h4>
            <ul className="kcf-list">
              <li><a href="https://github.com/kistas" target="_blank" rel="noopener noreferrer" className="kcf-link">GitHub</a></li>
              <li><a href="https://x.com/kistas" target="_blank" rel="noopener noreferrer" className="kcf-link">X (Twitter)</a></li>
              <li><a href="mailto:kistasdestek@gmail.com" className="kcf-link">İletişim & Destek</a></li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="kcf-bottom">
        <span>© {new Date().getFullYear()} Kıstas Inc. Tüm hakları saklıdır.</span>
        <button
          type="button"
          onClick={scrollToTop}
          className="kcf-top"
          aria-label="Yukarı çık"
          title="Sayfanın Başına Dön"
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </footer>
  );
};
