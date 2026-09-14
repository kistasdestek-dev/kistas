import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthService } from '../application/AuthService';

interface PasswordRecoveryScreenProps {
  onComplete: () => Promise<void>;
}

export function PasswordRecoveryScreen({ onComplete }: PasswordRecoveryScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    if (busy) return;
    if (password !== confirmation) {
      setMessage('Şifreler birbiriyle uyuşmuyor.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await AuthService.updateRecoveredPassword(password);
      if (result.success) {
        setPassword('');
        setConfirmation('');
        setCompleted(true);
        setMessage('Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.');
      } else {
        setMessage(result.error || 'Şifre güncellenemedi.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>Yeni şifre belirleyin</Text>
        <Text style={styles.description}>
          {completed ? 'Hesabınıza yeni şifrenizle giriş yapın.' : 'Hesabınız için en az 8 karakterli yeni bir şifre seçin.'}
        </Text>
        {!completed && (
          <>
            <TextInput
              accessibilityLabel="Yeni şifre"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Yeni şifre"
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Yeni şifreyi doğrula"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Yeni şifreyi doğrula"
              style={styles.input}
            />
          </>
        )}
        {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={completed ? onComplete : submit}
          style={[styles.button, busy && styles.disabled]}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={styles.buttonText}>{completed ? 'Giriş ekranına dön' : 'Şifreyi güncelle'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: '#D8E6F8' },
  title: { color: '#172B50', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  description: { color: '#526680', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  input: { backgroundColor: '#F7FAFF', borderWidth: 1, borderColor: '#C9D9EE', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16, color: '#172B50' },
  message: { color: '#3269C7', fontSize: 14, marginBottom: 14 },
  button: { backgroundColor: '#3269C7', borderRadius: 12, padding: 15, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
