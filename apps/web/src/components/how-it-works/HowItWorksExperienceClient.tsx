'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Rocket,
  HeartHandshake,
  MessageSquareQuote,
  Layers,
  Radio,
  TrendingUp,
  ShieldCheck,
  Cpu,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { SplineSceneRobot } from '@/components/ui/SplineSceneRobot';
import { KistasTopBrandBar } from '@/components/KistasTopBrandBar';
import { GlassIconButton } from '@/components/GlassIconButton';

type Audience = 'explorer' | 'creator';

interface StepItem {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  step: string;
  badge: string;
  title: string;
  copy: string;
  highlight: string;
}

const STEPS: Record<Audience, StepItem[]> = {
  explorer: [
    {
      icon: Compass,
      step: '01',
      badge: 'KEŞİF & ANALİZ',
      title: 'Yenilikçi Projeleri Keşfet',
      copy: 'Türkiye’nin ve dünyanın dört bir yanından bağımsız geliştiricilerin ürettiği mobil uygulamaları, SaaS araçlarını, oyunları ve açık kaynak kütüphanelerini tek merkezde incele.',
      highlight: 'Kategorize edilmiş dinamik filtreler ve canlı demolar.',
    },
    {
      icon: HeartHandshake,
      step: '02',
      badge: 'TOPLULUK GÜCÜ',
      title: 'Beğendiğin Projeye Destek Ol',
      copy: 'Gelişmesini istediğin projelere tek dokunuşla kalıcı destek ver. Kıstas ekosisteminde sıralamaları yapay botlar değil, gerçek kullanıcıların organik oyları belirler.',
      highlight: 'Şeffaf puanlama ve manipülasyona kapalı oy algoritması.',
    },
    {
      icon: MessageSquareQuote,
      step: '03',
      badge: 'DOĞRUDAN DİYALOG',
      title: 'Geliştiriciyle Anında Bağ Kur',
      copy: 'Aklına takılanları sor, yapıcı geri bildirimler ilet ve erken erişim fırsatlarını yakala. Kıstas Realtime Chat ile üreticilerle doğrudan iletişim kur.',
      highlight: 'Güvenli, filtrelenmiş ve anlık mesajlaşma altyapısı.',
    },
  ],
  creator: [
    {
      icon: Layers,
      step: '01',
      badge: 'DİJİTAL VİTRİN',
      title: 'Prestijli Proje Vitrinini Hazırla',
      copy: 'Dakikalar içinde ürününün ekran görüntülerini, video tanıtımını, teknoloji yığınını ve vizyonunu içeren yüksek çözünürlüklü bir vitrin sayfası oluştur.',
      highlight: 'Zengin medya desteği, Markdown açıklamalar ve canlı önizleme.',
    },
    {
      icon: Radio,
      step: '02',
      badge: 'ADİL DAĞILIM',
      title: 'Doğru Hedef Kitleye Ulaş',
      copy: 'Kıstas Saatlik Rotasyon motoru sayesinde tek bir projenin vitrini kapatmasına izin verilmez. Ürünün, yeni fikirleri merak eden gerçek kitleyle adil şekilde buluşur.',
      highlight: 'Sıfır tekelleşme, eşit fırsat tanıyan saatlik vitrin rotasyonu.',
    },
    {
      icon: TrendingUp,
      step: '03',
      badge: 'ORGANİK BÜYÜME',
      title: 'Destekle Büyü & Gelir Kazan',
      copy: 'Topluluktan gelen desteklerle trendlere gir, erken benimseyiciler (early adopters) edin ve mikro servislerini veya projeni güvenle monetize et.',
      highlight: 'Organik SEO gücü, backlink değeri ve doğrulanmış geliştirici statüsü.',
    },
  ],
};

const ARCHITECTURE_PILLARS = [
  {
    icon: Cpu,
    title: 'Kıstas Puan Algoritması',
    subtitle: 'Manipülasyona Kapalı Sıralama',
    desc: 'Projelerin vitrindeki konumu yalnızca ham oy sayısıyla değil; oy veren profillerin güvenilirlik skoru, zamana bağlı azalım (decay katsayısı) ve gerçek etkileşim kalitesiyle ağırlıklı olarak hesaplanır.',
    tag: 'Şeffaf Algoritma',
  },
  {
    icon: RefreshCw,
    title: 'Saatlik Vitrin Rotasyonu',
    subtitle: 'Her Fikre Eşit Şans',
    desc: 'Sponsorlu ve öne çıkarılan projeler hiçbir zaman vitrini 7/24 tekeline alamaz. Akıllı rotasyon motorumuz, saatlik zaman dilimlerinde vitrin kartlarını dönüştürerek her üreticiye adil görünürlük sağlar.',
    tag: 'Adil Ekosistem',
  },
  {
    icon: ShieldCheck,
    title: 'Pars DevState Güvenlik Zırhı',
    subtitle: 'Sıfır Güven (Zero-Trust) Koruması',
    desc: 'Sahte hesap açılışları, oy manipülasyonları, XSS enjeksiyonları ve phishing girişimleri Pars DevState savunma katmanları tarafından anlık olarak izlenir ve anında nötralize edilir.',
    tag: 'Kurumsal Güvenlik',
  },
];

export const HowItWorksExperienceClient: React.FC = () => {
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>('explorer');

  const isExplorer = audience === 'explorer';

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col font-sans selection:bg-[#3269C7]/30 selection:text-white">
      {/* 1. ÜST MARKA BARI & GERİ DÖN NAVİGASYONU */}
      <header className="border-b border-white/10 bg-[#080C14]/75 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-[1240px] px-4 py-3 flex items-center justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <GlassIconButton
              icon={ArrowLeft}
              title="Geri Dön"
              ariaLabel="Geri Dön"
              onClick={() => router.back()}
            />
            <div className="h-6 w-px bg-white/15" />
            <Link href="/" className="text-sm font-semibold text-[#60A5FA] hover:underline">
              Ana Sayfa
            </Link>
            <span className="text-white/30">/</span>
            <span className="text-sm font-bold text-white">Nasıl Çalışır?</span>
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

      {/* 2. LOGO BAŞLIĞI */}
      <KistasTopBrandBar tagline="İyi fikirler görünür olmayı hak eder" />

      {/* 3. ANA İÇERİK KAPSAYICISI */}
      <main className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 py-6 space-y-16 flex-1">
        {/* 3D ROBOT HERO VİTRİNİ */}
        <section aria-label="Kıstas 3D İnteraktif Vitrin" className="w-full">
          <SplineSceneRobot
            title="Keşfetmek kolay."
            accentTitle="Büyümek mümkün."
          />
        </section>

        {/* BÖLÜM: KISTAS NASIL İŞLER? */}
        <section aria-label="Kıstas Nasıl İşler" className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#3269C7]/30 bg-[#3269C7]/15 px-4 py-1.5 shadow-sm">
            <Sparkles size={14} className="text-[#60A5FA]" />
            <span className="text-[11px] font-bold tracking-widest text-[#60A5FA] uppercase">
              KISTAS NASIL İŞLER?
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            İki Tarafı Buluşturan <span className="text-[#60A5FA]">Adil Ekosistem</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-[#94A3B8] leading-relaxed">
            Kıstas, yeni dijital ürün ve araç arayan kullanıcılarla, projesini doğru kitleye duyurmak isteyen üreticileri tek ve şeffaf bir platformda birleştirir.
          </p>

          {/* İKİ SEKMELİ GEÇİŞ (AUDIENCE SELECTOR) */}
          <div className="mx-auto flex max-w-[560px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-inner backdrop-blur-md">
            <button
              type="button"
              onClick={() => setAudience('explorer')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                isExplorer
                  ? 'bg-white text-black shadow-[0_4px_16px_rgba(255,255,255,0.15)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Compass size={17} className={isExplorer ? 'text-[#3269C7]' : 'text-white/40'} />
              <span>Keşfetmek İstiyorum</span>
            </button>

            <button
              type="button"
              onClick={() => setAudience('creator')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                !isExplorer
                  ? 'bg-white text-black shadow-[0_4px_16px_rgba(255,255,255,0.15)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Rocket size={17} className={!isExplorer ? 'text-[#3269C7]' : 'text-white/40'} />
              <span>Projemi Büyütmek İstiyorum</span>
            </button>
          </div>

          {/* 3 ADIMLI KART GRİDİ */}
          <div className="grid grid-cols-1 gap-6 pt-4 text-left md:grid-cols-3">
            {STEPS[audience].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#60A5FA] shadow-sm transition-transform group-hover:scale-105">
                        <Icon size={24} />
                      </div>
                      <span className="text-xs font-black tracking-widest text-[#60A5FA]/60">
                        {item.step}
                      </span>
                    </div>

                    <span className="inline-block rounded-md border border-[#3269C7]/30 bg-[#3269C7]/20 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-[#60A5FA] uppercase mb-2.5">
                      {item.badge}
                    </span>

                    <h3 className="text-lg font-bold text-white leading-snug group-hover:text-[#60A5FA] transition-colors">
                      {item.title}
                    </h3>

                    <p className="mt-2.5 text-xs sm:text-[13px] text-[#94A3B8] leading-relaxed">
                      {item.copy}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] font-semibold text-[#60A5FA]">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{item.highlight}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BÖLÜM: GERÇEKTEN KISTAS NASIL ÇALIŞIR? (DERİNLEMESİNE MİMARİ SUNUM) */}
        <section
          aria-label="Kıstas Mimari ve Çalışma Prensibi"
          className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 sm:p-12 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] backdrop-blur-xl"
        >
          <div className="max-w-3xl">
            <span className="text-xs font-extrabold tracking-widest text-[#60A5FA] uppercase">
              ŞEFFAFLIK & MİMARİ
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Gerçekten Kıstas Nasıl Çalışır?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              Kıstas bir rastgele ilan tahtası değildir. Arka planda çalışan zaman-ağırlıklı puan algoritmamız, saatlik slot rotasyonumuz ve Pars DevState güvenlik kalkanımızla her dijital varlığa hak ettiği değeri verir.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {ARCHITECTURE_PILLARS.map((pillar) => {
              const PillarIcon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:bg-white/[0.06] hover:border-white/20 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3269C7] text-white shadow-md shadow-blue-500/30">
                      <PillarIcon size={20} />
                    </div>
                    <span className="rounded-full border border-[#3269C7]/30 bg-[#3269C7]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#60A5FA]">
                      {pillar.tag}
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-bold text-white">
                    {pillar.title}
                  </h3>
                  <h4 className="text-xs font-semibold text-[#60A5FA] mt-0.5">
                    {pillar.subtitle}
                  </h4>

                  <p className="mt-3 text-xs text-[#94A3B8] leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ŞEFFAF METRİKLER BANDI */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#60A5FA] shadow-sm border border-white/10">
                <Lock size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Pars DevState Katmanlı Savunma
                </h4>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Her oy, yorum ve mesajlaşma işlemi veri arındırma ve anti-bot kontrollerinden geçer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="text-center sm:text-right">
                <span className="block text-xl sm:text-2xl font-black text-[#60A5FA]">%100</span>
                <span className="text-[11px] font-semibold text-[#94A3B8]">Organik Oylama</span>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div className="text-center sm:text-right">
                <span className="block text-xl sm:text-2xl font-black text-[#60A5FA]">60 Dk</span>
                <span className="text-[11px] font-semibold text-[#94A3B8]">Adil Rotasyon</span>
              </div>
            </div>
          </div>
        </section>

        {/* BÖLÜM: PRESTİJLİ EYLEME ÇAĞRI (CTA) */}
        <section aria-label="Kıstas Katılım Çağrısı" className="pt-4">
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-zinc-900 via-[#0A1428] to-black p-10 sm:p-14 text-center text-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)]">
            {/* Background Light Orbs */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-[#3269C7]/30 blur-[90px]"
              aria-hidden="true"
            />

            <div className="relative z-10 mx-auto max-w-2xl space-y-4">
              <span className="inline-block rounded-full border border-white/10 bg-white/10 px-3.5 py-1 text-[11px] font-bold tracking-widest text-[#60A5FA] uppercase backdrop-blur-md">
                KISTAS EKOSİSTEMİ
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
                Kıstas'ta yerini almaya hazır mısın?
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl mx-auto">
                Yeni bir dijital ürün keşfet veya geliştirdiğin bağımsız projeyi binlerce meraklı gözün önüne çıkar.
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
