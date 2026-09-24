'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface LegalDoc {
  id: string;
  title: string;
  required: boolean;
  text: string;
}

export const LEGAL_DOCUMENTS: LegalDoc[] = [
  {
    id: 'kvkk',
    title: 'KVKK Aydınlatma Metni',
    required: true,
    text: `6698 Sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında; Kıstas Platformu ("Kıstas") olarak veri sorumlusu sıfatıyla, kullanıcılarımıza ait ad, soyad, e-posta adresi, profil ve vitrin etkileşim verilerini; platform hizmetlerinin sunulması, kullanıcı deneyiminin kişiselleştirilmesi, hesap güvenliğinin temin edilmesi ve yasal yükümlülüklerin ifası amacıyla işlemekteyiz.

Verileriniz, uluslararası ISO/IEC 27001 ve Pars DevState banka düzeyi şifreleme ve siber savunma kalkanı standartlarına tam uyumlu altyapılarda barındırılmakta olup, yasal mercilerin açık talebi haricinde hiçbir üçüncü taraf veya reklam ağı ile ticari amaçla paylaşılmaz.`,
  },
  {
    id: 'consent',
    title: 'Kişisel Veriler Açık Rıza Metni',
    required: false,
    text: `Profil ve vitrin etkileşim verilerimin; platform deneyimini geliştirmek, vitrinde öne çıkan projeler ve kişiselleştirilmiş teknoloji lansman önerileri sunmak ve analitik süreçleri yürütmek amacıyla işlenmesine özgür irademle açık rıza veriyorum.`,
  },
  {
    id: 'commercial',
    title: 'Ticari Elektronik İleti İzni',
    required: false,
    text: `Kıstas ekosistemindeki yeni projeler, vitrin lansmanları, geliştirici ödülleri ve haftalık bülten güncellemelerinin e-posta kanallarıyla tarafıma iletilmesini kabul ediyorum. İstediğim zaman profil ayarlarımdan bu izni geri alabileceğimi biliyorum.`,
  },
];

export interface LegalModalProps {
  doc: LegalDoc | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ doc, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (doc) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#192A42]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#CBD9EC] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E2EDFC]">
          <h2 id="legal-modal-title" className="text-base sm:text-lg font-bold text-[#25364E]">
            {doc.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#526680] hover:bg-[#F1F6FD] hover:text-[#25364E] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 text-xs sm:text-sm leading-relaxed text-[#526680] whitespace-pre-line">
          {doc.text}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#EAF2FC] px-6 py-2 text-xs sm:text-sm font-semibold text-[#2E5996] hover:bg-[#DDE9F9] transition-colors"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
};
