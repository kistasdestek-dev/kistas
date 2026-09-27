'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { KistasLogo } from './KistasLogo';
import { NavAnimatedIcon, NavTabKey } from './NavAnimatedIcon';

interface NavItem {
  key: NavTabKey;
  label: string;
  href: string;
}

function NavPendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-[#60A5FA] shadow-[0_0_10px_rgba(96,165,250,0.85)] transition-all duration-150 ${
        pending ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
      }`}
    />
  );
}

export const KistasGlassDock: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    router.prefetch('/browse');
  }, [router]);

  // Check Supabase session on mount & subscribe to auth state changes
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe = () => {};

    const initializeAuth = async () => {
      const { createClient } = await import('@/lib/supabase/browser');
      if (isCancelled) return;

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (isCancelled) return;

      setIsAuthenticated(Boolean(session));
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setIsAuthenticated(Boolean(nextSession));
      });
      unsubscribe = () => subscription.unsubscribe();
    };

    void initializeAuth();

    return () => {
      isCancelled = true;
      unsubscribe();
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
      { key: 'credits', label: 'Krediler', href: '/credits' },
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

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === href) {
      event.preventDefault();
    }
  };

  // Auth pages (login & signup) have a dedicated focused layout (EARLY RETURN AFTER ALL HOOKS)
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/admin')
  ) {
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
                    prefetch
                    onClick={(event) => handleNavClick(event, item.href)}
                    data-tab={item.key}
                    className={`kdn-pill-tab${isActive ? ' is-active' : ''}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-current={isActive ? 'page' : undefined}
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
                    <NavPendingIndicator />
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
