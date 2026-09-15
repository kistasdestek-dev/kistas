import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderBeam } from './BorderBeam';

interface MessageComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  label?: string;
  sendLabel?: string;
  maxLength?: number;
  minLength?: number;
  busy?: boolean;
  autoFocus?: boolean;
  leading?: React.ReactNode;
  onCancel?: () => void;
}

const COMPOSER_STYLE_ID = 'kistas-message-composer-styles';
const COMPOSER_CSS = `
.composer-surface {
  transition: border-color 0.22s ease, box-shadow 0.22s ease;
}
.composer-send-btn {
  transition: all 0.2s cubic-bezier(0.2, 0.9, 0.22, 1);
}
.composer-send-btn:hover:not(:disabled) {
  transform: scale(1.08);
}
`;

export function MessageComposer({
  value,
  onChangeText,
  onSend,
  placeholder = 'Bir mesaj yazın...',
  label = 'Mesaj yazma alanı',
  sendLabel = 'Mesajı gönder',
  maxLength = 2000,
  minLength = 1,
  busy = false,
  autoFocus,
  leading,
  onCancel,
}: MessageComposerProps) {
  const [focused, setFocused] = useState(false);
  const [height, setHeight] = useState(46);
  const input = useRef<TextInput>(null);
  const glow = useRef(new Animated.Value(0)).current;

  const canSend = value.trim().length >= minLength && !busy;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (!document.getElementById(COMPOSER_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = COMPOSER_STYLE_ID;
      style.textContent = COMPOSER_CSS;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    const animation = Animated.timing(glow, {
      toValue: focused ? 1 : 0,
      duration: 280,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [focused, glow]);

  useEffect(() => {
    if (!value) setHeight(46);
  }, [value]);

  // Use the browser key event so Shift+Enter and IME composition remain intact.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = input.current as unknown as HTMLTextAreaElement;
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      if (canSend) onSend();
    };
    element?.addEventListener('keydown', keydown);
    return () => element?.removeEventListener('keydown', keydown);
  }, [canSend, onSend]);

  return (
    <View style={styles.root}>
      <BorderBeam
        className="composer-beam"
        borderRadius={20}
        colorVariant="kistas"
        duration={12}
        size={200}
        borderWidth={1.5}
      >
        <View style={[styles.surface, focused && styles.focused]}>
          {/* Metin Alanı */}
          <TextInput
            ref={input}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            placeholderTextColor="#8C9BAB"
            accessibilityLabel={label}
            multiline
            autoFocus={autoFocus}
            maxLength={maxLength}
            textAlignVertical="top"
            returnKeyType="send"
            submitBehavior={Platform.OS === 'web' ? 'newline' : 'submit'}
            onSubmitEditing={Platform.OS !== 'web' ? () => { if (canSend) onSend(); } : undefined}
            onContentSizeChange={(event) =>
              setHeight(Math.min(180, Math.max(46, event.nativeEvent.contentSize.height)))
            }
            style={[styles.input, { height }]}
          />

          {/* Alt Araç Çubuğu */}
          <View style={styles.toolbar}>
            <View style={styles.leading}>
              {leading}
              {Platform.OS === 'web' && (
                <Text style={styles.hintText}>
                  <Text style={styles.hintKey}>Enter</Text> ile gönder • <Text style={styles.hintKey}>Shift+Enter</Text> yeni satır
                </Text>
              )}
            </View>

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                disabled={busy}
                style={styles.cancel}
                accessibilityRole="button"
                accessibilityLabel="Yanıtı iptal et"
              >
                <Ionicons name="close" size={18} color="#686474" />
              </TouchableOpacity>
            )}

            {/* Karakter sayacı (eğer metin girildiyse) */}
            {value.length > 0 && (
              <Text style={styles.counterText}>
                {value.length}/{maxLength}
              </Text>
            )}

            {/* Dairesel Yüksek Teknoloji Yukarı Ok Gönder Butonu (ArrowUp) */}
            <TouchableOpacity
              onPress={onSend}
              disabled={!canSend}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={sendLabel}
              style={[
                styles.sendBtn,
                canSend ? styles.sendBtnActive : styles.sendBtnDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={canSend ? '#FFFFFF' : '#8C9BAB'}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BorderBeam>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    minWidth: 0,
    position: 'relative',
  },
  surface: {
    width: '100%',
    padding: 10,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(50, 105, 199, 0.18)',
    boxShadow: '0 12px 32px -8px rgba(27, 58, 99, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.03)' as any,
  },
  focused: {
    borderColor: '#3269C7',
    boxShadow: '0 16px 40px -10px rgba(50, 105, 199, 0.16), 0 0 0 3px rgba(50, 105, 199, 0.10)' as any,
  },
  input: {
    width: '100%',
    minHeight: 46,
    maxHeight: 180,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '500',
    color: '#25364E',
    backgroundColor: 'transparent',
    letterSpacing: -0.01,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        resize: 'none',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      } as any,
    }),
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50, 105, 199, 0.08)',
  },
  leading: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  hintKey: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  counterText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
    marginRight: 10,
  },
  cancel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(50, 105, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(50, 105, 199, 0.12)',
  },
  sendBtnActive: {
    backgroundColor: '#3269C7',
    boxShadow: '0 4px 14px rgba(50, 105, 199, 0.40)' as any,
    transform: [{ scale: 1.04 }],
  },
});
