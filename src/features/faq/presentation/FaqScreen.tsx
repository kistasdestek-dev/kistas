import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../../core/theme';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';

export interface FaqScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onOpenSupport: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

type FaqCategory = 'Tümü' | 'Keşfet' | 'Destek' | 'Proje' | 'Vitrin Kredisi' | 'Hesap';

const FAQS = [
  { category: 'Keşfet', question: 'Projeler nerede görünür?', answer: 'Onaylanan projeler Göz At alanında kendi kategorisinde yer alır. İlk 30 gün Yeni Çıkanlar bölümünde de görünür.' },
  { category: 'Keşfet', question: 'Popüler sıralama nasıl oluşur?', answer: 'Popüler projeler, kullanıcılardan aldıkları kalıcı destek sayısına göre sıralanır.' },
  { category: 'Destek', question: 'Bir projeye nasıl destek veririm?', answer: 'Proje sayfasındaki Destekle butonuna dokunman yeterli. Verdiğin destek kalıcıdır ve geri alınamaz.' },
  { category: 'Destek', question: 'Aynı projeye tekrar destek verebilir miyim?', answer: 'Hayır. Her hesap bir projeye bir kez destek verebilir. Böylece sıralama gerçek topluluk ilgisini yansıtır.' },
  { category: 'Proje', question: 'Projemi nasıl yayınlarım?', answer: 'Lansman alanından proje bilgilerini ve görsellerini ekle. İnceleme tamamlandığında projen vitrinde yayına alınır.' },
  { category: 'Proje', question: 'Hangi projeler kabul edilir?', answer: 'Çalışan, yasalara uygun ve açıkça anlatılan dijital ürünler kabul edilir. Yanıltıcı veya eksik başvurular yayınlanmaz.' },
  { category: 'Vitrin Kredisi', question: 'Vitrin kredisi ne işe yarar?', answer: 'Vitrin kredisi projenin Sponsorlu Vitrin rotasyonuna katılmasını sağlar. Tek seferlik kullanılır; abonelik değildir.' },
  { category: 'Vitrin Kredisi', question: 'Sponsorlu projeler sürekli en üstte mi kalır?', answer: 'Hayır. Sponsorlu projeler saatlik eşit rotasyona girer. Tek bir proje vitrini sürekli kaplayamaz.' },
  { category: 'Hesap', question: 'Kıstas’ı kullanmak ücretli mi?', answer: 'Projeleri keşfetmek ve desteklemek ücretsizdir. Vitrin kredileri yalnızca isteğe bağlı sponsorlu görünürlük içindir.' },
  { category: 'Hesap', question: 'Hesabımla ilgili yardımı nasıl alırım?', answer: 'Bu sayfadaki yanıt yeterli değilse Ekibimize Yaz butonuyla destek görüşmesi başlatabilirsin.' },
] as const;

const CATEGORIES: FaqCategory[] = ['Tümü', 'Keşfet', 'Destek', 'Proje', 'Vitrin Kredisi', 'Hesap'];
const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').trim();

export const FaqScreen: React.FC<FaqScreenProps> = ({ onBack, onExplore, onOpenSupport, onOpenAbout, onOpenPrivacy, onOpenHowItWorks, onOpenBlog }) => {
  const [category, setCategory] = useState<FaqCategory>('Tümü');
  const [query, setQuery] = useState('');
  const [openQuestion, setOpenQuestion] = useState<string | null>(FAQS[0].question);
  const visibleFaqs = useMemo(() => {
    const term = normalize(query);
    return FAQS.filter((item) => (category === 'Tümü' || item.category === category)
      && (!term || normalize(`${item.question} ${item.answer} ${item.category}`).includes(term)));
  }, [category, query]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.back} onPress={onBack} accessibilityRole="button">
        <Ionicons name="arrow-back" size={16} color="#686474" /><Text style={styles.smallLabel}>Geri dön</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={styles.kickerPill}><Text style={styles.kicker}>MERAK ETTİĞİN HER ŞEY</Text></View>
        <Text style={styles.title}>Sorularının cevabı</Text><Text style={styles.titleAccent}>burada.</Text>
        <Text style={styles.lead}>Kıstas'ı keşfetmek, destek vermek veya projenle büyümek için bilmen gerekenler.</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#3269C7" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Bir soru ara" placeholderTextColor="#8792A2" style={styles.searchInput} accessibilityLabel="SSS içinde ara" />
        {query ? <TouchableOpacity style={styles.clearButton} onPress={() => setQuery('')} accessibilityLabel="Aramayı temizle"><Ionicons name="close" size={18} color="#3269C7" /></TouchableOpacity> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {CATEGORIES.map((item) => (
          <TouchableOpacity style={[styles.category, category === item && styles.categoryActive]} onPress={() => setCategory(item)} key={item}>
            <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.list}>
        {visibleFaqs.map((item) => {
          const isOpen = openQuestion === item.question;
          return (
            <View style={styles.item} key={item.question}>
              <TouchableOpacity style={styles.question} onPress={() => setOpenQuestion(isOpen ? null : item.question)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
                <Text style={styles.questionText}>{item.question}</Text>
                <View style={styles.questionIcon}><Ionicons name={isOpen ? 'remove' : 'add'} size={19} color="#3269C7" /></View>
              </TouchableOpacity>
              {isOpen ? <Text style={styles.answer}>{item.answer}</Text> : null}
            </View>
          );
        })}
        {!visibleFaqs.length ? <Text style={styles.empty}>Bu aramayla eşleşen bir soru bulamadık.</Text> : null}
      </View>

      <View style={styles.help}>
        <Text style={styles.helpTitle}>Yanıtını bulamadın mı?</Text>
        <Text style={styles.helpCopy}>Ekibimize yaz. Hesabın veya projen için birlikte çözüm bulalım.</Text>
        <TouchableOpacity style={styles.helpButton} onPress={onOpenSupport} accessibilityRole="button">
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#25364E" /><Text style={styles.helpButtonText}>Ekibimize Yaz</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.exploreButton} onPress={onExplore} accessibilityRole="button">
        <Ionicons name="compass-outline" size={16} color="#3269C7" /><Text style={styles.exploreText}>Projeleri Keşfet</Text>
      </TouchableOpacity>
      <CinematicFooter compact onOpenAbout={onOpenAbout} onOpenPrivacy={onOpenPrivacy} onOpenHowItWorks={onOpenHowItWorks} onOpenBlog={onOpenBlog} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 70, backgroundColor: '#F3F6FB' },
  back: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#DCE7F5', borderRadius: 12, backgroundColor: '#FFFFFF', ...theme.shadows.soft },
  smallLabel: { ...theme.typography.kistas, color: '#686474' },
  hero: { alignItems: 'center', paddingTop: 46, paddingBottom: 28 },
  kickerPill: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#DCE7F5', borderRadius: 999, backgroundColor: '#FFFFFF' },
  kicker: { ...theme.typography.kistas, color: '#3269C7', fontSize: 10, letterSpacing: 1.4 },
  title: { marginTop: 20, color: '#25364E', fontSize: 40, lineHeight: 42, fontWeight: '700', letterSpacing: -1.5, textAlign: 'center' },
  titleAccent: { color: '#3269C7', fontSize: 40, lineHeight: 42, fontWeight: '700', letterSpacing: -1.5, textAlign: 'center' },
  lead: { marginTop: 17, color: '#5F6877', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  searchBox: { height: 58, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#D7E4F5', borderRadius: 17, backgroundColor: '#FFFFFF', ...theme.shadows.card },
  searchInput: { flex: 1, color: '#25364E', fontSize: 14, fontWeight: '600' },
  clearButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#EEF4FD' },
  categories: { gap: 8, paddingVertical: 20 },
  category: { minHeight: 38, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DCE7F5', borderRadius: 999, backgroundColor: '#FFFFFF' },
  categoryActive: { borderColor: '#3269C7', backgroundColor: '#3269C7' },
  categoryText: { ...theme.typography.kistas, color: '#68758A', fontSize: 11 },
  categoryTextActive: { color: '#FFFFFF' },
  list: { gap: 10 },
  item: { overflow: 'hidden', borderWidth: 1, borderColor: '#DCE7F5', borderRadius: 18, backgroundColor: '#FFFFFF' },
  question: { minHeight: 68, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 15 },
  questionText: { flex: 1, color: '#25364E', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  questionIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#EEF4FD' },
  answer: { paddingHorizontal: 18, paddingBottom: 20, color: '#5F6877', fontSize: 13, lineHeight: 21 },
  empty: { padding: 34, borderWidth: 1, borderStyle: 'dashed', borderColor: '#BCD0EA', borderRadius: 18, color: '#68758A', textAlign: 'center' },
  help: { marginTop: 38, padding: 24, borderRadius: 22, backgroundColor: '#25364E', alignItems: 'center', ...theme.shadows.floating },
  helpTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  helpCopy: { marginTop: 9, color: '#CDD6E2', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  helpButton: { width: '100%', minHeight: 50, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: '#FFFFFF' },
  helpButtonText: { ...theme.typography.kistas, color: '#25364E' },
  exploreButton: { alignSelf: 'flex-start', minHeight: 42, marginTop: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#DCE7F5', borderRadius: 12, backgroundColor: '#FFFFFF' },
  exploreText: { ...theme.typography.kistas, color: '#3269C7' },
});
