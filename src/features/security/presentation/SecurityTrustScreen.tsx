import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { theme } from '../../../core/theme';

export interface SecurityTrustScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenFaq?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
  onOpenSecurity?: () => void;
}

export const SecurityTrustScreen: React.FC<SecurityTrustScreenProps> = ({
  onBack,
  onExplore,
  onOpenAbout,
  onOpenPrivacy,
  onOpenFaq,
  onOpenHowItWorks,
  onOpenBlog,
  onOpenSecurity,
}) => (
  <ScrollView
    decelerationRate={0.99}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    {/* Üst Bar & GlassIconButton */}
    <View style={styles.topRow}>
      <GlassIconButton
        icon="arrow-back"
        onPress={onBack}
        accessibilityLabel="Geri dön"
      />
      <Text style={styles.topBarTitle}>Güvenlik & Şeffaflık</Text>
    </View>

    <KistasTopBrandBar onPress={onBack} />

    {/* Hero */}
    <View style={styles.hero}>
      <View style={styles.kickerBadge}>
        <Ionicons name="shield-checkmark" size={14} color="#0088FF" />
        <Text style={styles.kicker}>KISTAS KALE MİMARİSİ</Text>
      </View>
      <Text style={styles.title}>Siber Savunma ile</Text>
      <Text style={styles.titleAccent}>%100 Uçtan Uca Koruma</Text>
      <Text style={styles.lead}>
        Pars DevState ve Sayra Siber Zekâsı ile güçlendirilen KISTAS, kullanıcı verilerini ve dijital projeleri sıfır-güven (Zero-Trust) mimarisiyle 7/24 teyakkuzda korur.
      </Text>
    </View>

    {/* Canlı Savunma Rozetleri */}
    <View style={styles.badgeGrid}>
      {[
        { icon: 'shield-half', title: '49+ Savunma Kalkanı', desc: 'Aktif WAF, Bal Küpü Decoy ve Adaptif Rate Limit' },
        { icon: 'document-text', title: 'RFC 9116 Standardı', desc: 'Resmi security.txt ve Sorumlu Açıklama Politikası' },
        { icon: 'lock-closed', title: '256-Bit SSL / TLS', desc: 'Askeri düzey HSTS Preload ve DNSSEC güvencesi' },
        { icon: 'wallet', title: 'Kriptografik Escrow', desc: 'Sipariş durum makinesi ve bakiye bütünlüğü' },
      ].map((item) => (
        <View style={styles.badgeCard} key={item.title}>
          <View style={styles.badgeIcon}>
            <Ionicons name={item.icon as any} size={18} color="#0088FF" />
          </View>
          <View style={styles.badgeCopy}>
            <Text style={styles.badgeTitle}>{item.title}</Text>
            <Text style={styles.badgeDesc}>{item.desc}</Text>
          </View>
        </View>
      ))}
    </View>

    {/* Savunma Sütunları */}
    <Text style={styles.sectionKicker}>SAVUNMA KATMANLARI</Text>
    <Text style={styles.sectionTitle}>Derinlemesine Dört Kalkan</Text>

    {[
      { num: '01', title: 'Web Çalışma Zamanı & WAF', desc: 'Anti-Clickjacking Frame Busting, Canlı XSS/SQLi payload süzgeci ve görünmez bot tuzakları.' },
      { num: '02', title: 'Zero-Trust Veritabanı & RLS', desc: '%100 Row Level Security politikaları ve atomik SECURITY DEFINER prosedürleri.' },
      { num: '03', title: 'Adaptif Hız Sınırı & Otonom Ban', desc: 'Kayan pencere fuzzer dedektörü ve ihlal anında otomatik tecrit.' },
      { num: '04', title: 'Finansal Durum Makinesi', desc: 'Tamamlanan veya iptal edilen siparişlerin değiştirilemezliği ve negatif bakiye engeli.' },
    ].map((col) => (
      <View style={styles.pillarRow} key={col.num}>
        <Text style={styles.pillarNum}>{col.num}</Text>
        <View style={styles.pillarCopy}>
          <Text style={styles.pillarTitle}>{col.title}</Text>
          <Text style={styles.pillarDesc}>{col.desc}</Text>
        </View>
      </View>
    ))}

    {/* Zafiyet Bildirim Bilgi Kartı */}
    <View style={styles.vdpBox}>
      <Text style={styles.vdpKicker}>GÜVENLİK BİLDİRİMİ</Text>
      <Text style={styles.vdpTitle}>Sorumlu Açıklama Programı</Text>
      <Text style={styles.vdpDesc}>
        Bir güvenlik açığı tespit ettiyseniz, lütfen doğrudan kistasdestek@gmail.com adresine bildiriniz.
      </Text>
      <TouchableOpacity style={styles.cta} onPress={onExplore} accessibilityRole="button">
        <Text style={styles.ctaText}>Projeleri Keşfet</Text>
        <Ionicons name="arrow-forward" size={17} color="#FAFBFD" />
      </TouchableOpacity>
    </View>

    <CinematicFooter
      compact
      onOpenAbout={onOpenAbout}
      onOpenPrivacy={onOpenPrivacy}
      onOpenFaq={onOpenFaq}
      onOpenHowItWorks={onOpenHowItWorks}
      onOpenBlog={onOpenBlog}
      onOpenSecurity={onOpenSecurity}
    />
  </ScrollView>
);

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 80, backgroundColor: '#F6F8FC' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  topBarTitle: { ...theme.typography.kistas, fontSize: 14, color: '#203754' },
  hero: { marginTop: 18, marginBottom: 26 },
  kickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,136,255,0.24)',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  kicker: { ...theme.typography.kistas, color: '#0088FF', fontSize: 10, letterSpacing: 0.8 },
  title: { marginTop: 16, color: '#18283E', fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -1.2 },
  titleAccent: { color: '#0088FF', fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -1.2 },
  lead: { marginTop: 14, color: '#52677F', fontSize: 15, lineHeight: 23 },
  badgeGrid: { gap: 10, marginBottom: 40 },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.15)',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  badgeIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F0F6FF',
    borderWidth: 1,
    borderColor: 'rgba(0,136,255,0.2)',
  },
  badgeCopy: { flex: 1 },
  badgeTitle: { color: '#18283E', fontSize: 16, fontWeight: '700' },
  badgeDesc: { marginTop: 3, color: '#6C829D', fontSize: 12, lineHeight: 17 },
  sectionKicker: { ...theme.typography.kistas, color: '#0088FF', fontSize: 10, letterSpacing: 0.8 },
  sectionTitle: { marginTop: 8, marginBottom: 20, color: '#18283E', fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6 },
  pillarRow: { flexDirection: 'row', gap: 16, paddingVertical: 18, borderTopWidth: 1, borderTopColor: 'rgba(50,105,199,0.16)' },
  pillarNum: { ...theme.typography.kistas, color: '#0088FF', fontSize: 13 },
  pillarCopy: { flex: 1 },
  pillarTitle: { color: '#18283E', fontSize: 17, fontWeight: '700' },
  pillarDesc: { marginTop: 4, color: '#52677F', fontSize: 13, lineHeight: 19 },
  vdpBox: {
    marginTop: 32,
    marginBottom: 20,
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#0C1D33',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  vdpKicker: { color: '#38BDF8', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  vdpTitle: { marginTop: 8, color: '#FFF', fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  vdpDesc: { marginTop: 8, color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  cta: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0088FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { ...theme.typography.kistas, color: '#FAFBFD', fontSize: 13 },
});
