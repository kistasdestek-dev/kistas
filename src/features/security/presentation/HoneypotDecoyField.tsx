import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface HoneypotDecoyFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  fieldName?: string;
}

/**
 * Pars DevState & Sayra Bal Küpü Form Tuzağı:
 * Ekran okuyuculardan ve insan gözünden gizlenmiş, ancak otomatik
 * botların / fuzzer crawler'ların otomatik doldurduğu yem form alanı.
 */
export const HoneypotDecoyField: React.FC<HoneypotDecoyFieldProps> = ({
  value,
  onChangeText,
  fieldName = 'kistas_sec_verification_token',
}) => {
  return (
    <View
      style={styles.decoyContainer}
      aria-hidden={true}
      importantForAccessibility="no"
      accessibilityElementsHidden={true}
      pointerEvents="none"
    >
      <TextInput
        style={styles.decoyInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={`Do not fill this field (${fieldName})`}
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
    width: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  decoyInput: {
    width: 0,
    height: 0,
    fontSize: 1,
    color: 'transparent',
  },
});
