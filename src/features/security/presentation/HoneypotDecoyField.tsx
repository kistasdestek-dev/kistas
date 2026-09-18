import React, { useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

export interface HoneypotDecoyFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  secondaryValue?: string;
  onChangeSecondaryText?: (text: string) => void;
  primaryFieldName?: string;
  secondaryFieldName?: string;
  onArmed?: (timestamp: number) => void;
}

/**
 * Pars DevState & Sayra Akıllı Çok Katmanlı Bal Küpü Form Tuzağı:
 * Ekran okuyuculardan ve insan gözünden gizlenmiş, ancak otomatik
 * botların, fuzzer ve spam crawler'ların otomatik doldurduğu cazip yem form alanları.
 */
export const HoneypotDecoyField: React.FC<HoneypotDecoyFieldProps> = ({
  value,
  onChangeText,
  secondaryValue = '',
  onChangeSecondaryText,
  primaryFieldName = 'website',
  secondaryFieldName = 'contact_fax',
  onArmed,
}) => {
  useEffect(() => {
    if (onArmed) {
      onArmed(Date.now());
    }
  }, [onArmed]);

  return (
    <View
      style={styles.decoyContainer}
      aria-hidden={true}
      importantForAccessibility="no"
      accessibilityElementsHidden={true}
      pointerEvents="none"
    >
      {/* 1. Birincil Cazip Yem Alanı: website (Spam & link botları hedefler) */}
      <TextInput
        style={styles.decoyInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={`Web Site URL (${primaryFieldName})`}
        tabIndex={-1}
        autoComplete="off"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {/* 2. İkincil Cazip Yem Alanı: contact_fax (Credential & form doldurucu botları hedefler) */}
      <TextInput
        style={styles.decoyInput}
        value={secondaryValue}
        onChangeText={onChangeSecondaryText || (() => {})}
        placeholder={`Contact Fax (${secondaryFieldName})`}
        tabIndex={-1}
        autoComplete="off"
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  decoyContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1,
    opacity: 0.001,
    overflow: 'hidden',
  },
  decoyInput: {
    width: 1,
    height: 1,
    fontSize: 1,
    color: 'transparent',
  },
});

