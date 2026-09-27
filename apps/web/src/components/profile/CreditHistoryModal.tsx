'use client';

import React from 'react';
import { X, Receipt, PlusCircle, Sparkles, Gift, RotateCcw, Loader2, WalletCards, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { GlassIconButton } from '../GlassIconButton';

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

const formatTransactionDate = (isoString: string): string => {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
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

export const CreditHistoryModal: React.FC<CreditHistoryModalProps> = ({
  isOpen,
  boostCredits,
  transactions,
  isLoading,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#020712]/80 p-0 backdrop-blur-xl animate-in fade-in duration-200 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="k-modal-glass-card relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none border-b-0 bg-[linear-gradient(155deg,rgba(17,35,64,.98),rgba(5,13,28,.99)_58%,rgba(9,19,38,.99))] shadow-[0_-20px_70px_rgba(0,0,0,.55),0_0_55px_rgba(50,105,199,.14),inset_0_1px_0_rgba(255,255,255,.12)] sm:rounded-[28px] sm:border-b"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#3269C7]/25 blur-[72px]" />
        <div className="pointer-events-none absolute -right-20 top-24 h-44 w-44 rounded-full bg-amber-400/10 blur-[64px]" />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <GlassIconButton icon={WalletCards} size={42} iconSize={19} ariaLabel="Kredi hareketleri" />
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#78ADFF] uppercase">
                KISTAS CÜZDANI
              </p>
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Kredi Hareketleri
              </h3>
            </div>
          </div>
          <GlassIconButton
            icon={X}
            onClick={onClose}
            size={34}
            iconSize={16}
            iconColor="#DCE8F8"
            ariaLabel="Kredi hareketlerini kapat"
            className="!border-white/15 !bg-white/[0.08] !shadow-[inset_0_1px_0_rgba(255,255,255,.1)]"
          />
        </div>

        <div className="relative mx-5 mt-5 overflow-hidden rounded-[22px] border border-[#6EA8FF]/25 bg-[linear-gradient(135deg,rgba(44,91,170,.3),rgba(12,27,52,.7)_55%,rgba(255,255,255,.06))] p-5 shadow-[0_18px_45px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.13)] backdrop-blur-2xl sm:mx-6">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/10 bg-[#60A5FA]/10 blur-sm" />
          <div className="relative flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#AFC8EA]">Güncel bakiye</p>
              <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-white">
                {boostCredits.toLocaleString('tr-TR')}
                <span className="ml-2 text-sm font-bold tracking-normal text-[#78ADFF]">kredi</span>
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.09] text-[#78ADFF] shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
              <Sparkles size={19} />
            </div>
          </div>
          <div className="relative mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] font-semibold text-[#91A6C5]">
            <span>Güvenli Kıstas kredi defteri</span>
            <span className="rounded-full border border-[#6EA8FF]/20 bg-[#3269C7]/15 px-2.5 py-1 text-[#9BC2FF]">{transactions.length} işlem</span>
          </div>
        </div>

        <div className="relative flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-6 pt-4 sm:px-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#A1A1AA]">
              <Loader2 size={24} className="animate-spin text-[#3269C7]" />
              <span>Kredi hareketleri yükleniyor...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#6EA8FF]/20 bg-[#3269C7]/10 shadow-[0_12px_30px_rgba(50,105,199,.16)]">
                <Receipt size={24} className="text-[#60A5FA]" />
              </div>
              <p className="text-sm font-bold text-white">
                Henüz kredi hareketiniz bulunmuyor.
              </p>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Kredi yüklemeleriniz veya vitrin kullanımlarınız burada listelenecektir.
              </p>
            </div>
          ) : (
            transactions.map((transaction) => {
              const Icon = getTransactionIcon(transaction.type);
              const isCreditIn = transaction.amount >= 0;
              const destination = transaction.type === 'purchase'
                ? 'Shopier üzerinden güvenli kredi alımı'
                : transaction.metadata?.listingTitle
                  ? `${transaction.metadata.listingTitle} · ${transaction.metadata.scope === 'category' ? 'Kategori vitrini' : 'Keşfet vitrini'}${transaction.metadata.durationHours ? ` · ${transaction.metadata.durationHours} saat` : ''}`
                  : transaction.description || 'Vitrin kullanımı';

              return (
                <div
                  key={transaction.id}
                  className="group flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6EA8FF]/25 hover:bg-white/[0.075] hover:shadow-[0_12px_30px_rgba(0,0,0,.18)]"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,.08)] ${
                      isCreditIn
                        ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                        : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white">
                        {getTransactionTitle(transaction.type)}
                      </p>
                      <span
                        className={`text-xs font-black tracking-tight ${
                          isCreditIn ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isCreditIn ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {isCreditIn ? '+' : '−'}{Math.abs(transaction.amount).toLocaleString('tr-TR')} kredi
                        </span>
                      </span>
                    </div>

                    <p className="mt-0.5 text-[11px] text-[#A1A1AA]">
                      {destination}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#71717A] border-t border-white/10 pt-1.5">
                      <span>{formatTransactionDate(transaction.created_at)}</span>
                      {transaction.balance_after !== undefined && (
                        <span>Bakiye: {transaction.balance_after.toLocaleString('tr-TR')} kredi</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
