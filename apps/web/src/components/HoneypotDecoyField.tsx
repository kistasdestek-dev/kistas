'use client';

import React, { useEffect, useRef } from 'react';

export interface HoneypotDecoyFieldProps {
  value: string;
  onChange: (value: string) => void;
  secondaryValue?: string;
  onChangeSecondary?: (value: string) => void;
  primaryFieldName?: string;
  secondaryFieldName?: string;
  onArmed?: (timestamp: number) => void;
}

/**
 * Pars DevState & Sayra Akıllı Çok Katmanlı Bal Küpü Form Tuzağı:
 * Ekran okuyuculardan ve insan gözünden gizlenmiş, ancak otomatik
 * botların, fuzzer ve spam crawler'ların doldurmaya çalıştığı cazip yem form alanları.
 */
export const HoneypotDecoyField: React.FC<HoneypotDecoyFieldProps> = ({
  value,
  onChange,
  secondaryValue = '',
  onChangeSecondary,
  primaryFieldName = 'decoy_alt_hp_field',
  secondaryFieldName = 'decoy_sec_hp_check',
  onArmed,
}) => {
  const onArmedRef = useRef(onArmed);

  useEffect(() => {
    onArmedRef.current = onArmed;
  }, [onArmed]);

  useEffect(() => {
    onArmedRef.current?.(Date.now());
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: '1px',
        height: '1px',
        opacity: '0.001',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 1. Birincil Cazip Yem Alanı: website (Spam & link botları hedefler) */}
      <input
        type="text"
        name={primaryFieldName}
        id={`hp_${primaryFieldName}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Web Site URL (${primaryFieldName})`}
        tabIndex={-1}
        autoComplete="off"
        style={{ width: '1px', height: '1px', fontSize: '1px', color: 'transparent' }}
      />

      {/* 2. İkincil Cazip Yem Alanı: contact_fax (Credential & form doldurucu botları hedefler) */}
      <input
        type="text"
        name={secondaryFieldName}
        id={`hp_${secondaryFieldName}`}
        value={secondaryValue}
        onChange={(e) => onChangeSecondary?.(e.target.value)}
        placeholder={`Contact Fax (${secondaryFieldName})`}
        tabIndex={-1}
        autoComplete="off"
        style={{ width: '1px', height: '1px', fontSize: '1px', color: 'transparent' }}
      />
    </div>
  );
};
