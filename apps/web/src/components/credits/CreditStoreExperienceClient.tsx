'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import {
  CREDIT_STORE_PLANS,
  formatCreditPrice,
  formatUnitCreditPrice,
  type CreditStorePlan,
} from '@/lib/creditStore';
import { GlassIconButton } from '@/components/GlassIconButton';
import { KistasTopBrandBar } from '@/components/KistasTopBrandBar';
import { ShinyButton } from '@/components/ui/shiny-button';

interface CreditStoreExperienceClientProps {
  userId: string;
  accountEmail: string;
  initialBalance: number;
}

type PaymentStatus = 'idle' | 'pending' | 'success' | 'timeout' | 'error';

interface PurchaseTransaction {
  balance_after: number | null;
  metadata: Record<string, unknown> | null;
}

export const CreditStoreExperienceClient: React.FC<CreditStoreExperienceClientProps> = ({
  userId,
  accountEmail,
  initialBalance,
}) => {
  const supabase = useMemo(() => createClient(), []);
  const checkingRef = useRef(false);
  const [balance, setBalance] = useState(initialBalance);
  const [selectedPlan, setSelectedPlan] = useState<CreditStorePlan | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [checkoutStartedAt, setCheckoutStartedAt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const closeCheckout = useCallback(() => {
    setSelectedPlan(null);
    setPaymentStatus('idle');
    setCheckoutStartedAt(null);
    setFeedback(null);
    setIsCopied(false);
  }, []);

  useEffect(() => {
    if (!selectedPlan) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCheckout();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [closeCheckout, selectedPlan]);

  const checkPayment = useCallback(async (): Promise<boolean> => {
    if (!selectedPlan || !checkoutStartedAt || checkingRef.current) return false;
    checkingRef.current = true;
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('balance_after, metadata')
        .eq('user_id', userId)
        .eq('type', 'purchase')
        .gte('created_at', checkoutStartedAt)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        setFeedback('Ödeme durumu şu anda kontrol edilemedi. Biraz sonra tekrar deneyin.');
        return false;
      }

      const matchingTransaction = (data as PurchaseTransaction[] | null)?.find((transaction) => (
        transaction.metadata?.product_id === selectedPlan.shopierProductId
        && Number(transaction.metadata?.amount_minor) === selectedPlan.amountMinor
      ));

      if (!matchingTransaction) return false;

      if (typeof matchingTransaction.balance_after === 'number') {
        setBalance(matchingTransaction.balance_after);
      }
      setPaymentStatus('success');
      setFeedback(`${selectedPlan.credits.toLocaleString('tr-TR')} kredi güvenli biçimde hesabınıza eklendi.`);
      return true;
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  }, [checkoutStartedAt, selectedPlan, supabase, userId]);

  useEffect(() => {
    if (paymentStatus !== 'pending' || !checkoutStartedAt) return;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      void checkPayment().then((isComplete) => {
        if (isComplete) window.clearInterval(interval);
      });
      if (attempts >= 24) {
        window.clearInterval(interval);
        setPaymentStatus('timeout');
        setFeedback('Ödeme onayı henüz ulaşmadı. İşlem tamamlandıysa birkaç dakika sonra bakiyenizi yeniden kontrol edin.');
      }
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [checkPayment, checkoutStartedAt, paymentStatus]);

  const openPayment = () => {
    if (!selectedPlan || !accountEmail) {
      setPaymentStatus('error');
      setFeedback('Güvenli ödeme eşlemesi için doğrulanmış hesap e-postası gereklidir.');
      return;
    }

    const width = 540;
    const height = 820;
    const startedAt = new Date().toISOString();
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const popup = window.open(
      selectedPlan.checkoutUrl,
      'KistasShopierCheckout',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,toolbar=no,scrollbars=yes,resizable=yes,noopener,noreferrer`,
    );

    if (!popup) {
      setPaymentStatus('error');
      setFeedback('Ödeme penceresi tarayıcı tarafından engellendi. Açılır pencereye izin verip tekrar deneyin.');
      return;
    }

    popup.opener = null;
    setCheckoutStartedAt(startedAt);
    setPaymentStatus('pending');
    setFeedback('Shopier ödeme penceresi açıldı. Onay geldiğinde bakiyeniz otomatik güncellenecek.');
  };

  const copyAccountEmail = async () => {
    if (!accountEmail) return;
    try {
      await navigator.clipboard.writeText(accountEmail);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1_800);
    } catch {
      setFeedback('E-posta kopyalanamadı. Adresi ödeme ekranına elle yazabilirsiniz.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-36 text-[#F8FAFC] selection:bg-blue-500/20">
      <main className="mx-auto w-full max-w-[1180px] px-4 pt-6 sm:px-6 lg:px-8">
        <KistasTopBrandBar className="mb-4" />

        <section className="relative overflow-hidden rounded-[28px] border border-[#6EA8FF]/20 bg-[linear-gradient(145deg,rgba(18,38,70,.86),rgba(6,15,31,.95)_66%,rgba(12,25,48,.9))] p-6 shadow-[0_24px_70px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.1)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-[#3269C7]/30 blur-[92px]" />
          <div className="pointer-events-none absolute -right-20 top-4 h-56 w-56 rounded-full bg-[#60A5FA]/15 blur-[82px]" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6EA8FF]/20 bg-[#3269C7]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9BC2FF]">
                <Sparkles size={13} /> Kıstas Kredi Mağazası
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                Görünürlüğünü krediyle büyüt.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#AFC0D8] sm:text-base">
                Projeni Keşfet ve kategori vitrinlerinde öne çıkar. Abonelik yok; aldığın krediler süresiz bakiyende kalır.
              </p>
            </div>

            <div className="min-w-[230px] rounded-[22px] border border-white/12 bg-white/[0.065] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#91A6C5]">Kullanılabilir bakiye</p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-white">{balance.toLocaleString('tr-TR')}</p>
                </div>
                <GlassIconButton icon={WalletCards} size={46} iconSize={20} ariaLabel="Kredi bakiyesi" />
              </div>
              <p className="mt-3 border-t border-white/10 pt-3 text-[11px] font-semibold text-[#78ADFF]">Vitrin kredisi</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#60A5FA]">Tek seferlik paketler</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Hedefine uygun krediyi seç.</h2>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#91A6C5]">
              <ShieldCheck size={16} className="text-emerald-400" /> Shopier güvenli ödeme
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
            {CREDIT_STORE_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`group relative flex min-h-[420px] flex-col overflow-hidden rounded-[26px] border p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 sm:p-6 ${
                  plan.featured
                    ? 'border-[#6EA8FF]/45 bg-[linear-gradient(155deg,rgba(36,77,144,.34),rgba(7,18,37,.92)_60%)] shadow-[0_24px_55px_rgba(31,83,170,.2),inset_0_1px_0_rgba(255,255,255,.12)]'
                    : 'border-white/10 bg-white/[0.045] shadow-[0_18px_45px_rgba(0,0,0,.2),inset_0_1px_0_rgba(255,255,255,.07)] hover:border-[#6EA8FF]/25'
                }`}
              >
                {plan.featured && (
                  <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[#8BB8FF]/30 bg-[#3269C7]/35 px-2.5 py-1 text-[10px] font-extrabold text-[#CFE2FF] shadow-[0_0_22px_rgba(59,130,246,.22)]">
                    <BadgeCheck size={13} /> En Popüler
                  </div>
                )}
                <div className="relative">
                  <p className="text-sm font-extrabold text-white">{plan.name}</p>
                  <p className="mt-1 max-w-[250px] text-xs leading-5 text-[#91A6C5]">{plan.description}</p>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="text-5xl font-black tracking-[-0.06em] text-white">{plan.credits.toLocaleString('tr-TR')}</span>
                    <span className="mb-1.5 text-xs font-bold text-[#78ADFF]">kredi</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-y border-white/10 py-3">
                    <span className="text-2xl font-black tracking-tight text-white">{formatCreditPrice(plan.priceTRY)}</span>
                    <span className="text-[10px] font-semibold text-[#91A6C5]">{formatUnitCreditPrice(plan)} TL / kredi</span>
                  </div>
                </div>

                <ul className="relative mt-5 flex-1 space-y-3">
                  {plan.useCases.map((useCase) => (
                    <li key={useCase} className="flex items-start gap-2.5 text-xs font-semibold leading-5 text-[#C5D3E6]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {useCase}
                    </li>
                  ))}
                </ul>

                <ShinyButton
                  onClick={() => setSelectedPlan(plan)}
                  className={`mt-7 min-h-12 !rounded-2xl !px-5 !text-xs ${plan.featured ? '' : '!shadow-[inset_0_0_0_1px_#1E293B,0_8px_20px_-6px_rgba(59,130,246,.3)]'}`}
                >
                  <span className="inline-flex items-center gap-2">Paketi Seç <ArrowRight size={15} /></span>
                </ShinyButton>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Kredi mağazası güvenceleri">
          {[
            [LockKeyhole, 'Sunucu doğrulaması', 'Fiyat ve kredi miktarı sunucuda eşleştirilir.'],
            [Zap, 'Anında tanımlama', 'Shopier onayı sonrası bakiye otomatik güncellenir.'],
            [Clock3, 'Süresiz kullanım', 'Satın aldığın kredilerin son kullanma tarihi yoktur.'],
          ].map(([Icon, title, description]) => {
            const BenefitIcon = Icon as typeof LockKeyhole;
            return (
              <div key={String(title)} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                <GlassIconButton icon={BenefitIcon} size={38} iconSize={16} ariaLabel={String(title)} />
                <div>
                  <p className="text-xs font-bold text-white">{String(title)}</p>
                  <p className="mt-1 text-[10px] leading-4 text-[#91A6C5]">{String(description)}</p>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {selectedPlan && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#020712]/82 p-0 backdrop-blur-xl sm:items-center sm:p-4" onClick={closeCheckout}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="credit-checkout-title"
            className="k-modal-glass-card relative max-h-[94dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-b-none border-b-0 bg-[linear-gradient(155deg,rgba(18,38,70,.99),rgba(5,13,28,.99)_62%)] p-5 sm:rounded-[28px] sm:border-b sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute -left-16 -top-24 h-52 w-52 rounded-full bg-[#3269C7]/30 blur-[72px]" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <GlassIconButton icon={CreditCard} size={42} iconSize={18} ariaLabel="Güvenli ödeme" />
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#78ADFF]">Güvenli ödeme</p>
                  <h2 id="credit-checkout-title" className="text-lg font-black text-white">{selectedPlan.name} paketi</h2>
                </div>
              </div>
              <GlassIconButton icon={X} onClick={closeCheckout} size={34} iconSize={16} iconColor="#DCE8F8" ariaLabel="Ödeme penceresini kapat" className="!border-white/15 !bg-white/[0.08]" />
            </div>

            <div className="relative mt-5 rounded-[22px] border border-[#6EA8FF]/25 bg-[#3269C7]/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#91A6C5]">Hesabına eklenecek</p>
                  <p className="mt-1 text-3xl font-black text-white">{selectedPlan.credits.toLocaleString('tr-TR')} <span className="text-sm text-[#78ADFF]">kredi</span></p>
                </div>
                <p className="text-2xl font-black text-white">{formatCreditPrice(selectedPlan.priceTRY)}</p>
              </div>
            </div>

            <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#91A6C5]">Kıstas hesap e-postası</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs font-bold text-white">{accountEmail || 'Doğrulanmış e-posta bulunamadı'}</code>
                <button type="button" onClick={() => void copyAccountEmail()} disabled={!accountEmail} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-[#78ADFF] transition-all hover:bg-white/[0.12] active:scale-95 disabled:opacity-40" aria-label="Hesap e-postasını kopyala">
                  {isCopied ? <CheckCircle2 size={16} /> : <Clipboard size={16} />}
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-[#91A6C5]">Bu adresi Shopier sipariş notuna aynen yazın. Not boşsa Shopier alıcı e-postanız bu adresle aynı olmalıdır.</p>
            </div>

            {feedback && (
              <div className={`relative mt-4 rounded-xl border px-3.5 py-3 text-xs font-semibold leading-5 ${
                paymentStatus === 'success'
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                  : paymentStatus === 'error'
                    ? 'border-rose-400/25 bg-rose-400/10 text-rose-200'
                    : 'border-[#6EA8FF]/20 bg-[#3269C7]/10 text-[#CFE2FF]'
              }`} role="status">
                {feedback}
              </div>
            )}

            <div className="relative mt-5 space-y-2.5">
              {paymentStatus === 'success' ? (
                <button type="button" onClick={closeCheckout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/15 text-xs font-extrabold text-emerald-200 transition-all hover:bg-emerald-400/20 active:scale-[0.98]">
                  <CheckCircle2 size={17} /> Tamamlandı
                </button>
              ) : (
                <ShinyButton onClick={openPayment} disabled={!accountEmail} className="min-h-12 !rounded-2xl !px-5 !text-xs">
                  <span className="inline-flex items-center gap-2"><LockKeyhole size={15} /> Shopier ile Güvenli Öde</span>
                </ShinyButton>
              )}

              {(paymentStatus === 'pending' || paymentStatus === 'timeout') && (
                <button type="button" onClick={() => void checkPayment()} disabled={isChecking} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] text-xs font-bold text-[#DCE8F8] transition-all hover:bg-white/[0.09] active:scale-[0.98] disabled:opacity-60">
                  {isChecking ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} className="text-[#78ADFF]" />}
                  Bakiyeyi kontrol et
                </button>
              )}
            </div>

            <p className="relative mt-4 flex items-center justify-center gap-2 text-center text-[10px] font-semibold text-[#7186A3]">
              <LockKeyhole size={12} /> Kredi yalnız doğrulanmış Shopier bildirimiyle eklenir.
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
