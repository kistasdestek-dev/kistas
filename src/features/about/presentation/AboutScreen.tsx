import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { theme } from '../../../core/theme';

export interface AboutScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onOpenPrivacy?: () => void;
  onOpenFaq?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack, onExplore, onOpenPrivacy, onOpenFaq, onOpenHowItWorks, onOpenBlog }) => (
  <ScrollView decelerationRate={0.99} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <TouchableOpacity style={styles.back} onPress={onBack} accessibilityRole="button">
      <Ionicons name="arrow-back" size={17} color="#686474" />
      <Text style={styles.backText}>Geri dön</Text>
    </TouchableOpacity>
    <KistasTopBrandBar onPress={onBack} />
    <View style={styles.hero}>
      <Text style={styles.kicker}>KISTAS NEDİR?</Text>
      <Text style={styles.title}>Yeni fikirleri keşfet.</Text>
      <Text style={styles.titleAccent}>Sevdiğini destekle.</Text>
      <Text style={styles.lead}>Kıstas, yeni dijital ürünleri bulmanın en kolay yoludur. Kullanıcılar yeni favorilerini keşfeder, üreticiler doğru insanlara ulaşır.</Text>
    </View>
    <View style={styles.valueGrid}>
      {[
        ['compass-outline', 'Yeni bir ürün arıyorsan', 'Projeleri keşfet, incele ve beğendiğine destek ver.'],
        ['rocket-outline', 'Bir projen varsa', 'Projeni yayınla, doğru insanlara ulaş ve geri bildirimle büyüt.'],
      ].map(([icon, title, copy]) => (
        <View style={styles.valueCard} key={title}>
          <View style={styles.valueIcon}><Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={18} color="#3269C7" /></View>
          <View style={styles.valueCopy}><Text style={styles.valueTitle}>{title}</Text><Text style={styles.valueText}>{copy}</Text></View>
        </View>
      ))}
    </View>
    <Text style={styles.sectionKicker}>NASIL İŞLER?</Text>
    <Text style={styles.sectionTitle}>Üç basit adımda iyi fikirlerin büyümesine ortak ol.</Text>
    {[
      ['01', 'Yeni projelere göz at', 'Kategorileri gez ve ilgini çeken projeyi incele.'],
      ['02', 'Beğendiğine ses ver', 'Tek dokunuşla destek ol ve iyi fikri öne taşı.'],
      ['03', 'Gelişime ortak ol', 'Geri bildiriminle üreticiye yol göster.'],
    ].map(([number, title, copy]) => (
      <View style={styles.row} key={number}>
        <Text style={styles.number}>{number}</Text>
        <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowText}>{copy}</Text></View>
      </View>
    ))}
    <TouchableOpacity style={styles.cta} onPress={onExplore} accessibilityRole="button">
      <Text style={styles.ctaText}>Projeleri Keşfet</Text><Ionicons name="arrow-forward" size={17} color="#FAFBFD" />
    </TouchableOpacity>
    <CinematicFooter compact onOpenPrivacy={onOpenPrivacy} onOpenFaq={onOpenFaq} onOpenHowItWorks={onOpenHowItWorks} onOpenBlog={onOpenBlog} />
  </ScrollView>
);

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 80, backgroundColor: '#F3F6FB' },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 34, minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(50,105,199,0.16)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.72)' },
  backText: { ...theme.typography.kistas, color: '#686474' },
  hero: { marginTop: 30, marginBottom: 28 },
  kicker: { ...theme.typography.kistas, alignSelf: 'flex-start', color: '#3269C7', paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(50,105,199,0.16)', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.72)' },
  title: { marginTop: 18, color: '#25364E', fontSize: 43, lineHeight: 47, fontWeight: '700', letterSpacing: -1.8 },
  titleAccent: { color: '#3269C7', fontSize: 43, lineHeight: 47, fontWeight: '700', letterSpacing: -1.8 },
  lead: { marginTop: 18, color: '#5F6877', fontSize: 16, lineHeight: 25 },
  valueGrid: { gap: 10, marginBottom: 54 },
  valueCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderWidth: 1, borderColor: 'rgba(50,105,199,0.14)', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.82)' },
  valueIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#F0F5FC', borderWidth: 1, borderColor: 'rgba(50,105,199,0.16)' },
  valueCopy: { flex: 1 },
  valueTitle: { color: '#25364E', fontSize: 18, fontWeight: '700' },
  valueText: { marginTop: 4, color: '#5F6877', fontSize: 13, lineHeight: 19 },
  sectionKicker: { ...theme.typography.kistas, color: '#3269C7' },
  sectionTitle: { marginTop: 10, marginBottom: 24, color: '#25364E', fontSize: 31, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  row: { flexDirection: 'row', gap: 18, paddingVertical: 22, borderTopWidth: 1, borderTopColor: 'rgba(50,105,199,0.18)' },
  number: { ...theme.typography.kistas, color: '#3269C7' },
  rowCopy: { flex: 1 },
  rowTitle: { color: '#25364E', fontSize: 19, fontWeight: '700' },
  rowText: { marginTop: 5, color: '#5F6877', fontSize: 13, lineHeight: 20 },
  cta: { marginTop: 34, minHeight: 52, borderRadius: 14, backgroundColor: '#25364E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ctaText: { ...theme.typography.kistas, color: '#FAFBFD' },
});
