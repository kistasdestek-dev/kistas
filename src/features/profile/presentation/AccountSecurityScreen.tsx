import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { kistasStyle, theme } from '../../../core/theme';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { KistasLogo } from '../../../shared/components/KistasLogo';
import { AuthService } from '../../auth/application/AuthService';
import { AccountSecurityOverview, AccountSecurityService } from '../application/AccountSecurityService';

interface AccountSecurityScreenProps { onBack: () => void; }
type Action = 'password' | 'sessions' | 'verify' | null;
type Feedback = { title: string; message: string; tone: 'success' | 'error' } | null;

const formatDate = (value: string | null): string => {
  if (!value) return 'Kayıt yok';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Kayıt yok';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

const providerLabel = (provider?: string): string => {
  if (provider === 'google') return 'Google hesabı';
  if (provider === 'github') return 'GitHub hesabı';
  if (provider === 'apple') return 'Apple hesabı';
  if (provider === 'phone') return 'Telefon numarası';
  return 'E-posta ve şifre';
};

const getPasswordStrength = (password: string): number => [
  password.length >= 8,
  /[a-z]/.test(password) && /[A-Z]/.test(password),
  /\d/.test(password),
  /[^A-Za-z0-9]/.test(password),
].filter(Boolean).length;

export const AccountSecurityScreen: React.FC<AccountSecurityScreenProps> = ({ onBack }) => {
  const [overview, setOverview] = useState<AccountSecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action>(null);
  const [confirmSessions, setConfirmSessions] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    const result = await AccountSecurityService.getOverview();
    if (result.success && result.data) setOverview(result.data);
    else setFeedback({ title: 'Güvenlik bilgileri alınamadı', message: result.error || 'Oturumunu kontrol edip tekrar deneyebilirsin.', tone: 'error' });
    setLoading(false);
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const isEmailLogin = !overview?.provider || overview.provider === 'email';
  const strength = getPasswordStrength(newPassword);
  const checks = useMemo(() => [
    { label: 'E-posta', value: overview?.emailVerified ? 'Doğrulandı' : 'Doğrulanmadı', complete: Boolean(overview?.emailVerified) },
    { label: 'Oturum', value: overview?.sessionActive ? 'Güvenli ve aktif' : 'Aktif değil', complete: Boolean(overview?.sessionActive) },
    { label: 'Giriş', value: providerLabel(overview?.provider), complete: Boolean(overview?.provider) },
  ], [overview]);

  const showResult = (success: boolean, title: string, successMessage: string, error?: string) => setFeedback({
    title: success ? title : 'İşlem tamamlanamadı',
    message: success ? successMessage : AuthService.localizeAuthError(error, 'Lütfen tekrar dene.'),
    tone: success ? 'success' : 'error',
  });

  const handleVerification = async () => {
    if (action) return;
    setAction('verify');
    const result = await AccountSecurityService.resendEmailVerification();
    setAction(null);
    showResult(result.success, 'Doğrulama e-postası gönderildi', `${overview?.email || 'E-posta'} adresindeki bağlantıyı açarak işlemi tamamlayabilirsin.`, result.error);
  };

  const closePasswordModal = () => {
    if (action === 'password') return;
    setPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setShowPasswords(false);
  };

  const handlePasswordChange = async () => {
    if (action) return;
    if (newPassword !== confirmPassword) {
      setFeedback({ title: 'Şifreler eşleşmiyor', message: 'Yeni şifre ve doğrulama alanı aynı olmalı.', tone: 'error' }); return;
    }
    if (strength < 3) {
      setFeedback({ title: 'Daha güçlü bir şifre seç', message: 'En az 8 karakterle birlikte büyük-küçük harf, sayı veya sembol kullan.', tone: 'error' }); return;
    }
    setAction('password');
    const result = await AccountSecurityService.changePassword(currentPassword, newPassword);
    setAction(null);
    if (result.success) closePasswordModal();
    showResult(result.success, 'Şifren güncellendi', 'Yeni şifren hemen kullanıma alındı.', result.error);
  };

  const handleCloseOtherSessions = async () => {
    if (action) return;
    setConfirmSessions(false); setAction('sessions');
    const result = await AccountSecurityService.signOutOtherSessions();
    setAction(null);
    showResult(result.success, 'Diğer oturumlar kapatıldı', 'Bu cihaz açık kaldı; diğer cihazlarda yeniden giriş gerekecek.', result.error);
  };

  return (
    <View style={styles.root}>
      <View style={styles.ambientTop} /><View style={styles.ambientBottom} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <GlassIconButton icon="chevron-back" size={43} iconSize={21} onPress={onBack} accessibilityLabel="Profile dön" />
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>PROFİL · GÜVENLİK MERKEZİ</Text><Text style={styles.title}>Hesabını koru</Text></View>
          <View style={styles.logoShell}><KistasLogo size={25} showWordmark={false} /></View>
        </View>

        <LinearGradient colors={[kistasStyle.neumorphism.surface, kistasStyle.neumorphism.global]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroIcon}>{loading ? <ActivityIndicator color="#3269C7" /> : <Ionicons name="shield-checkmark" size={32} color="#3269C7" />}</View>
          <View style={styles.heroCopy}><Text style={styles.heroKicker}>HESAP GÜVENLİĞİ</Text><Text style={styles.heroTitle}>{loading ? 'Kontrol ediliyor' : overview?.emailVerified ? 'Hesabın doğrulandı' : 'Bir adım kaldı'}</Text><Text style={styles.heroText}>{overview?.emailVerified ? 'E-posta kimliğin doğrulandı ve bu oturum geçerli.' : 'E-posta adresini doğrulayarak hesap kurtarmayı güvenceye al.'}</Text></View>
          {!loading && <View style={[styles.statePill, !overview?.emailVerified && styles.statePillPending]}><View style={[styles.stateDot, !overview?.emailVerified && styles.stateDotPending]} /><Text style={[styles.stateText, !overview?.emailVerified && styles.stateTextPending]}>{overview?.emailVerified ? 'KORUMALI' : 'EKSİK'}</Text></View>}
        </LinearGradient>

        <View style={styles.statusGrid}>{checks.map((item) => <View key={item.label} style={styles.statusCard}><Ionicons name={item.complete ? 'checkmark-circle' : 'alert-circle'} size={18} color={item.complete ? '#3269C7' : '#A57520'} /><View style={styles.statusCopy}><Text style={styles.statusLabel}>{item.label}</Text><Text style={styles.statusValue}>{loading ? 'Kontrol ediliyor' : item.value}</Text></View></View>)}</View>

        <Text style={styles.sectionLabel}>KİMLİK VE GİRİŞ</Text>
        <View style={styles.panel}>
          <View style={styles.infoRow}><GlassIconButton icon="mail-outline" size={42} iconSize={19} accessibilityLabel="E-posta" /><View style={styles.infoCopy}><Text style={styles.infoLabel}>Hesap e-postası</Text><Text style={styles.infoValue} numberOfLines={1}>{overview?.email || '—'}</Text></View>{!loading && <View style={styles.inlineState}><Ionicons name={overview?.emailVerified ? 'checkmark-circle' : 'time-outline'} size={15} color={overview?.emailVerified ? '#3269C7' : '#A57520'} /><Text style={[styles.inlineStateText, !overview?.emailVerified && styles.pendingText]}>{overview?.emailVerified ? 'Doğrulandı' : 'Bekliyor'}</Text></View>}</View>
          {!loading && !overview?.emailVerified && <TouchableOpacity style={styles.softAction} onPress={handleVerification} disabled={Boolean(action)}>{action === 'verify' ? <ActivityIndicator size="small" color="#3269C7" /> : <Ionicons name="paper-plane-outline" size={17} color="#3269C7" />}<Text style={styles.softActionText}>Doğrulama e-postasını yeniden gönder</Text></TouchableOpacity>}
          <View style={styles.divider} />
          <View style={styles.infoRow}><GlassIconButton icon="key-outline" size={42} iconSize={19} accessibilityLabel="Giriş yöntemi" /><View style={styles.infoCopy}><Text style={styles.infoLabel}>Giriş yöntemi</Text><Text style={styles.infoValue}>{providerLabel(overview?.provider)}</Text></View></View>
          {isEmailLogin ? <TouchableOpacity style={styles.primaryAction} onPress={() => setPasswordModal(true)} disabled={loading || Boolean(action)}><Ionicons name="lock-open-outline" size={18} color={kistasStyle.neumorphism.ink} /><Text style={styles.primaryActionText}>Şifreyi güvenle değiştir</Text></TouchableOpacity> : <View style={styles.providerNotice}><Ionicons name="information-circle-outline" size={17} color="#58749D" /><Text style={styles.providerNoticeText}>Şifre güvenliği {providerLabel(overview?.provider)} üzerinden yönetilir.</Text></View>}
        </View>

        <Text style={styles.sectionLabel}>OTURUM KONTROLÜ</Text>
        <View style={styles.panel}>
          <View style={styles.infoRow}><GlassIconButton icon="phone-portrait-outline" size={42} iconSize={19} accessibilityLabel="Bu cihaz" /><View style={styles.infoCopy}><Text style={styles.infoLabel}>Bu cihaz</Text><Text style={styles.infoValue}>{overview?.sessionActive ? 'Aktif oturum' : 'Oturum bulunamadı'}</Text><Text style={styles.infoMeta}>Son giriş · {formatDate(overview?.lastSignInAt || null)}</Text></View>{overview?.sessionActive && <View style={styles.liveDot} />}</View>
          <View style={styles.sessionMeta}><Ionicons name="time-outline" size={14} color="#6A7D99" /><Text style={styles.sessionMetaText}>Erişim yenileme zamanı · {formatDate(overview?.expiresAt || null)}</Text></View>
          <TouchableOpacity style={styles.outlineAction} onPress={() => setConfirmSessions(true)} disabled={loading || Boolean(action)}>{action === 'sessions' ? <ActivityIndicator size="small" color="#263A58" /> : <Ionicons name="log-out-outline" size={18} color="#263A58" />}<Text style={styles.outlineActionText}>Diğer cihazlardaki oturumları kapat</Text></TouchableOpacity>
        </View>
        <View style={styles.privacyNote}><Ionicons name="lock-closed" size={14} color="#3269C7" /><Text style={styles.privacyText}>Şifre ve oturum anahtarları cihaz ekranında hiçbir zaman gösterilmez.</Text></View>
      </ScrollView>

      <Modal visible={passwordModal} transparent animationType="fade" onRequestClose={closePasswordModal}><View style={styles.modalBackdrop}><BlurView intensity={55} tint="light" style={styles.modalCard}>
        <View style={styles.modalHeader}><GlassIconButton icon="key-outline" size={46} iconSize={21} accessibilityLabel="Şifre güvenliği" /><GlassIconButton icon="close" size={38} iconSize={19} onPress={closePasswordModal} disabled={action === 'password'} accessibilityLabel="Kapat" /></View>
        <Text style={styles.modalTitle}>Şifreni değiştir</Text><Text style={styles.modalText}>Mevcut şifreni doğrulayıp yeni şifreni doğrudan hesabına kaydederiz.</Text>
        <View style={styles.inputShell}><TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Mevcut şifre" placeholderTextColor="#8A96A8" secureTextEntry={!showPasswords} autoCapitalize="none" style={styles.input} /><GlassIconButton icon={showPasswords ? 'eye-off-outline' : 'eye-outline'} size={34} iconSize={17} onPress={() => setShowPasswords((value) => !value)} accessibilityLabel={showPasswords ? 'Şifreleri gizle' : 'Şifreleri göster'} /></View>
        <View style={styles.inputShell}><TextInput value={newPassword} onChangeText={setNewPassword} placeholder="Yeni şifre" placeholderTextColor="#8A96A8" secureTextEntry={!showPasswords} autoCapitalize="none" style={styles.input} /></View>
        <View style={styles.strengthRow}>{[1, 2, 3, 4].map((level) => <View key={level} style={[styles.strengthBar, strength >= level && styles.strengthBarActive]} />)}</View><Text style={styles.strengthText}>{strength < 3 ? 'En az 8 karakter; büyük-küçük harf, sayı veya sembol kullan.' : 'Güçlü şifre'}</Text>
        <View style={styles.inputShell}><TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Yeni şifreyi doğrula" placeholderTextColor="#8A96A8" secureTextEntry={!showPasswords} autoCapitalize="none" style={styles.input} /></View>
        <TouchableOpacity style={[styles.primaryAction, styles.modalSubmit, (!currentPassword || !newPassword || !confirmPassword) && styles.disabled]} onPress={handlePasswordChange} disabled={action === 'password' || !currentPassword || !newPassword || !confirmPassword}>{action === 'password' ? <ActivityIndicator size="small" color={kistasStyle.neumorphism.ink} /> : <Ionicons name="shield-checkmark-outline" size={18} color={kistasStyle.neumorphism.ink} />}<Text style={styles.primaryActionText}>Yeni şifreyi kaydet</Text></TouchableOpacity>
      </BlurView></View></Modal>

      <Modal visible={confirmSessions} transparent animationType="fade" onRequestClose={() => setConfirmSessions(false)}><View style={styles.modalBackdrop}><BlurView intensity={55} tint="light" style={[styles.modalCard, styles.centeredModal]}><GlassIconButton icon="phone-portrait-outline" size={50} iconSize={23} accessibilityLabel="Oturum güvenliği" /><Text style={styles.modalTitle}>Diğer oturumlar kapatılsın mı?</Text><Text style={styles.modalText}>Bu cihaz açık kalır. Diğer tüm cihazlarda yeniden giriş yapılması gerekir.</Text><View style={styles.modalActions}><TouchableOpacity style={styles.cancelAction} onPress={() => setConfirmSessions(false)}><Text style={styles.cancelActionText}>Vazgeç</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryAction, styles.confirmAction]} onPress={handleCloseOtherSessions}><Text style={styles.primaryActionText}>Oturumları kapat</Text></TouchableOpacity></View></BlurView></View></Modal>

      <Modal visible={Boolean(feedback)} transparent animationType="fade" onRequestClose={() => setFeedback(null)}><View style={styles.modalBackdrop}><BlurView intensity={55} tint="light" style={[styles.modalCard, styles.centeredModal]}><GlassIconButton icon={feedback?.tone === 'error' ? 'alert-outline' : 'checkmark'} iconColor={feedback?.tone === 'error' ? '#B73750' : '#3269C7'} size={50} iconSize={23} accessibilityLabel={feedback?.title} /><Text style={styles.modalTitle}>{feedback?.title}</Text><Text style={styles.modalText}>{feedback?.message}</Text><TouchableOpacity style={[styles.primaryAction, styles.feedbackAction]} onPress={() => setFeedback(null)}><Text style={styles.primaryActionText}>Tamam</Text></TouchableOpacity></BlurView></View></Modal>
    </View>
  );
};

const kistasText = theme.typography.kistas;
const neo = kistasStyle.neumorphism;
const neoRaised = {
  backgroundColor: neo.surface,
  borderWidth: 1,
  borderColor: neo.border,
  ...Platform.select({
    web: { boxShadow: '-8px -8px 18px rgba(255,255,255,0.92), 8px 8px 18px rgba(130,146,168,0.20)' },
    default: { shadowColor: neo.shadow, shadowOffset: { width: 7, height: 9 }, shadowOpacity: 0.2, shadowRadius: 18, elevation: 5 },
  }),
} as any;
const neoInset = {
  backgroundColor: '#EDF2F8',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.86)',
  ...Platform.select({ web: { boxShadow: 'inset 3px 3px 8px rgba(130,146,168,0.14), inset -4px -4px 9px rgba(255,255,255,0.90)' } }),
} as any;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: neo.surface, overflow: 'hidden' },
  ambientTop: { pointerEvents: 'none', position: 'absolute', width: 360, height: 360, borderRadius: 180, top: -190, right: -110, backgroundColor: 'rgba(50,105,199,0.10)' },
  ambientBottom: { pointerEvents: 'none', position: 'absolute', width: 280, height: 280, borderRadius: 140, bottom: -170, left: -100, backgroundColor: 'rgba(156,64,255,0.06)' },
  content: { width: '100%', maxWidth: 820, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 54 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 }, headerCopy: { flex: 1, marginLeft: 14 },
  eyebrow: { ...kistasText, color: '#6D83A3', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }, title: { color: '#202D43', fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -0.55, marginTop: 3 },
  logoShell: { ...neoRaised, width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hero: { ...neoRaised, minHeight: 150, borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center' },
  heroIcon: { ...neoRaised, width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F0FC' },
  heroCopy: { flex: 1, minWidth: 0, marginHorizontal: 17 }, heroKicker: { ...kistasText, color: '#3269C7', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, heroTitle: { color: '#202D43', fontSize: 22, fontWeight: '800', letterSpacing: -0.35, marginTop: 5 }, heroText: { color: '#61718A', fontSize: 12.5, lineHeight: 19, marginTop: 5 },
  statePill: { ...neoInset, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }, statePillPending: { backgroundColor: '#F3EBDD' }, stateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3269C7' }, stateDotPending: { backgroundColor: '#A57520' }, stateText: { ...kistasText, color: '#3269C7', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }, stateTextPending: { color: '#8A621B' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18, marginBottom: 31 }, statusCard: { ...neoRaised, flexGrow: 1, flexBasis: 190, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 16 }, statusCopy: { flex: 1 }, statusLabel: { ...kistasText, color: '#7A8AA1', fontSize: 9.5, fontWeight: '700' }, statusValue: { ...kistasText, color: '#263A58', fontSize: 11.5, fontWeight: '800', marginTop: 3 },
  sectionLabel: { ...kistasText, color: '#3269C7', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.85, marginLeft: 4, marginBottom: 12 }, panel: { ...neoRaised, borderRadius: 22, padding: 18, marginBottom: 28 },
  infoRow: { flexDirection: 'row', alignItems: 'center' }, infoCopy: { flex: 1, minWidth: 0, marginLeft: 13 }, infoLabel: { ...kistasText, color: '#71829A', fontSize: 10, fontWeight: '700' }, infoValue: { color: '#202D43', fontSize: 13.5, fontWeight: '800', marginTop: 3 }, infoMeta: { ...kistasText, color: '#7387A5', fontSize: 10, marginTop: 4 },
  inlineState: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }, inlineStateText: { ...kistasText, color: '#3269C7', fontSize: 10, fontWeight: '800' }, pendingText: { color: '#8A621B' }, divider: { height: 1, backgroundColor: 'rgba(50,105,199,0.09)', marginVertical: 17 },
  softAction: { ...neoInset, minHeight: 42, borderRadius: 13, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, softActionText: { ...kistasText, color: '#3269C7', fontWeight: '800' },
  providerNotice: { ...neoInset, minHeight: 44, borderRadius: 14, marginTop: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, providerNoticeText: { ...kistasText, color: '#58749D', fontSize: 11, textAlign: 'center' },
  primaryAction: { ...neoRaised, minHeight: 48, borderRadius: 14, marginTop: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: neo.global }, primaryActionText: { ...kistasText, color: neo.ink, fontSize: 12, fontWeight: '900' },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(50,105,199,0.08)' }, sessionMetaText: { ...kistasText, color: '#6A7D99', fontSize: 10 }, liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#38A17B', shadowColor: '#38A17B', shadowOpacity: 0.38, shadowRadius: 7 },
  outlineAction: { ...neoInset, minHeight: 46, borderRadius: 14, marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, outlineActionText: { ...kistasText, color: '#263A58', fontSize: 12, fontWeight: '800' }, privacyNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 }, privacyText: { ...kistasText, color: '#6D83A3', fontSize: 10.5, lineHeight: 16, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(33,50,73,0.28)', alignItems: 'center', justifyContent: 'center', padding: 20 }, modalCard: { ...neoRaised, width: '100%', maxWidth: 430, overflow: 'hidden', padding: 22, borderRadius: 24 }, centeredModal: { alignItems: 'center' }, modalHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }, modalTitle: { color: '#202D43', fontSize: 19, fontWeight: '800', letterSpacing: -0.25, textAlign: 'center', marginTop: 15 }, modalText: { color: '#66758B', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 16 },
  inputShell: { ...neoInset, minHeight: 48, flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 13, borderRadius: 14 }, input: { flex: 1, color: '#202D43', fontSize: 13, paddingVertical: 12, outlineStyle: 'none' } as any,
  strengthRow: { flexDirection: 'row', gap: 5, marginTop: 10 }, strengthBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#DDE5F0' }, strengthBarActive: { backgroundColor: '#3269C7' }, strengthText: { ...kistasText, color: '#71829A', fontSize: 9.5, lineHeight: 14, marginTop: 7 }, modalSubmit: { width: '100%', marginTop: 18 },
  modalActions: { width: '100%', flexDirection: 'row', gap: 12, marginTop: 3 }, cancelAction: { ...neoInset, flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, cancelActionText: { ...kistasText, color: '#394B65', fontWeight: '800' }, confirmAction: { flex: 1.45, marginTop: 0 }, feedbackAction: { width: '100%', marginTop: 3 }, disabled: { opacity: 0.45 },
});
