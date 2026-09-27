'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

interface MessageNotificationSettingsProps {
  userId: string;
  compact?: boolean;
}

export const MessageNotificationSettings: React.FC<MessageNotificationSettingsProps> = ({
  userId,
  compact = false,
}) => {
  const supabase = useMemo(() => createClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('notification_preferences')
      .select('message_in_app_enabled')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setEnabled(data?.message_in_app_enabled !== false);
        setIsLoading(false);
      });

    const handlePreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === 'boolean') setEnabled(detail.enabled);
    };
    window.addEventListener('kistas:message-notification-preference', handlePreferenceChange);
    return () => {
      active = false;
      window.removeEventListener('kistas:message-notification-preference', handlePreferenceChange);
    };
  }, [supabase, userId]);

  const handleToggle = async () => {
    if (isSaving) return;
    const nextEnabled = !enabled;
    setIsSaving(true);
    const { error } = await supabase.rpc('set_message_notification_preference', {
      p_enabled: nextEnabled,
    });
    if (!error) {
      setEnabled(nextEnabled);
      window.dispatchEvent(new CustomEvent('kistas:message-notification-preference', {
        detail: { enabled: nextEnabled },
      }));
    }
    setIsSaving(false);
  };

  const Icon = enabled ? Bell : BellOff;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.07] text-[#B9CBE6] transition-colors hover:bg-white/[0.12] hover:text-white cursor-pointer ${compact ? 'h-10 w-10' : 'h-9 px-3.5 text-xs font-semibold'}`}
        aria-label="Mesaj bildirim ayarları"
        aria-expanded={isOpen}
      >
        {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
        {!compact && <span>{enabled ? 'Bildirimler açık' : 'Bildirimler kapalı'}</span>}
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-56 rounded-2xl border border-[#6EA8FF]/25 bg-[linear-gradient(145deg,rgba(18,37,66,.96),rgba(7,17,34,.98))] p-2 shadow-[0_20px_55px_rgba(0,0,0,.55),0_0_34px_rgba(50,105,199,.16),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-2xl ${compact ? 'bottom-14 right-0' : 'right-0 top-12'}`}>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={isLoading || isSaving}
            onClick={handleToggle}
            className="group flex min-h-11 w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.06] px-3.5 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.06)] transition-all duration-200 hover:border-[#6EA8FF]/25 hover:bg-white/[0.1] active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <span className="text-xs font-bold text-[#F8FAFC]">
              {enabled ? 'Bildirimleri kapat' : 'Bildirimleri aç'}
            </span>
            <span className={`relative h-6 w-11 rounded-full border transition-all duration-300 ${enabled ? 'border-[#78ADFF]/45 bg-[#3269C7] shadow-[0_0_18px_rgba(59,130,246,.38)]' : 'border-white/10 bg-[#334155]'}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-[0_2px_7px_rgba(0,0,0,.35)] transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
