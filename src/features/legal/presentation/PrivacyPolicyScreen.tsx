import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const DATA_GROUPS: Array<{ icon: IoniconName; title: string; text: string }> = [
  { icon: 'person-outline', title: 'Hesap ve profil', text: 'Ad, e-posta, telefon, profil fotoğrafı, biyografi ve doğrulama bilgileri.' },
  { icon: 'apps-outline', title: 'Proje içerikleri', text: 'Proje adı, açıklama, kategori, bağlantılar, logo ve yüklediğiniz vitrin görselleri.' },
  { icon: 'chatbubbles-outline', title: 'Topluluk hareketleri', text: 'Mesajlar, destekler, değerlendirmeler, bildirimler ve proje etkileşimleri.' },
  { icon: 'shield-outline', title: 'Teknik ve güvenlik', text: 'Oturum, cihaz, tarayıcı, IP, hata kayıtları ve hesabı korumaya yarayan teknik veriler.' },
];

const RIGHTS = [
  'Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlendiğinde bilgi talep etme.',
  'Verilerin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.',
  'Verilerin yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme.',
  'Eksik veya yanlış işlenen verilerin düzeltilmesini isteme.',
  'Kanundaki şartlar oluştuğunda verilerin silinmesini veya yok edilmesini isteme.',
  'Düzeltme ve silme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.',
  'Otomatik analiz sonucunda aleyhinize bir sonuç ortaya çıkmasına itiraz etme.',
  'Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme.',
];

const PolicySection: React.FC<{
  number: string;
  title: string;
  children: React.ReactNode;
}> = ({ number, title, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Text style={styles.sectionNumber}>{number}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ onBack }) => {
  const { width } = useWindowDimensions();
  const wide = width >= 920;

  return (
    <ScrollView decelerationRate={0.99} style={styles.root} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.wrap}>
        <KistasTopBrandBar onPress={onBack} />
        <View style={styles.topbar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityRole="button" accessibilityLabel="Geri dön" activeOpacity={0.74}>
            <Ionicons name="arrow-back" size={18} color="#252333" />
            <Text style={styles.backText}>Geri dön</Text>
          </TouchableOpacity>
          <View style={styles.versionPill}><View style={styles.liveDot} /><Text style={styles.versionText}>SÜRÜM 1.0</Text></View>
        </View>

        <LinearGradient colors={['rgba(250,251,253,0.92)', 'rgba(250,251,253,0.94)']} style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="finger-print-outline" size={30} color="#3269C7" /></View>
          <Text style={styles.eyebrow}>GİZLİLİK MERKEZİ</Text>
          <Text style={styles.heroTitle}>Veriniz size ait. Kontrolü de öyle.</Text>
          <Text style={styles.heroLead}>
            Kıstas'ı kullanırken hangi verileri neden işlediğimizi, nasıl koruduğumuzu ve haklarınızı açık bir dille anlatıyoruz.
          </Text>
          <Text style={styles.updated}>Son güncelleme: 14 Eylül 2026</Text>
        </LinearGradient>

        <View style={[styles.signalBand, !wide && styles.signalBandMobile]}>
          <View style={styles.signalItem}><Ionicons name="eye-off-outline" size={20} color="#3269C7" /><View><Text style={styles.signalTitle}>Satış yok</Text><Text style={styles.signalText}>Kişisel verileriniz satılmaz.</Text></View></View>
          <View style={styles.signalDivider} />
          <View style={styles.signalItem}><Ionicons name="options-outline" size={20} color="#3269C7" /><View><Text style={styles.signalTitle}>Amaçla sınırlı</Text><Text style={styles.signalText}>Yalnızca gerekli veriler işlenir.</Text></View></View>
          <View style={styles.signalDivider} />
          <View style={styles.signalItem}><Ionicons name="mail-outline" size={20} color="#3269C7" /><View><Text style={styles.signalTitle}>Erişilebilir</Text><Text style={styles.signalText}>Taleplerinizi bize iletebilirsiniz.</Text></View></View>
        </View>

        <View style={[styles.documentLayout, wide && styles.documentLayoutWide]}>
          <View style={[styles.documentIntro, wide && styles.documentIntroWide]}>
            <Text style={styles.introLabel}>AYDINLATMA METNİ</Text>
            <Text style={styles.introTitle}>Kıstas KVKK ve Gizlilik Politikası</Text>
            <Text style={styles.introText}>
              Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında Kıstas kullanıcılarını bilgilendirmek amacıyla hazırlanmıştır.
            </Text>
            <View style={styles.contactBox}>
              <Text style={styles.contactLabel}>GİZLİLİK İLETİŞİMİ</Text>
              <Text style={styles.contactValue}>kistasdestek@gmail.com</Text>
              <Text style={styles.contactHint}>Başvurunuzda hesabınıza kayıtlı e-posta adresini belirtin.</Text>
            </View>
          </View>

          <View style={styles.document}>
            <PolicySection number="01" title="Veri sorumlusu">
              <Text style={styles.paragraph}>
                Kişisel verileriniz bakımından veri sorumlusu Kıstas platform işletmecisidir. Gizlilik ve KVKK kapsamındaki taleplerinizi kistasdestek@gmail.com adresine iletebilirsiniz.
              </Text>
            </PolicySection>

            <PolicySection number="02" title="Hangi verileri işliyoruz?">
              <View style={styles.dataGrid}>
                {DATA_GROUPS.map((item) => (
                  <View key={item.title} style={styles.dataItem}>
                    <View style={styles.dataIcon}><Ionicons name={item.icon} size={18} color="#3269C7" /></View>
                    <View style={styles.dataCopy}><Text style={styles.dataTitle}>{item.title}</Text><Text style={styles.dataText}>{item.text}</Text></View>
                  </View>
                ))}
              </View>
            </PolicySection>

            <PolicySection number="03" title="Neden ve hangi hukuki sebeple işliyoruz?">
              <Text style={styles.paragraph}>
                Verileri; hesabınızı oluşturmak ve korumak, projeleri yayınlamak, keşif ve mesajlaşma özelliklerini çalıştırmak, destek ve görünürlük işlemlerini yürütmek, talepleri yanıtlamak, kötüye kullanımı önlemek ve yasal yükümlülükleri yerine getirmek amacıyla işleriz.
              </Text>
              <Text style={styles.paragraph}>
                İşleme faaliyetleri niteliğine göre sözleşmenin kurulması veya ifası, hukuki yükümlülük, bir hakkın tesisi ve korunması, meşru menfaat ve gerekli durumlarda açık rıza hukuki sebeplerine dayanır.
              </Text>
            </PolicySection>

            <PolicySection number="04" title="Veriler kimlerle paylaşılabilir?">
              <Text style={styles.paragraph}>
                Verileriniz; kimlik doğrulama ve veri tabanı hizmeti sunan Supabase, görsel depolama altyapısı, tercih ettiğiniz sosyal giriş sağlayıcısı, teknik hizmet sağlayıcılar ve kanunen yetkili kamu kurumlarıyla yalnızca ilgili hizmetin gerektirdiği ölçüde paylaşılabilir.
              </Text>
              <Text style={styles.paragraph}>
                Hizmet altyapısının yurt dışındaki sunucuları kullanması halinde aktarımlar, yürürlükteki veri koruma kurallarındaki şartlar ve uygun güvenceler gözetilerek gerçekleştirilir.
              </Text>
            </PolicySection>

            <PolicySection number="05" title="Toplama yöntemi, saklama ve güvenlik">
              <Text style={styles.paragraph}>
                Veriler; kayıt ve proje formları, yüklemeler, mesajlaşma, destek talepleri ve platformla kurduğunuz teknik bağlantılar üzerinden elektronik ortamda toplanır. Amaç için gerekli süre ve uygulanabilir yasal saklama süreleri boyunca tutulur; süre sona erdiğinde silinir, yok edilir veya anonim hale getirilir.
              </Text>
              <Text style={styles.paragraph}>
                Yetki kontrolleri, güvenli oturum yönetimi, erişim sınırlamaları ve kayıt mekanizmaları gibi teknik ve idari önlemler kullanılır. İnternet üzerinden yapılan hiçbir aktarımın mutlak güvenliği garanti edilemese de riskler düzenli olarak değerlendirilir.
              </Text>
            </PolicySection>

            <PolicySection number="06" title="Çerezler ve yerel depolama">
              <Text style={styles.paragraph}>
                Kıstas; oturumunuzu açık tutmak, güvenliği sağlamak ve temel tercihleri hatırlamak için zorunlu çerezler veya benzer yerel depolama teknolojileri kullanabilir. Reklam amaçlı üçüncü taraf izleme teknolojileri bu temel işlevlerin parçası değildir.
              </Text>
            </PolicySection>

            <PolicySection number="07" title="KVKK kapsamındaki haklarınız">
              <Text style={styles.paragraph}>KVKK'nın 11. maddesi kapsamında veri sorumlusuna başvurarak aşağıdaki hakları kullanabilirsiniz:</Text>
              <View style={styles.rightsList}>
                {RIGHTS.map((right, index) => (
                  <View key={right} style={styles.rightRow}>
                    <Text style={styles.rightNumber}>{String(index + 1).padStart(2, '0')}</Text>
                    <Text style={styles.rightText}>{right}</Text>
                  </View>
                ))}
              </View>
            </PolicySection>

            <PolicySection number="08" title="Başvuru ve politika güncellemeleri">
              <Text style={styles.paragraph}>
                Talebinizi, kimliğinizi doğrulamaya yeterli bilgiler ve talebinizin açıklamasıyla kistasdestek@gmail.com adresine gönderebilirsiniz. Başvurular mevzuatta öngörülen süre içinde değerlendirilir. Politika güncellendiğinde yeni sürüm ve tarih bu sayfada yayımlanır.
              </Text>
            </PolicySection>
          </View>
        </View>

        <View style={styles.bottomBand}>
          <View><Text style={styles.bottomTitle}>Veriniz hakkında bir sorunuz mu var?</Text><Text style={styles.bottomText}>Gizlilik ekibimize doğrudan ulaşabilirsiniz.</Text></View>
          <Text style={styles.bottomMail}>kistasdestek@gmail.com</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5FA' },
  page: { paddingVertical: 24, paddingBottom: 64 },
  wrap: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 20 },
  topbar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  backButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: 8, backgroundColor: 'rgba(250,251,253,0.66)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.16)' },
  backText: { color: '#3f3b4c', fontSize: 12, fontWeight: '700' },
  versionPill: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 999, backgroundColor: 'rgba(250,251,253,0.66)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.14)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3269C7' },
  versionText: { color: '#3269C7', fontSize: 8, fontWeight: '900', letterSpacing: 0 },
  hero: { minHeight: 390, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 54, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(50,105,199,0.22)' },
  heroIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(50,105,199,0.08)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.2)', marginBottom: 22 },
  eyebrow: { color: '#3269C7', fontSize: 10, fontWeight: '900', letterSpacing: 0, marginBottom: 12 },
  heroTitle: { maxWidth: 780, color: '#3f3b4c', fontSize: 48, lineHeight: 52, fontWeight: '900', letterSpacing: 0, textAlign: 'center' },
  heroLead: { maxWidth: 680, color: '#3f3b4c', fontSize: 16, lineHeight: 25, textAlign: 'center', marginTop: 10 },
  updated: { color: '#3269C7', fontSize: 10, fontWeight: '700', marginTop: 24 },
  signalBand: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: 'rgba(250,251,253,0.72)', borderBottomWidth: 1, borderColor: 'rgba(50,105,199,0.12)', paddingVertical: 17, paddingHorizontal: 18, marginBottom: 62 },
  signalBandMobile: { flexDirection: 'column', gap: 15 },
  signalItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12 },
  signalTitle: { color: '#252333', fontSize: 12, fontWeight: '800' },
  signalText: { color: '#3269C7', fontSize: 10.5, marginTop: 2 },
  signalDivider: { width: 1, backgroundColor: 'rgba(50,105,199,0.12)' },
  documentLayout: { gap: 38 },
  documentLayoutWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 64 },
  documentIntro: { flexShrink: 1 },
  documentIntroWide: { width: 300, flexShrink: 0 },
  introLabel: { color: '#3269C7', fontSize: 9, fontWeight: '900', letterSpacing: 0 },
  introTitle: { color: '#3f3b4c', fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: 0, marginTop: 10 },
  introText: { color: '#3269C7', fontSize: 13, lineHeight: 21, marginTop: 15 },
  contactBox: { marginTop: 24, padding: 15, borderRadius: 8, backgroundColor: 'rgba(250,251,253,0.72)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.14)' },
  contactLabel: { color: '#3269C7', fontSize: 8, fontWeight: '900', letterSpacing: 0 },
  contactValue: { color: '#3269C7', fontSize: 13, fontWeight: '800', marginTop: 7 },
  contactHint: { color: '#3269C7', fontSize: 10, lineHeight: 15, marginTop: 7 },
  document: { flex: 1, minWidth: 0 },
  section: { paddingBottom: 36, marginBottom: 36, borderBottomWidth: 1, borderBottomColor: 'rgba(50,105,199,0.13)' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 13, marginBottom: 18 },
  sectionNumber: { color: '#3269C7', fontSize: 10, fontWeight: '900' },
  sectionTitle: { flex: 1, color: '#3f3b4c', fontSize: 22, lineHeight: 28, fontWeight: '900', letterSpacing: 0 },
  sectionBody: { paddingLeft: 30 },
  paragraph: { color: '#686474', fontSize: 14, lineHeight: 23, marginBottom: 12 },
  dataGrid: { gap: 9 },
  dataItem: { minHeight: 74, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: 'rgba(250,251,253,0.6)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.1)' },
  dataIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(50,105,199,0.08)', marginRight: 12 },
  dataCopy: { flex: 1, minWidth: 0 },
  dataTitle: { color: '#252333', fontSize: 12.5, fontWeight: '800' },
  dataText: { color: '#3269C7', fontSize: 11.5, lineHeight: 17, marginTop: 3 },
  rightsList: { marginTop: 10 },
  rightRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(50,105,199,0.08)' },
  rightNumber: { width: 31, color: '#3269C7', fontSize: 9, fontWeight: '900', paddingTop: 3 },
  rightText: { flex: 1, color: '#686474', fontSize: 12.5, lineHeight: 19 },
  bottomBand: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 22, borderRadius: 8, backgroundColor: 'rgba(250,251,253,0.7)', borderWidth: 1, borderColor: 'rgba(50,105,199,0.2)' },
  bottomTitle: { color: '#3f3b4c', fontSize: 17, fontWeight: '900' },
  bottomText: { color: '#3269C7', fontSize: 11.5, marginTop: 4 },
  bottomMail: { color: '#3269C7', fontSize: 13, fontWeight: '900' },
});
