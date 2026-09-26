import type { Metadata, Viewport } from 'next';
import './globals.css';
import { KistasGlassDock } from '@/components/KistasGlassDock';
import { RouteAwareFooter } from '@/components/RouteAwareFooter';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { GlobalClientRuntime } from '@/components/GlobalClientRuntime';

export const metadata: Metadata = {
  title: 'Kıstas — Dijital Proje Vitrini ve Bağımsız Geliştirici Ekosistemi',
  description: 'Türkiye’nin yeni nesil dijital proje vitrini, ürün lansman platformu ve bağımsız geliştirici ekosistemi.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-transparent text-white antialiased selection:bg-[#3269C7]/30 selection:text-white">
        {/* Signature Oval Liquid Glass Dock Navigation */}
        <KistasGlassDock />

        {/* Main Content Area with Safe-Area Mobile Bottom Clearance */}
        <main className="min-h-[calc(100vh-16rem)] pb-6 overflow-x-hidden">
          {children}
        </main>

        {/* Global Apple-Style Cinematic Footer */}
        <RouteAwareFooter />
        <GlobalClientRuntime />
        <AnalyticsProvider />
      </body>
    </html>
  );
}
