import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../../core/theme';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';

export interface HowItWorksScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onCreateProject?: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenBlog?: () => void;
}

type Audience = 'explorer' | 'creator';

interface Step {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  copy: string;
}

const STEPS: Record<Audience, Step[]> = {
  explorer: [
    { icon: 'compass-outline', title: 'Yeni projeleri bul', copy: 'Kategorileri gez. Yeni çıkan uygulama, oyun ve araçları tek yerde gör.' },
    { icon: 'heart-outline', title: 'Beğendiğine destek ver', copy: 'Tek dokunuşla kalıcı destek ol. Popüler sıralama gerçek desteklere göre oluşur.' },
    { icon: 'chatbubble-ellipses-outline', title: 'Üreticiyle bağlantı kur', copy: 'Sorunu sor, fikrini paylaş ve varsa projeye özel fırsatları yakala.' },
  ],
  creator: [
    { icon: 'images-outline', title: 'Proje vitrinini hazırla', copy: 'Projenin ne yaptığını kısa bir anlatım ve güçlü görsellerle göster.' },
    { icon: 'people-outline', title: 'Doğru kişilere ulaş', copy: 'Ürünün, yeni dijital fikirleri gerçekten merak eden kullanıcılarla buluşsun.' },
    { icon: 'trending-up-outline', title: 'Destekle büyü', copy: 'Kalıcı destekleri ve geri bildirimleri ürününün bir sonraki adımına dönüştür.' },
  ],
};

const VALUES = [
  { icon: 'heart-outline' as const, title: 'Gerçek destek', copy: 'Popüler sıralama kalıcı desteklere göre oluşur.' },
  { icon: 'sync-outline' as const, title: 'Eşit vitrin', copy: 'Sponsorlu projeler saatlik rotasyonda adilce yer alır.' },
  { icon: 'chatbubbles-outline' as const, title: 'Doğrudan bağ', copy: 'Kullanıcı ve üretici aynı yerde buluşur.' },
];

export const HowItWorksScreen: React.FC<HowItWorksScreenProps> = ({
  onBack,
  onExplore,
  onCreateProject,
  onOpenAbout,
  onOpenPrivacy,
  onOpenSupport,
  onOpenBlog,
}) => {
  const [audience, setAudience] = useState<Audience>('explorer');
  const isExplorer = audience === 'explorer';

  return (
    <ScrollView decelerationRate={0.99} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.back} onPress={onBack} accessibilityRole="button">
        <Ionicons name="arrow-back" size={16} color="#686474" />
        <Text style={styles.smallLabel}>Geri dön</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={styles.kickerPill}><Text style={styles.kicker}>KISTAS NASIL İŞLER?</Text></View>
        <Text style={styles.title}>Keşfetmek kolay.</Text>
        <Text style={styles.titleAccent}>Büyümek mümkün.</Text>
        <Text style={styles.lead}>Kıstas, yeni ürün arayanlarla ürününü doğru insanlara anlatmak isteyenleri buluşturur.</Text>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        <TouchableOpacity style={[styles.tab, isExplorer && styles.tabActive]} onPress={() => setAudience('explorer')} accessibilityRole="tab">
          <Ionicons name="compass-outline" size={16} color={isExplorer ? '#25364E' : '#687890'} />
          <Text style={[styles.tabText, isExplorer && styles.tabTextActive]}>Keşfetmek istiyorum</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, !isExplorer && styles.tabActive]} onPress={() => setAudience('creator')} accessibilityRole="tab">
          <Ionicons name="rocket-outline" size={16} color={!isExplorer ? '#25364E' : '#687890'} />
          <Text style={[styles.tabText, !isExplorer && styles.tabTextActive]}>Projemi büyütmek istiyorum</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.audienceIntro}>{isExplorer ? 'Yeni favorini üç adımda bul.' : 'Projenin hikâyesini üç adımda duyur.'}</Text>
      <View style={styles.steps}>
        {STEPS[audience].map((step, index) => (
          <View style={styles.stepCard} key={step.title}>
            <View style={styles.stepTop}>
              <View style={styles.iconBox}><Ionicons name={step.icon} size={21} color="#3269C7" /></View>
              <Text style={styles.stepNumber}>0{index + 1}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepCopy}>{step.copy}</Text>
          </View>
        ))}
      </View>

      <View style={styles.valuesSection}>
        <Text style={styles.eyebrow}>KISTAS FARKI</Text>
        <Text style={styles.sectionTitle}>İyi fikirlerin önünü açan üç basit ilke.</Text>
        <View style={styles.values}>
          {VALUES.map((value) => (
            <View style={styles.valueCard} key={value.title}>
              <View style={styles.valueIcon}><Ionicons name={value.icon} size={18} color="#3269C7" /></View>
              <View style={styles.valueCopy}>
                <Text style={styles.valueTitle}>{value.title}</Text>
                <Text style={styles.valueDescription}>{value.copy}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Kıstas'ta yerini al.</Text>
        <Text style={styles.ctaCopy}>Yeni bir ürün keşfet veya kendi projenin doğru insanlar tarafından fark edilmesini sağla.</Text>
        <TouchableOpacity style={styles.ctaPrimary} onPress={onExplore} accessibilityRole="button">
          <Ionicons name="compass-outline" size={17} color="#25364E" />
          <Text style={styles.ctaPrimaryText}>Projeleri Keşfet</Text>
        </TouchableOpacity>
        {onCreateProject ? (
          <TouchableOpacity style={styles.ctaSecondary} onPress={onCreateProject} accessibilityRole="button">
            <Ionicons name="rocket-outline" size={17} color="#FFFFFF" />
            <Text style={styles.ctaSecondaryText}>Projeni Yayınla</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <CinematicFooter compact onOpenAbout={onOpenAbout} onOpenPrivacy={onOpenPrivacy} onOpenSupport={onOpenSupport} onOpenBlog={onOpenBlog} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 72, backgroundColor: '#F3F6FB' },
  back: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#DCE7F5', borderRadius: 12, backgroundColor: '#FFFFFF', ...theme.shadows.soft },
  smallLabel: { ...theme.typography.kistas, color: '#686474' },
  hero: { alignItems: 'center', paddingTop: 46, paddingBottom: 28 },
  kickerPill: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#DCE7F5', borderRadius: 999, backgroundColor: '#FFFFFF' },
  kicker: { ...theme.typography.kistas, color: '#3269C7', fontSize: 10, letterSpacing: 1.5 },
  title: { marginTop: 20, color: '#25364E', fontSize: 42, lineHeight: 43, fontWeight: '700', letterSpacing: -1.7, textAlign: 'center' },
  titleAccent: { color: '#3269C7', fontSize: 42, lineHeight: 43, fontWeight: '700', letterSpacing: -1.7, textAlign: 'center' },
  lead: { maxWidth: 540, marginTop: 18, color: '#5F6877', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 5, padding: 5, borderWidth: 1, borderColor: '#D9E6F6', borderRadius: 18, backgroundColor: '#EAF1FB' },
  tab: { flex: 1, minHeight: 54, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13 },
  tabActive: { backgroundColor: '#FFFFFF', ...theme.shadows.soft },
  tabText: { ...theme.typography.kistas, color: '#687890', fontSize: 11, textAlign: 'center' },
  tabTextActive: { color: '#25364E' },
  audienceIntro: { ...theme.typography.kistas, marginTop: 24, color: '#3269C7', textAlign: 'center' },
  steps: { gap: 10, marginTop: 16, marginBottom: 58 },
  stepCard: { padding: 22, borderWidth: 1, borderColor: '#DCE7F5', borderRadius: 20, backgroundColor: '#FFFFFF', ...theme.shadows.card },
  stepTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D6E4F7', borderRadius: 14, backgroundColor: '#EEF4FD' },
  stepNumber: { ...theme.typography.kistas, color: '#7B8798', fontSize: 10, letterSpacing: 1 },
  stepTitle: { marginTop: 24, color: '#25364E', fontSize: 20, lineHeight: 25, fontWeight: '700' },
  stepCopy: { marginTop: 8, color: '#5F6877', fontSize: 13, lineHeight: 21 },
  valuesSection: { marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 58, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#DFE8F3', backgroundColor: '#F9FBFE' },
  eyebrow: { ...theme.typography.kistas, color: '#3269C7', fontSize: 10, letterSpacing: 1.5 },
  sectionTitle: { maxWidth: 520, marginTop: 10, color: '#25364E', fontSize: 32, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  values: { gap: 10, marginTop: 26 },
  valueCard: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#DCE7F5', borderRadius: 18, backgroundColor: '#FFFFFF' },
  valueIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#EEF4FD' },
  valueCopy: { flex: 1 },
  valueTitle: { color: '#25364E', fontSize: 16, fontWeight: '700' },
  valueDescription: { marginTop: 4, color: '#5F6877', fontSize: 12, lineHeight: 18 },
  cta: { marginVertical: 58, padding: 24, borderRadius: 22, backgroundColor: '#25364E', alignItems: 'center', ...theme.shadows.floating },
  ctaTitle: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7, textAlign: 'center' },
  ctaCopy: { marginTop: 12, marginBottom: 22, color: '#CDD6E2', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  ctaPrimary: { width: '100%', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: '#FFFFFF' },
  ctaPrimaryText: { ...theme.typography.kistas, color: '#25364E' },
  ctaSecondary: { width: '100%', minHeight: 48, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#52637A', borderRadius: 14 },
  ctaSecondaryText: { ...theme.typography.kistas, color: '#FFFFFF' },
});
