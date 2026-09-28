'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  Rocket,
  ArrowRightLeft,
  Search,
  Heart,
  Users,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { KistasTopBrandBar } from '@/components/KistasTopBrandBar';
import { SiteBackButton } from '@/components/SiteNavigation';

const SplineSceneRobot = dynamic(
  () => import('@/components/ui/SplineSceneRobot').then((mod) => mod.SplineSceneRobot),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[460px] sm:min-h-[500px] rounded-[24px] sm:rounded-[32px] border border-white/10 bg-[#060A12] flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-blue-500/20 animate-pulse blur-xl" />
      </div>
    ),
  }
);

export const AboutExperienceClient: React.FC = () => {

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col font-sans selection:bg-[#3269C7]/30 selection:text-white">
      {/* 1. ÜST NAVİGASYON BARI */}
      <header className="border-b border-white/10 bg-[#080C14]/75 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-[1240px] px-4 py-3 flex items-center justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <SiteBackButton />
            <div className="h-6 w-px bg-white/15" />
            <Link href="/" className="text-sm font-semibold text-[#60A5FA] hover:underline">
              Ana Sayfa
            </Link>
            <span className="text-white/30">/</span>
            <span className="text-sm font-bold text-white">Hakkımızda</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/browse"
              className="text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors hidden sm:inline-block"
            >
              Projeleri Keşfet
            </Link>
            <Link
              href="/create-listing"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#3269C7] px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(50,105,199,0.35)] transition-all hover:bg-[#2554A8] hover:shadow-[0_6px_22px_rgba(50,105,199,0.5)]"
            >
              <Rocket size={14} />
              <span>Proje Yayınla</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. MARKA LOGO BARI */}
      <KistasTopBrandBar tagline="İyi fikirler görünür olmayı hak eder" />

      {/* 3. ANA İÇERİK */}
      <main className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 py-6 space-y-16 flex-1">
        {/* 3D ROBOT VİTRİNİ */}
        <section aria-label="Kıstas 3D Tanıtım Vitrini" className="w-full">
          <SplineSceneRobot
            title="Yeni fikirleri keşfet."
            accentTitle="Sevdiğini destekle."
          />
        </section>

        {/* BÖLÜM 1: KISTAS NEDİR? */}
        <section aria-label="Kıstas Nedir" className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#3269C7]/30 bg-[#3269C7]/15 px-4 py-1.5 shadow-sm">
            <Sparkles size={14} className="text-[#60A5FA]" />
            <span className="text-[11px] font-bold tracking-widest text-[#60A5FA] uppercase">
              KISTAS NEDİR?
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Yeni Dijital Ürünleri Bulmanın <span className="text-[#60A5FA]">En Şeffaf Yolu</span>
          </h2>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-[#94A3B8] leading-relaxed">
            Kıstas; bağımsız geliştiricilerin, vizyoner tasarımcıların ve yenilikçi ekiplerin ürettiği dijital ürünleri tek merkezde toplayan, topluluk destekli yeni nesil vitrin ekosistemidir.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-xs font-bold text-black shadow-[0_6px_20px_rgba(255,255,255,0.15)] transition-all hover:bg-zinc-200 hover:scale-[1.02]"
            >
              <span>Projeleri Keşfet</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/nasil-calisir"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-white/10 hover:border-white/25 hover:scale-[1.02]"
            >
              <span>Nasıl Çalışır?</span>
            </Link>
          </div>

          {/* KÖPRÜ MİMARİSİ (KISTAS KİMİN İÇİN?) */}
          <div className="mx-auto mt-12 w-full max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.04] p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-xl text-left">
            <div className="text-center pb-8 border-b border-white/10">
              <span className="text-xs font-extrabold tracking-widest text-[#60A5FA] uppercase">
                KISTAS KİMİN İÇİN?
              </span>
              <h3 className="mt-1 text-2xl sm:text-3xl font-black text-white tracking-tight">
                İki İhtiyacı Tek Yerde Buluşturur
              </h3>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-stretch justify-between gap-6 relative">
              {/* Sol Yol: Kullanıcı / Destekçi */}
              <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col justify-between transition-all hover:border-white/20 hover:bg-white/[0.06]">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#60A5FA] shadow-sm border border-white/10 mb-4">
                    <Compass size={22} />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-[#60A5FA] uppercase">
                    YENİ BİR ÜRÜN ARIYORSAN
                  </span>
                  <h4 className="text-lg font-bold text-white mt-1.5">
                    Sana Uygun Projeyi Bul
                  </h4>
                  <p className="mt-2 text-xs sm:text-[13px] text-[#94A3B8] leading-relaxed">
                    Kategorileri gez, bağımsız yapımları incele, canlı demoları test et ve beğendiğin ürünlere kalıcı destek ver.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-bold text-white">
                  <span>Keşfet</span>
                  <span className="h-1 w-1 rounded-full bg-[#60A5FA]" />
                  <span>İncele</span>
                  <span className="h-1 w-1 rounded-full bg-[#60A5FA]" />
                  <span>Destekle</span>
                </div>
              </div>

              {/* Orta: Kıstas Bağlantı Mührü */}
              <div className="flex md:flex-col items-center justify-center gap-2 my-2 md:my-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3269C7] text-white shadow-lg shadow-blue-500/40">
                  <ArrowRightLeft size={20} />
                </div>
                <span className="text-[10px] font-black tracking-widest text-[#60A5FA] uppercase">
                  KISTAS
                </span>
              </div>

              {/* Sağ Yol: Geliştirici / Üretici */}
              <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col justify-between transition-all hover:border-white/20 hover:bg-white/[0.06]">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#60A5FA] shadow-sm border border-white/10 mb-4">
                    <Rocket size={22} />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-[#60A5FA] uppercase">
                    BİR PROJEN VARSA
                  </span>
                  <h4 className="text-lg font-bold text-white mt-1.5">
                    Doğru İnsanlara Ulaş
                  </h4>
                  <p className="mt-2 text-xs sm:text-[13px] text-[#94A3B8] leading-relaxed">
                    Projeni dakikalar içinde vitrine taşı, adil rotasyonla gerçek kullanıcılara ulaş ve organik geri bildirimlerle büyü.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-bold text-white">
                  <span>Yayınla</span>
                  <span className="h-1 w-1 rounded-full bg-[#60A5FA]" />
                  <span>Ulaş</span>
                  <span className="h-1 w-1 rounded-full bg-[#60A5FA]" />
                  <span>Büyüt</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BÖLÜM 2: NEDEN KISTAS? (3 TEMEL İLKE) */}
        <section aria-label="Neden Kıstas" className="space-y-8">
          <div className="max-w-3xl">
            <span className="text-xs font-extrabold tracking-widest text-[#60A5FA] uppercase">
              NEDEN KISTAS?
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Yeni ürün bulmak da, ürününü duyurmak da kolay olsun.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              İnternette iyi bir ürünü bulmak zor, yeni bir ürünü duyurmak daha da zor. Kıstas ikisini tek yerde buluşturur: <strong className="text-white">Üreticiler projelerini anlatır, kullanıcılar keşfeder ve beğendiğine destek verir.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#60A5FA]">
                  <Search size={22} />
                </div>
                <span className="text-xs font-black text-[#60A5FA]/60 tracking-widest">01</span>
              </div>
              <h3 className="text-lg font-bold text-white">Aradığını Kolay Bul</h3>
              <p className="mt-2.5 text-xs sm:text-[13px] text-[#94A3B8] leading-relaxed">
                Kategori filtreleri, canlı arama ve etiketlerle ilgini çeken doğru dijital araca zahmetsizce ulaş.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#60A5FA]">
                  <Heart size={22} />
                </div>
                <span className="text-xs font-black text-[#60A5FA]/60 tracking-widest">02</span>
              </div>
              <h3 className="text-lg font-bold text-white">Beğendiğini Destekle</h3>
              <p className="mt-2.5 text-xs sm:text-[13px] text-[#94A3B8] leading-relaxed">
                Verdiğin destek kalıcıdır. İyi projelerin topluluk tarafından fark edilmesini sağlar ve üreticiyi motive eder.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#60A5FA]">
                  <Users size={22} />
                </div>
                <span className="text-xs font-black text-[#60A5FA]/60 tracking-widest">03</span>
              </div>
              <h3 className="text-lg font-bold text-white">Doğru İnsanlara Ulaş</h3>
              <p className="mt-2.5 text-xs sm:text-[13px] text-[#94A3B8] leading-relaxed">
                Projen, yeni fikirleri merak eden gerçek kitleyle adil vitrin rotasyonunda buluşur; tekelleşme yaşanmaz.
              </p>
            </div>
          </div>
        </section>

        {/* BÖLÜM 3: NASIL İŞLER? (3 BASİT ADIM AKIŞI) */}
        <section aria-label="Nasıl İşler" className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="max-w-2xl">
            <span className="text-xs font-extrabold tracking-widest text-[#60A5FA] uppercase">
              BASİT SÜREÇ
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
              Üç Adımda Keşfet, Destekle ve Büyümeye Ortak Ol
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-[#60A5FA]">01 · KEŞFET</span>
                <Compass size={18} className="text-[#60A5FA]" />
              </div>
              <h3 className="text-base font-bold text-white">Yeni Projelere Göz At</h3>
              <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
                Kategorileri gez, yeni lansmanları incele ve ilgini çeken bağımsız projenin detaylarına göz at.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-[#60A5FA]">02 · DESTEKLE</span>
                <Heart size={18} className="text-[#60A5FA]" />
              </div>
              <h3 className="text-base font-bold text-white">Beğendiğine Ses Ver</h3>
              <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
                Tek dokunuşla destek ver. Desteğin kalıcı olsun ve iyi fikrin trendlerde öne çıkmasına yardım et.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-[#60A5FA]">03 · BÜYÜT</span>
                <TrendingUp size={18} className="text-[#60A5FA]" />
              </div>
              <h3 className="text-base font-bold text-white">Gelişime Ortak Ol</h3>
              <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
                Geri bildirimlerinle üreticiye yol göster, erken erişim fırsatlarını yakala ve topluluğu büyüt.
              </p>
            </div>
          </div>
        </section>

        {/* BÖLÜM 4: PRESTİJLİ EYLEME ÇAĞRI (CTA) */}
        <section aria-label="Kıstas Katılım Çağrısı" className="pt-4">
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-zinc-900 via-[#0A1428] to-black p-10 sm:p-14 text-center text-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)]">
            <div
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-[#3269C7]/30 blur-[90px]"
              aria-hidden="true"
            />

            <div className="relative z-10 mx-auto max-w-2xl space-y-4">
              <span className="inline-block rounded-full border border-white/10 bg-white/10 px-3.5 py-1 text-[11px] font-bold tracking-widest text-[#60A5FA] uppercase backdrop-blur-md">
                ŞİMDİ KEŞFET
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
                Yeni favorin bir tık uzağında.
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl mx-auto">
                Projeleri incele, beğendiğine destek ver ve iyi fikirlerin büyümesine ortak ol.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/browse"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-xs font-bold text-black shadow-lg transition-all hover:bg-zinc-200 hover:scale-[1.02]"
                >
                  <Compass size={17} className="text-[#3269C7]" />
                  <span>Projeleri Keşfet</span>
                </Link>

                <Link
                  href="/create-listing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-[1.02]"
                >
                  <Rocket size={17} />
                  <span>Projeni Ücretsiz Yayınla</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
