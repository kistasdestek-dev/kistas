'use client';

import React from 'react';
import { X, Receipt, PlusCircle, Sparkles, Gift, RotateCcw, Loader2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="k-modal-glass-card w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-amber-500/20 via-[#3B82F6]/10 to-transparent blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <GlassIconButton icon={Receipt} size={42} iconSize={19} ariaLabel="Kredi hareketleri" />
            <div>
              <p className="text-[10px] font-bold tracking-wider text-[#A1A1AA] uppercase">
                KISTAS CÜZDANI
              </p>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Kredi Hareketleri
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md cursor-pointer shadow-xs"
          >
            <X size={16} />
          </button>
        </div>

        {/* Balance Summary Card */}
        <div className="mx-6 mt-4 p-4 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">
              Güncel Bakiye
            </p>
            <p className="text-2xl font-black text-white tracking-tight">
              {boostCredits.toLocaleString('tr-TR')} <span className="text-sm font-semibold text-[#60A5FA]">kredi</span>
            </p>
          </div>
          <span className="text-xs font-bold text-[#60A5FA] bg-[#3269C7]/20 px-3 py-1.5 rounded-xl border border-[#3269C7]/30">
            Son {transactions.length} işlem
          </span>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#A1A1AA]">
              <Loader2 size={24} className="animate-spin text-[#3269C7]" />
              <span>Kredi hareketleri yükleniyor...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#161616]">
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
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-white/10 bg-[#141414]"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      isCreditIn
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
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
                        {isCreditIn ? '+' : '−'}{Math.abs(transaction.amount).toLocaleString('tr-TR')} kredi
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
