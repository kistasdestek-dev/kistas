'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Loader2,
  PlusCircle,
  Receipt,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';
import { ShinyButton } from '../ui/shiny-button';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export interface CreditTransactionItem {
  id: string;
  type: 'purchase' | 'spend_boost' | 'reward' | 'refund';
  amount: number;
  balance_after?: number;
  description?: string;
  metadata?: {
    listingTitle?: string;
    scope?: string;
    durationHours?: number;
    amountMinor?: number;
    currency?: string;
  };
  created_at: string;
}

interface CreditHistoryModalProps {
  isOpen: boolean;
  boostCredits: number;
  transactions: CreditTransactionItem[];
  isLoading: boolean;
  onClose: () => void;
}

type CreditHistoryFilter = 'all' | 'in' | 'out';

const formatTransactionTime = (isoString: string): string => {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return '';
  }
};

const getTransactionDay = (isoString: string): { key: string; label: string } => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return { key: isoString, label: 'Tarih bilgisi yok' };

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (dayDifference === 0) return { key: startOfDate.toISOString(), label: 'Bugün' };
  if (dayDifference === 1) return { key: startOfDate.toISOString(), label: 'Dün' };

  return {
    key: startOfDate.toISOString(),
    label: new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    }).format(date),
  };
};

const getTransactionTitle = (type: CreditTransactionItem['type']): string => {
  if (type === 'purchase') return 'Kredi yüklemesi';
  if (type === 'spend_boost') return 'Vitrin kullanımı';
  if (type === 'reward') return 'Kredi ödülü';
  return 'Kredi iadesi';
};

const getTransactionIcon = (type: CreditTransactionItem['type']) => {
  if (type === 'purchase') return PlusCircle;
  if (type === 'spend_boost') return Sparkles;
  if (type === 'reward') return Gift;
  return RotateCcw;
};

const getTransactionDestination = (transaction: CreditTransactionItem): string => {
  if (transaction.type === 'purchase') return 'Shopier üzerinden güvenli kredi alımı';
  if (transaction.metadata?.listingTitle) {
    const scope = transaction.metadata.scope === 'category' ? 'Kategori vitrini' : 'Keşfet vitrini';
    const duration = transaction.metadata.durationHours ? ` · ${transaction.metadata.durationHours} saat` : '';
    return `${transaction.metadata.listingTitle} · ${scope}${duration}`;
  }
  return transaction.description || 'Kıstas kredi hareketi';
};

export const CreditHistoryModal: React.FC<CreditHistoryModalProps> = ({
  isOpen,
  boostCredits,
  transactions,
  isLoading,
  onClose,
}) => {
  const [filter, setFilter] = useState<CreditHistoryFilter>('all');
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const filteredTransactions = useMemo(() => {
    const selected = transactions.filter((transaction) => {
      if (filter === 'in') return transaction.amount >= 0;
      if (filter === 'out') return transaction.amount < 0;
      return true;
    });

    return [...selected].sort((left, right) => {
      const leftTime = Date.parse(left.created_at);
      const rightTime = Date.parse(right.created_at);
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });
  }, [filter, transactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, { label: string; items: CreditTransactionItem[] }>();

    filteredTransactions.forEach((transaction) => {
      const day = getTransactionDay(transaction.created_at);
      const current = groups.get(day.key);
      if (current) {
        current.items.push(transaction);
      } else {
        groups.set(day.key, { label: day.label, items: [transaction] });
      }
    });

    return [...groups.entries()].map(([key, value]) => ({ key, ...value }));
  }, [filteredTransactions]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000000] flex items-end justify-center overscroll-none bg-[#020712]/82 p-0 backdrop-blur-xl animate-in fade-in duration-200 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-history-title"
        className="k-modal-glass-card relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none border-b-0 bg-[linear-gradient(155deg,rgba(16,34,62,.99),rgba(5,13,28,.995)_58%,rgba(8,19,35,.99))] shadow-[0_-24px_80px_rgba(0,0,0,.62),0_0_60px_rgba(50,105,199,.14),inset_0_1px_0_rgba(255,255,255,.12)] sm:rounded-[28px] sm:border-b"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-60 w-60 rounded-full bg-[#3269C7]/20 blur-[76px]" />
        <div className="pointer-events-none absolute -right-20 top-28 h-48 w-48 rounded-full bg-[#E4FD97]/[0.07] blur-[68px]" />

        <header className="relative flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 id="credit-history-title" className="text-xl font-black tracking-tight text-white">Kredi Hareketleri</h2>
          </div>
          <GlassIconButton
            icon={X}
            onClick={onClose}
            size={34}
            iconSize={16}
            iconColor="#DCE8F8"
            ariaLabel="Kredi hareketlerini kapat"
            variant="glass"
            className="!border-transparent !bg-white/[0.06] hover:!bg-white/[0.12]"
          />
        </header>

        <div className="relative px-5 pt-5 sm:px-6">
          <div className="relative overflow-hidden rounded-[22px] border border-[#6EA8FF]/20 bg-[linear-gradient(135deg,rgba(44,91,170,.28),rgba(10,26,49,.82)_52%,rgba(228,253,151,.055))] p-4 shadow-[0_18px_44px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.12)] sm:p-5">
            <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#E4FD97]/[0.08] blur-2xl" />
            <div className="relative flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#AFC8EA]">Kullanılabilir bakiye</p>
                <p className="mt-1 text-3xl font-black tracking-[-0.045em] text-white">
                  {boostCredits.toLocaleString('tr-TR')}
                  <span className="ml-2 text-sm font-bold tracking-normal text-[#78ADFF]">kredi</span>
                </p>
              </div>
              <ShinyButton href="/credits" onClick={onClose} className="shiny-cta--citrus !min-h-10 !w-auto !px-4 !py-2 !text-[11px]">
                Kredi Al
              </ShinyButton>
            </div>
            <div className="relative mt-4 flex items-center justify-end border-t border-white/10 pt-3 text-[10px] font-semibold text-[#91A6C5]">
              <span>{transactions.length.toLocaleString('tr-TR')} işlem</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-white/[0.08] bg-black/20 p-1" role="group" aria-label="Kredi hareketi filtresi">
            {([
              ['all', 'Tümü'],
              ['in', 'Gelen'],
              ['out', 'Kullanılan'],
            ] as const).map(([value, label]) => {
              const isActive = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={isActive}
                  className={`min-h-9 rounded-lg px-2 text-[11px] font-bold transition-all ${isActive
                    ? 'border border-[#E4FD97]/25 bg-[#E4FD97]/[0.09] text-[#E4FD97] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]'
                    : 'border border-transparent text-[#8291A8] hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 [-webkit-overflow-scrolling:touch] sm:px-6">
          {isLoading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-xs text-[#A1A1AA]">
              <Loader2 size={24} className="animate-spin text-[#78ADFF]" />
              <span>Kredi hareketleri yükleniyor...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#6EA8FF]/20 bg-[#3269C7]/10 text-[#78ADFF]">
                <Receipt size={22} />
              </div>
              <p className="mt-3 text-sm font-bold text-white">
                {transactions.length === 0 ? 'Henüz kredi hareketiniz bulunmuyor.' : 'Bu filtrede hareket bulunmuyor.'}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-[#8A98AC]">
                {transactions.length === 0
                  ? 'Kredi yüklemeleriniz, ödülleriniz ve vitrin kullanımlarınız burada listelenecek.'
                  : 'Diğer kredi hareketlerini görmek için farklı bir filtre seçin.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedTransactions.map((group) => (
                <section key={group.key} aria-labelledby={`credit-day-${group.key}`}>
                  <h3 id={`credit-day-${group.key}`} className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#718096]">
                    {group.label}
                  </h3>
                  <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,.045)]">
                    {group.items.map((transaction, index) => {
                      const Icon = getTransactionIcon(transaction.type);
                      const isCreditIn = transaction.amount >= 0;

                      return (
                        <article
                          key={transaction.id}
                          className={`relative flex items-start gap-3 px-3 py-3.5 sm:px-4 ${index > 0 ? 'border-t border-white/[0.08]' : ''}`}
                        >
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${isCreditIn
                            ? 'border-[#E4FD97]/20 bg-[#E4FD97]/[0.07] text-[#E4FD97]'
                            : 'border-amber-300/20 bg-amber-300/[0.07] text-amber-300'
                          }`}>
                            <Icon size={16} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="truncate text-xs font-extrabold text-white">{getTransactionTitle(transaction.type)}</h4>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#929FB1]">{getTransactionDestination(transaction)}</p>
                              </div>
                              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${isCreditIn
                                ? 'border-[#E4FD97]/25 bg-[#E4FD97]/[0.07] text-[#E4FD97]'
                                : 'border-amber-300/20 bg-amber-300/[0.07] text-amber-300'
                              }`}>
                                {isCreditIn ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                                {isCreditIn ? '+' : '−'}{Math.abs(transaction.amount).toLocaleString('tr-TR')}
                              </span>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-[#66758A]">
                              <time dateTime={transaction.created_at}>{formatTransactionTime(transaction.created_at)}</time>
                              {transaction.balance_after !== undefined && (
                                <span>İşlem sonrası {transaction.balance_after.toLocaleString('tr-TR')} kredi</span>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
