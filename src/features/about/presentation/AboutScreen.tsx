import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';

export interface AboutScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack, onExplore, onOpenPrivacy, onOpenSupport, onOpenHowItWorks, onOpenBlog }) => (
  <ScrollView decelerationRate={0.99} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <TouchableOpacity style={styles.back} onPress={onBack} accessibilityRole="button">
      <Ionicons name="arrow-back" size={17} color="#686474" />
      <Text style={styles.backText}>Geri dön</Text>
    </TouchableOpacity>
    <KistasTopBrandBar onPress={onBack} />
    <Text style={styles.kicker}>HAKKIMIZDA</Text>
    <Text style={styles.title}>İyi fikirler görünür olmayı hak eder.</Text>
    <Text style={styles.lead}>Kıstas, bağımsız dijital ürünleri onları gerçekten merak eden insanlarla buluşturan adil keşif vitrinidir.</Text>
    {[
      ['01', 'Yayınla', 'Ürününü ve hikâyeni toplulukla paylaş.'],
      ['02', 'Keşfedil', 'Doğru kategori ve adil vitrinle görünür ol.'],
      ['03', 'Büyü', 'Gerçek destek ve geri bildirimle geliş.'],
    ].map(([number, title, copy]) => (
      <View style={styles.row} key={number}>
        <Text style={styles.number}>{number}</Text>
        <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowText}>{copy}</Text></View>
      </View>
    ))}
    <TouchableOpacity style={styles.cta} onPress={onExplore} accessibilityRole="button">
      <Text style={styles.ctaText}>Keşfetmeye Başla</Text><Ionicons name="arrow-forward" size={17} color="#FAFBFD" />
    </TouchableOpacity>
    <CinematicFooter compact onOpenPrivacy={onOpenPrivacy} onOpenSupport={onOpenSupport} onOpenHowItWorks={onOpenHowItWorks} onOpenBlog={onOpenBlog} />
  </ScrollView>
);

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 80 },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 46 },
  backText: { color: '#686474', fontSize: 12, fontWeight: '700' },
  kicker: { marginTop: 34, color: '#3269C7', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { marginTop: 12, color: '#25364E', fontSize: 42, lineHeight: 47, fontWeight: '700' },
  lead: { marginTop: 10, marginBottom: 44, color: '#686474', fontSize: 16, lineHeight: 25 },
  row: { flexDirection: 'row', gap: 18, paddingVertical: 22, borderTopWidth: 1, borderTopColor: 'rgba(50,105,199,0.18)' },
  number: { color: '#3269C7', fontSize: 11, fontWeight: '700' },
  rowCopy: { flex: 1 },
  rowTitle: { color: '#25364E', fontSize: 19, fontWeight: '700' },
  rowText: { marginTop: 5, color: '#686474', fontSize: 13, lineHeight: 20 },
  cta: { marginTop: 34, minHeight: 48, borderRadius: 8, backgroundColor: '#25364E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ctaText: { color: '#FAFBFD', fontSize: 13, fontWeight: '700' },
});
