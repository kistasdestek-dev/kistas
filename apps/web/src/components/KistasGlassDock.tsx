'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KistasLogo } from './KistasLogo';
import { NavAnimatedIcon, NavTabKey } from './NavAnimatedIcon';
import { createClient } from '@/lib/supabase/browser';

interface NavItem {
  key: NavTabKey;
  label: string;
  href: string;
}

export const KistasGlassDock: React.FC = () => {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check Supabase session on mount & subscribe to auth state changes
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Active key calculation
  const getActiveKey = (): NavTabKey => {
    if (pathname === '/') return 'discover';
    if (
      pathname.startsWith('/browse') ||
      pathname.startsWith('/listings') ||
      pathname.startsWith('/categories')
    ) {
      return 'browse';
    }
    if (pathname.startsWith('/create-listing')) return 'create';
    if (pathname.startsWith('/popular') || pathname.startsWith('/credits')) return 'credits';
    if (pathname.startsWith('/login') || pathname.startsWith('/profile') || pathname.startsWith('/signup')) {
      return 'profile';
    }
    return 'discover';
  };

  const activeKey = getActiveKey();

  // Non-logged in: Only Keşfet, Göz At, Profil
  // Logged in: Keşfet, Göz At, Krediler, Lansman Yap, Profil
  const navItems: ReadonlyArray<NavItem> = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { key: 'discover', label: 'Keşfet', href: '/' },
        { key: 'browse', label: 'Göz At', href: '/browse' },
        { key: 'profile', label: 'Profil', href: '/login' },
      ];
    }

    return [
      { key: 'discover', label: 'Keşfet', href: '/' },
      { key: 'browse', label: 'Göz At', href: '/browse' },
      { key: 'credits', label: 'Krediler', href: '/popular' },
      { key: 'create', label: 'Lansman Yap', href: '/create-listing' },
      { key: 'profile', label: 'Profil', href: '/profile' },
    ];
  }, [isAuthenticated]);

  const handleBrandClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Auth pages (login & signup) have a dedicated focused layout (EARLY RETURN AFTER ALL HOOKS)
  if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/messages')) {
    return null;
  }

  return (
    <div className="kdn-shell" aria-label="Kıstas ana menü">
      <nav className="kdn-dock">
        <div className="k-glass-content">
          <div className="kdn-expanded">
            {/* Logo Anchor (Masaüstünde görünür, mobilde gizlenir) */}
            <Link
              href="/"
              onClick={handleBrandClick}
              className="kdn-brand"
              aria-label="Kıstas Ana Sayfası"
              title="Kıstas"
            >
              <KistasLogo size={32} showWordmark={false} glow />
            </Link>

            <div className="kdn-divider" />

            {/* Nav Tab Pills */}
            <div className="kdn-tabs" role="tablist">
              {navItems.map((item) => {
                const isActive = item.key === activeKey;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    data-tab={item.key}
                    className={`kdn-pill-tab${isActive ? ' is-active' : ''}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <span className="kdn-pill-icon">
                      <NavAnimatedIcon
                        name={item.key}
                        isActive={isActive}
                        color="currentColor"
                        size={20}
                      />
                    </span>
                    <span className="kdn-pill-label-wrapper">
                      <span className="kdn-pill-label">
                        {item.key === 'create' ? (
                          <>
                            <span className="hidden sm:inline">Lansman Yap</span>
                            <span className="sm:hidden">Lansman</span>
                          </>
                        ) : (
                          item.label
                        )}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};
