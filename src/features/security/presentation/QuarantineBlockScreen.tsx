import React, { useState } from 'react';
import {
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../core/theme';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';

interface QuarantineBlockScreenProps {
  onRetry: () => Promise<void> | void;
}

export const QuarantineBlockScreen: React.FC<QuarantineBlockScreenProps> = ({ onRetry }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('[Kıstas WAF] Karantina İnceleme Talebi');
    const body = encodeURIComponent(
      'Merhaba Kıstas Güvenlik Ekibi,\n\nErişimim Kıstas WAF tarafından sınırlandırıldı. Lütfen güvenlik incelemesi başlatır mısınız?\n\nTarih: ' +
        new Date().toISOString()
    );
    Linking.openURL(`mailto:destek@kistas.com?subject=${subject}&body=${body}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F1F5FA" />
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Üst Kart / Hero */}
        <LinearGradient
          colors={['#173B72', '#2858AA', '#3269C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.shieldIconWrapper}>
            <Ionicons name="shield-half" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Kıstas WAF Güvenlik Duvarı</Text>
          <Text style={styles.heroSubtitle}>
            Bağlantı aktif siber güvenlik protokolleri gereğince durduruldu.
          </Text>
        </LinearGradient>

        {/* Bilgilendirme ve Dosya Kartı */}
        <View style={styles.contentCard}>
          <View style={styles.badgeRow}>
            <View style={styles.errorBadge}>
              <View style={styles.errorDot} />
              <Text style={styles.errorBadgeText}>Karantina Durumu: AKTİF (WAF-403)</Text>
            </View>
          </View>

          <Text style={styles.cardSectionTitle}>Erişim Kısıtlaması Gerekçesi</Text>
          <Text style={styles.cardDescription}>
            Bu cihaz, oturum veya ağ adresi üzerinden şüpheli saldırı, pentest aracı taraması veya platform kural dışı
            hareketleri tespit edildiği için bağlantınız Sayra WAF tarafından koruma kalkanına alınmıştır.
          </Text>

          <View style={styles.protocolBox}>
            <View style={styles.protocolHeader}>
              <Ionicons name="lock-closed" size={16} color="#173B72" />
              <Text style={styles.protocolTitle}>Sıfır Tolerans & Pars DevState İlkesi</Text>
            </View>
            <Text style={styles.protocolText}>
              Platform bütünlüğü ve kullanıcı verilerinin güvenliği için yetkisiz parametre yoklamaları ve otomatik fuzzer
              istekleri anında karantinaya yönlendirilir.
            </Text>
          </View>

          {/* Aksiyon Butonları */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, isRetrying && styles.buttonDisabled]}
              onPress={handleRetry}
              disabled={isRetrying}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>
                {isRetrying ? 'Kalkan Denetleniyor...' : 'Durumu Yeniden Kontrol Et'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleContactSupport}
              activeOpacity={0.85}
            >
              <Ionicons name="mail-unread-outline" size={18} color="#173B72" style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Güvenlik Ekibine Başvur</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alt Bilgi */}
        <View style={styles.footerRow}>
          <GlassIconButton
            icon="shield-checkmark"
            size={36}
            iconSize={18}
            disabled
            accessibilityLabel="Kıstas Fortress"
          />
          <Text style={styles.footerText}>KISTAS FORTRESS v3.0 · SAYRA DEFENSE SHIELD</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F1F5FA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#173B72',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 10px 28px rgba(23, 59, 114, 0.22)',
      },
    }),
  },
  shieldIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  heroTitle: {
    ...theme.typography.kistas,
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    ...theme.typography.kistas,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 380,
  },
  contentCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D8E2EE',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#173B72',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
      },
    }),
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  errorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginRight: 8,
  },
  errorBadgeText: {
    ...theme.typography.kistas,
    fontSize: 12,
    color: '#991B1B',
  },
  cardSectionTitle: {
    ...theme.typography.kistas,
    fontSize: 16,
    color: '#173B72',
    marginBottom: 8,
  },
  cardDescription: {
    ...theme.typography.kistas,
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  protocolBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  protocolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  protocolTitle: {
    ...theme.typography.kistas,
    fontSize: 13,
    color: '#173B72',
  },
  protocolText: {
    ...theme.typography.kistas,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    ...theme.typography.kistas,
    fontSize: 14,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5FA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#C7DAF4',
  },
  secondaryButtonText: {
    ...theme.typography.kistas,
    fontSize: 14,
    color: '#173B72',
  },
  buttonIcon: {
    marginRight: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerText: {
    ...theme.typography.kistas,
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.2,
  },
});
