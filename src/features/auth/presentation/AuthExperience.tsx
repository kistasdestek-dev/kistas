import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { LoginAvatarVideo } from './LoginAvatarVideo';
import { Typewriter } from '../../../shared/components/Typewriter';
import { AuthService } from '../application/AuthService';
import { UserProfile } from '../domain/User';
import { installAuthAutofillStyles } from './authAutofillStyles';

const LOGIN_TYPEWRITER_WORDS = [
  'Geleceğin projelerini keşfedin.',
  'Fikirlerinizi vitrine taşıyın.',
  'İlham veren ürünleri inceleyin.',
  'Dijital ekosisteme yön verin.',
];

const REGISTER_TYPEWRITER_WORDS = [
  'Kıstas’a katılın.',
  'Projelerinizi vitrine taşıyın.',
  'Geleceği birlikte inşa edelim.',
];

export interface AuthExperienceProps {
  mode: 'login' | 'register';
  onAuthSuccess: (profile: UserProfile | null) => void;
  onBack?: () => void;
  onSwitch: () => void;
  onGooglePress?: () => void;
  onGitHubPress?: () => void;
  onApplePress?: () => void;
}

const legal = [
  { title: 'KVKK Aydınlatma Metni', text: '6698 Sayılı Kişisel Verilerin Korunması Kanunu kapsamında kimlik, iletişim ve profil bilgileriniz; Kıstas keşif ve lansman platformu hizmetlerinin sunulması amacıyla güvenle işlenmektedir.' },
  { title: 'Kişisel Veriler Açık Rıza Metni', text: 'Profil ve etkileşim verilerimin platform deneyimini geliştirmek, kişiselleştirilmiş vitrin önerileri sunmak ve analitik süreçleri yürütmek amacıyla işlenmesine rıza veriyorum.' },
  { title: 'Ticari Elektronik İleti İzni', text: 'Yeni projeler, vitrin lansmanları ve platform güncellemelerinin e-posta ve anlık bildirim kanallarıyla tarafıma iletilmesini kabul ediyorum.' },
];

const glassWebProps = Platform.OS === 'web' ? { dataSet: { authGlass: 'true' } } : {};

const css = `
#kistas-auth-experience [data-auth-glass="true"]{background:linear-gradient(115deg,rgba(255,255,255,.9),rgba(235,243,254,.65),rgba(255,255,255,.92));box-shadow:inset 0 1px 0 #fff,inset 0 -1px 2px rgba(50,105,199,.08),0 5px 14px -9px rgba(27,58,99,.28);transition:border-color .25s,box-shadow .25s,transform .2s}
#kistas-auth-experience [data-auth-glass="true"]:focus-within{border-color:#6796D8;box-shadow:0 0 0 3px rgba(50,105,199,.09),inset 0 1px #fff}
#kistas-auth-experience input{outline:none!important;min-width:0}
#kistas-auth-experience [role=button]:focus-visible{outline:2px solid #3269C7;outline-offset:4px}
#kistas-auth-experience #auth-atmosphere{background:linear-gradient(130deg,#fff 12%,#f2f7ff 36%,#e2edfc 49%,#f8fbff 60%,#fff 82%)!important;animation:auth-silk 28s ease-in-out infinite}
@keyframes auth-silk{0%,100%{transform:scale(1.15) translateX(-3%)}50%{transform:scale(1.15) translateX(3%)}}
@media(hover:hover){#kistas-auth-experience [data-auth-glass="true"][role=button]:hover{border-color:#8CAEDF;transform:translateY(-1px)}}
@media(prefers-reduced-motion:reduce){#kistas-auth-experience #auth-atmosphere{animation:none}#kistas-auth-experience [data-auth-glass="true"]{transition:none}}
`;

function Field({ label, value, onChange, icon, secret, email, disabled, onNext, nextLabel, autoFocus }: {
  label: string; value: string; onChange: (value: string) => void;
  icon: React.ComponentProps<typeof Ionicons>['name']; secret?: boolean; email?: boolean;
  disabled: boolean; onNext?: () => void; nextLabel?: string; autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return <View style={s.fieldGroup}>
    <Text style={s.label}>{label}</Text>
    <View {...glassWebProps} style={s.field}>
      <Ionicons name={icon} size={19} color="#587397" />
      <TextInput accessibilityLabel={label} placeholder={label} placeholderTextColor="#7C8BA0" value={value}
        onChangeText={onChange} style={s.input} editable={!disabled} secureTextEntry={secret && !visible}
        keyboardType={email ? 'email-address' : 'default'} autoCapitalize={secret || email ? 'none' : 'words'}
        autoCorrect={!secret && !email} autoComplete={email ? 'email' : secret ? 'off' : 'name'}
        maxLength={secret ? 128 : 254} autoFocus={autoFocus} returnKeyType="go" onSubmitEditing={onNext} />
      {secret && <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'} onPress={() => setVisible(!visible)} style={s.iconButton}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color="#587397" />
      </Pressable>}
      {onNext && <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={nextLabel || 'Devam et'} onPress={onNext} style={({ pressed }) => [s.next, pressed && s.pressed]}>
        <Ionicons name="arrow-forward" size={20} color="#3269C7" />
      </Pressable>}
    </View>
  </View>;
}

export function AuthExperience({ mode, onAuthSuccess, onSwitch, onBack, onGooglePress, onGitHubPress }: AuthExperienceProps) {
  const registering = mode === 'register';
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [consents, setConsents] = useState([false, false, false]);
  const [legalIndex, setLegalIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [info, setInfo] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  const fade = useRef(new Animated.Value(1)).current;
  const reduce = useRef(false);

  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { reduce.current = value; });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduce.current = value; });
    if (Platform.OS === 'web') {
      installAuthAutofillStyles();
      const sheet = document.createElement('style');
      sheet.textContent = css;
      document.head.appendChild(sheet);
      return () => { mounted.current = false; sheet.remove(); sub.remove(); };
    }
    return () => { mounted.current = false; sub.remove(); };
  }, []);

  useEffect(() => {
    fade.setValue(reduce.current ? 1 : 0);
    const animation = Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [step, fade]);

  const error = (text: string) => { setInfo(false); setMessage(AuthService.localizeAuthError(text, text)); };
  const go = (next: number) => { setMessage(''); setStep(next); };
  const validEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // The synchronous guard also blocks rapid Enter/click submissions before React renders.
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setMessage('');
    try { await action(); }
    catch { if (mounted.current) error('İşlem tamamlanamadı. Lütfen tekrar deneyin.'); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  };
  const submit = () => {
    if (!validEmail()) { error('Geçerli bir e-posta adresi girin.'); return; }
    if (password.length < 6) { error('Şifreniz en az 6 karakter olmalı.'); return; }
    if (registering && (!name.trim() || password !== confirm || !consents[0])) {
      error(!name.trim() ? 'Ad ve soyadınızı girin.' : password !== confirm ? 'Şifreler birbiriyle uyuşmuyor.' : 'KVKK Aydınlatma Metni’ni onaylayın.'); return;
    }
    void run(async () => {
      const result = registering
        ? await AuthService.signUpWithEmail(email.trim().toLowerCase(), password, name.trim(), { kvkkAydinlatma: consents[0], acikRiza: consents[1], ticariIleti: consents[2] })
        : await AuthService.signInWithPassword(email.trim(), password);
      if (!mounted.current) return;
      if (result.success) onAuthSuccess(result.profile || null);
      else error(result.error || 'İşlem tamamlanamadı.');
    });
  };
  const advance = () => {
    if (locked.current) return;
    if (step === 0) { if (!validEmail()) error('Geçerli bir e-posta adresi girin.'); else go(1); }
    else if (step === 1 && registering) { if (password.length < 6) error('Şifreniz en az 6 karakter olmalı.'); else go(2); }
    else submit();
  };
  const social = (provider: 'google' | 'github') => void run(async () => {
    const callback = provider === 'google' ? onGooglePress : onGitHubPress;
    if (callback) { callback(); return; }
    const result = await AuthService.signInWithOAuth(provider);
    if (!mounted.current) return;
    if (result.success && result.profile) onAuthSuccess(result.profile);
    else if (result.error) error(result.error);
  });
  const forgot = () => {
    if (!validEmail()) { error('Şifre yenilemek için geçerli e-posta adresinizi girin.'); return; }
    void run(async () => {
      const result = await AuthService.sendPasswordResetEmail(email.trim());
      if (!mounted.current) return;
      setInfo(result.success);
      setMessage(result.success ? 'Şifre yenileme bağlantısı e-posta adresinize gönderildi.' : result.error || 'Bağlantı gönderilemedi.');
    });
  };
  const title = step === 0 ? (registering ? 'Kıstas’a katılın' : 'Geleceğin projelerini keşfedin.') : step === 1 ? (registering ? 'Şifrenizi oluşturun' : 'Kaldığınız yerden') : 'Son bir adım';

  return <View nativeID="kistas-auth-experience" style={s.root}>
    <LinearGradient pointerEvents="none" nativeID="auth-atmosphere" colors={['#FFFFFF', '#F1F6FD', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={s.top}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Geri dön" disabled={busy} onPress={onBack} style={s.iconButton}>
              <Ionicons name="arrow-back" size={22} color="#526680" />
            </Pressable>
          ) : (
            <View style={s.iconButton} />
          )}
          <LoginAvatarVideo />
          <View style={s.iconButton} />
        </View>
        <View style={s.stage}>
          <Animated.View style={[s.form, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }] }]}>
            {step === 0 ? (
              <Typewriter
                words={registering ? REGISTER_TYPEWRITER_WORDS : LOGIN_TYPEWRITER_WORDS}
                speed={70}
                delayBetweenWords={2400}
                cursor={true}
                cursorChar="|"
                style={s.title}
                cursorStyle={s.typewriterCursor}
                containerStyle={s.titleContainer}
                minHeight={96}
              />
            ) : (
              <Text accessibilityRole="header" style={s.title}>{title}</Text>
            )}
            {step > 0 && (
              <Text style={s.subtitle}>
                {step === 1
                  ? (registering ? 'En az 6 karakterli bir şifre belirleyin.' : 'Hesabınıza güvenle giriş yapın.')
                  : 'Profilinizi tamamlayın.'}
              </Text>
            )}
            {step === 0 && <>
              <View style={s.socialRow}>
                {(['google', 'github'] as const).map(provider => <Pressable key={provider} {...glassWebProps} accessibilityRole="button" accessibilityLabel={provider === 'google' ? 'Google ile devam et' : 'GitHub ile devam et'} disabled={busy} onPress={() => social(provider)} style={({ pressed }) => [s.social, pressed && s.pressed]}>
                  <Ionicons name={provider === 'google' ? 'logo-google' : 'logo-github'} size={21} color={provider === 'google' ? '#3269C7' : '#252333'} />
                  <Text style={s.socialText}>{provider === 'google' ? 'Google' : 'GitHub'}</Text>
                </Pressable>)}
              </View>
              <View style={s.divider}><View style={s.line} /><Text style={s.or}>veya e-posta ile</Text><View style={s.line} /></View>
            </>}
            {step < 2 && <Field label="E-posta adresi" email icon="mail-outline" value={email} onChange={setEmail} disabled={busy} onNext={step === 0 ? advance : undefined} />}
            {step === 1 && <Field label="Şifre" secret icon="lock-closed-outline" value={password} onChange={setPassword} disabled={busy} onNext={advance} nextLabel={registering ? 'Şifreyle devam et' : 'Giriş yap'} />}
            {step === 2 && <>
              <Field label="Ad soyad" icon="person-outline" value={name} onChange={setName} disabled={busy} />
              <Field label="Şifreyi doğrula" secret icon="lock-closed-outline" value={confirm} onChange={setConfirm} disabled={busy} onNext={submit} nextLabel="Kaydı tamamla" />
              <View style={s.consents}>{legal.map((item, index) => <View style={s.consentRow} key={item.title}>
                <Pressable accessibilityRole="checkbox" accessibilityLabel={item.title} accessibilityState={{ checked: consents[index], disabled: busy }} disabled={busy} onPress={() => setConsents(values => values.map((value, i) => i === index ? !value : value))} style={s.checkboxHit}>
                  <View style={[s.checkbox, consents[index] && s.checked]}>{consents[index] && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}</View>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setLegalIndex(index)} style={s.consentLink}><Text style={s.consentText}>{item.title}{index === 0 ? ' *' : ' (isteğe bağlı)'}</Text></Pressable>
              </View>)}</View>
            </>}
            {!!message && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.notice, info && s.info]}><Text style={[s.noticeText, info && { color: '#187657' }]}>{message}</Text></View>}
            {busy ? (
              <View accessibilityLiveRegion="polite" style={s.busy}>
                <ActivityIndicator color="#3269C7" />
                <Text style={s.subtitle}>İşleminiz sürüyor…</Text>
              </View>
            ) : (
              <Pressable
                {...glassWebProps}
                accessibilityRole="button"
                accessibilityLabel={step === 0 ? 'Devam et' : step === 2 ? 'Hesap oluştur' : registering ? 'Devam et' : 'Giriş yap'}
                onPress={advance}
                style={({ pressed }) => [s.submit, pressed && s.pressed]}
              >
                <Text style={s.submitText}>
                  {step === 0 ? 'Devam et' : step === 2 ? 'Hesap oluştur' : registering ? 'Devam et' : 'Giriş yap'}
                </Text>
                <Ionicons name="arrow-forward" size={19} color="#3269C7" />
              </Pressable>
            )}
            {step > 0 && <View style={s.actions}><Pressable accessibilityRole="button" onPress={() => go(step - 1)} disabled={busy} style={s.link}><Ionicons name="arrow-back" size={15} color="#65758C" /><Text style={s.linkText}>Geri</Text></Pressable>{!registering && <Pressable accessibilityRole="button" disabled={busy} onPress={forgot} style={s.link}><Text style={s.linkText}>Şifremi unuttum</Text></Pressable>}</View>}
            <View style={s.switchRow}><Text style={s.linkText}>{registering ? 'Zaten hesabınız var mı?' : 'Henüz hesabınız yok mu?'}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={onSwitch} style={s.link}><Text style={s.switchText}>{registering ? 'Giriş yap' : 'Kayıt Ol'}</Text></Pressable></View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={legalIndex !== null} transparent animationType="fade" onRequestClose={() => setLegalIndex(null)}>
      <View style={s.modalOverlay}><View accessibilityViewIsModal style={s.modal}>
        <View style={s.modalHeader}><Text style={s.modalTitle}>{legalIndex !== null ? legal[legalIndex].title : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={() => setLegalIndex(null)} style={s.iconButton}><Ionicons name="close" size={22} color="#252333" /></Pressable></View>
        <ScrollView><Text style={s.legalText}>{legalIndex !== null ? legal[legalIndex].text : ''}</Text></ScrollView>
      </View></View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 36 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 144, paddingTop: 28, paddingBottom: 10 },
  stage: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 8, paddingBottom: 40 },
  form: { width: '100%', maxWidth: 380 },
  title: { color: '#25364E', fontSize: 38, lineHeight: 46, textAlign: 'center', fontWeight: '400', fontFamily: Platform.select({ web: 'Georgia, serif', ios: 'Georgia', android: 'serif' }), marginHorizontal: -8 },
  titleContainer: { minHeight: 96, justifyContent: 'center', alignItems: 'center', marginHorizontal: -8, marginBottom: 16 },
  typewriterCursor: { color: '#3269C7', fontWeight: '300' },
  subtitle: { color: '#677A93', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  social: { minHeight: 48, paddingHorizontal: 24, flexDirection: 'row', gap: 9, alignItems: 'center', borderWidth: 1, borderColor: '#CBD9EC', borderRadius: 28, backgroundColor: '#F6FAFF' },
  socialText: { fontSize: 13, fontWeight: '600', color: '#34445C' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 28 },
  line: { flex: 1, height: 1, backgroundColor: '#DCE5F1' },
  or: { color: '#7B889B', fontSize: 11 },
  fieldGroup: { marginBottom: 20 },
  label: { color: '#677A93', fontSize: 11, marginBottom: 8, marginLeft: 18 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 56, paddingLeft: 17, paddingRight: 5, backgroundColor: '#F8FBFF', borderWidth: 1, borderColor: '#CBD9EC', borderRadius: 30 },
  input: { flex: 1, minWidth: 0, height: 54, color: '#25364E', fontSize: 14, paddingVertical: 10 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  next: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: '#E7F0FC', borderWidth: 1, borderColor: '#CCDDF5' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  submit: { minHeight: 50, borderRadius: 26, borderWidth: 1, borderColor: '#B8CEE9', backgroundColor: '#EAF2FC', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  submitText: { color: '#2E5996', fontWeight: '600', fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  link: { minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { fontSize: 12, color: '#677A93' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, flexWrap: 'wrap' },
  switchText: { color: '#3269C7', fontWeight: '600', fontSize: 12 },
  notice: { backgroundColor: '#FFF3F4', padding: 12, borderRadius: 8, marginBottom: 16 },
  noticeText: { color: '#A33146', fontSize: 13, lineHeight: 20 },
  info: { backgroundColor: '#EBF6EF' },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  consents: { marginBottom: 20 },
  consentRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#AEC4E1', borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checked: { backgroundColor: '#3269C7', borderColor: '#3269C7' },
  consentLink: { flex: 1, paddingVertical: 10 },
  consentText: { color: '#596E8C', fontSize: 11, lineHeight: 17 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(25,42,66,.25)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { width: '100%', maxWidth: 480, maxHeight: '80%', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalTitle: { flex: 1, fontWeight: '600', fontSize: 18, color: '#25364E' },
  legalText: { color: '#526680', fontSize: 14, lineHeight: 23 },
});
