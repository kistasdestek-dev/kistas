import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';

export interface HowItWorksScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onCreateProject?: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenBlog?: () => void;
}

export const HowItWorksScreen: React.FC<HowItWorksScreenProps> = ({
  onBack,
  onExplore,
  onCreateProject,
}) => {
  const [role, setRole] = useState<'explorer' | 'creator'>('explorer');

  const explorerSteps = [
    {
      num: '01',
      icon: 'compass-outline' as const,
      title: 'Gezin & Keşfet',
      desc: 'Her gün bağımsız geliştiricilerin ve tasarımcıların ürettiği en yeni projeleri kategoriye ve popülerliğe göre inceleyin.',
    },
    {
      num: '02',
      icon: 'arrow-up-circle-outline' as const,
      title: 'Destek Ol & Oyla',
      desc: 'Beğendiğin projelere oy vererek onları vitrinin üst sıralarına taşı. Senin oyun, projenin görünürlüğünü belirler.',
    },
    {
      num: '03',
      icon: 'gift-outline' as const,
      title: 'Avantajları Kap',
      desc: 'Erken benimseyenler için sunulan özel indirimleri, promosyon kodlarını yakala ve geliştiricilerle doğrudan iletişime geç.',
    },
  ];

  const creatorSteps = [
    {
      num: '01',
      icon: 'sparkles-outline' as const,
      title: '2 Dakikada Lansman Yap',
      desc: 'Projenin adını, logosunu, ekran görüntülerini ve sunduğun değeri ekle. Lansmanını hemen başlat.',
    },
    {
      num: '02',
      icon: 'people-outline' as const,
      title: 'İlk Kullanıcılarını Bul',
      desc: 'Reklam bütçesine gerek yok! Gerçek dijital meraklılar ve potansiyel müşteriler projenle doğrudan buluşsun.',
    },
    {
      num: '03',
      icon: 'trending-up-outline' as const,
      title: 'Geri Bildirimle Büyü',
      desc: 'Topluluktan gelen yorumlar ve destek oylarıyla ürününü mükemmelleştir, vitrinde öne çık.',
    },
  ];

  const steps = role === 'explorer' ? explorerSteps : creatorSteps;

  return (
    <ScrollView decelerationRate={0.99} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.back} onPress={onBack} accessibilityRole="button">
        <Ionicons name="arrow-back" size={17} color="#686474" />
        <Text style={styles.backText}>Geri dön</Text>
      </TouchableOpacity>

      <KistasTopBrandBar onPress={onBack} />

      <Text style={styles.kicker}>BASİT, ŞEFFAF & ADİL</Text>
      <Text style={styles.title}>Kıstas Nasıl Çalışır?</Text>
      <Text style={styles.lead}>
        İster yeni dijital fikirler keşfetmek isteyen bir meraklı, ister dünyaya ürün sunan bir yaratıcı olun; Kıstas herkes için çok basittir.
      </Text>

      {/* Rol Seçici */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, role === 'explorer' && styles.tabActive]}
          onPress={() => setRole('explorer')}
          accessibilityRole="button"
        >
          <Ionicons name="compass" size={15} color={role === 'explorer' ? '#25364E' : '#687890'} />
          <Text style={[styles.tabText, role === 'explorer' && styles.tabTextActive]}>Keşfedenler İçin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, role === 'creator' && styles.tabActive]}
          onPress={() => setRole('creator')}
          accessibilityRole="button"
        >
          <Ionicons name="rocket" size={15} color={role === 'creator' ? '#25364E' : '#687890'} />
          <Text style={[styles.tabText, role === 'creator' && styles.tabTextActive]}>Üretenler İçin</Text>
        </TouchableOpacity>
      </View>

      {/* 3 Adım Kartları */}
      <View style={styles.stepsList}>
        {steps.map((step) => (
          <View style={styles.stepCard} key={step.num}>
            <View style={styles.stepCardHeader}>
              <View style={styles.stepIconWrap}>
                <Ionicons name={step.icon} size={24} color="#3269C7" />
              </View>
              <Text style={styles.stepNum}>{step.num}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        ))}
      </View>

      {/* Prensiplerimiz */}
      <View style={styles.principlesBox}>
        <Text style={styles.sectionHeader}>Temel Kurallarımız</Text>
        <View style={styles.principleRow}>
          <Ionicons name="shield-checkmark" size={18} color="#3269C7" />
          <View style={styles.principleContent}>
            <Text style={styles.principleTitle}>Reklamsız ve Eşit</Text>
            <Text style={styles.principleDesc}>Parayı basanın öne geçtiği sponsorlu sıralamalar yok. Her proje eşit şansla başlar.</Text>
          </View>
        </View>
        <View style={styles.principleRow}>
          <Ionicons name="finger-print" size={18} color="#3269C7" />
          <View style={styles.principleContent}>
            <Text style={styles.principleTitle}>Gerçek ve Güvenilir</Text>
            <Text style={styles.principleDesc}>Botlara ve sahte hesaplara karşı doğrulanmış topluluk mekanizması.</Text>
          </View>
        </View>
        <View style={styles.principleRow}>
          <Ionicons name="flash" size={18} color="#3269C7" />
          <View style={styles.principleContent}>
            <Text style={styles.principleTitle}>Doğrudan Temas</Text>
            <Text style={styles.principleDesc}>Kullanıcılar ile geliştiriciler arasında aracı yok; doğrudan iletişim var.</Text>
          </View>
        </View>
      </View>

      {/* SSS */}
      <View style={styles.faqBox}>
        <Text style={styles.sectionHeader}>Sıkça Sorulanlar</Text>
        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>Kıstas'ı kullanmak ücretli mi?</Text>
          <Text style={styles.faqA}>Hayır! Proje keşfetmek, oylamak ve ürün yayınlamak tamamen ücretsizdir.</Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>Hangi projeler onaylanır?</Text>
          <Text style={styles.faqA}>Çalışan, yasalara uygun, bağımsız web/mobil/SaaS veya açık kaynak tüm dijital projeler uygundur.</Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>Oy verirsem ne kazanırım?</Text>
          <Text style={styles.faqA}>Kıstas topluluğunun saygın bir üyesi olur, erken erişim ve özel fırsatlardan ilk siz yararlanırsınız.</Text>
        </View>
      </View>

      {/* Alt Aksiyon */}
      <TouchableOpacity
        style={styles.primaryCta}
        onPress={role === 'explorer' ? onExplore : (onCreateProject || onExplore)}
        accessibilityRole="button"
      >
        <Text style={styles.primaryCtaText}>
          {role === 'explorer' ? 'Hemen Keşfetmeye Başla' : 'Projemi 2 Dakikada Yayınla'}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 80, backgroundColor: '#F1F5FA' },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  backText: { color: '#686474', fontSize: 13, fontWeight: '700' },
  logoWrap: { marginBottom: 16 },
  kicker: { color: '#3269C7', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { marginTop: 10, color: '#25364E', fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  lead: { marginTop: 8, marginBottom: 28, color: '#5A6A80', fontSize: 15, lineHeight: 23 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FD',
    borderRadius: 24,
    padding: 4,
    gap: 6,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#D4E2F5',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: { color: '#687890', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#25364E', fontWeight: '700' },
  stepsList: { gap: 16, marginBottom: 36 },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F1',
    borderTopWidth: 3,
    borderTopColor: '#7FA5DA',
    padding: 24,
  },
  stepCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EEF4FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: '#71849F', fontSize: 11, fontWeight: '700', letterSpacing: 0 },
  stepTitle: { color: '#25364E', fontSize: 20, lineHeight: 28, fontWeight: '700', marginBottom: 12 },
  stepDesc: { color: '#5B6E87', fontSize: 14, lineHeight: 25 },
  principlesBox: {
    backgroundColor: '#F8FAFD',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2ECF8',
    marginBottom: 30,
    gap: 16,
  },
  sectionHeader: { color: '#25364E', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  principleRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  principleContent: { flex: 1 },
  principleTitle: { color: '#25364E', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  principleDesc: { color: '#687890', fontSize: 12.5, lineHeight: 18 },
  faqBox: { marginBottom: 32, gap: 14 },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EFF9',
    padding: 16,
  },
  faqQ: { color: '#25364E', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  faqA: { color: '#687890', fontSize: 13, lineHeight: 19 },
  primaryCta: {
    backgroundColor: '#25364E',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryCtaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
