import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { SecurityEnforcementService } from '../../security/application/SecurityEnforcementService';
import { AdminService } from '../application/AdminService';
import { ThreatEvent, ThreatIntelOverview, ThreatSeverity } from '../domain/ThreatIntelModels';

interface ThreatIntelligenceViewProps {
  onRefreshStats?: () => void;
}

export const ThreatIntelligenceView: React.FC<ThreatIntelligenceViewProps> = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [overview, setOverview] = useState<ThreatIntelOverview | null>(null);
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Aşama 2 & 4: Görünüm Modu, Bloklistesi ve VDP Arama
  const [viewMode, setViewMode] = useState<'stream' | 'blocklist' | 'vdp'>('stream');
  const [blocklistSearch, setBlocklistSearch] = useState('');
  const [vdpSearch, setVdpSearch] = useState('');

  // Manuel WAF ve Temizleme Durumları
  const [showManualBlock, setShowManualBlock] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [isBlockingManual, setIsBlockingManual] = useState(false);
  const [isClearingMock, setIsClearingMock] = useState(false);

  const loadThreatData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const [overviewData, eventsData] = await Promise.all([
        AdminService.getThreatIntelOverview(),
        AdminService.getThreatEvents(50, 0, selectedSeverity || undefined),
      ]);
      setOverview(overviewData);
      setEvents(eventsData);
    } catch {
      // Fallback grace
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [selectedSeverity]);

  useEffect(() => {
    loadThreatData();
    const timer = setInterval(() => {
      loadThreatData(true);
    }, 10000); // 10 saniyede bir sessiz canlı tehdit radarı yenilemesi
    return () => clearInterval(timer);
  }, [loadThreatData]);

  const quarantinedEvents = useMemo(() => {
    return events.filter((e) => {
      if (!e.isQuarantined) return false;
      if (!blocklistSearch.trim()) return true;
      const q = blocklistSearch.trim().toLowerCase();
      return (
        (e.ipAddress && e.ipAddress.toLowerCase().includes(q)) ||
        (e.attackVector && e.attackVector.toLowerCase().includes(q)) ||
        (e.payloadSnapshot && e.payloadSnapshot.toLowerCase().includes(q)) ||
        (e.threatActorName && e.threatActorName.toLowerCase().includes(q)) ||
        (e.toolFingerprint && e.toolFingerprint.toLowerCase().includes(q))
      );
    });
  }, [events, blocklistSearch]);

  const totalQuarantinedCount = useMemo(() => {
    return events.filter((e) => e.isQuarantined).length;
  }, [events]);

  const vdpEvents = useMemo(() => {
    return events.filter((e) => {
      const isVdp =
        e.attackVector === 'VULNERABILITY_DISCLOSURE_REPORT' ||
        e.toolFingerprint === 'Responsible Security Researcher' ||
        (e.payloadSnapshot && e.payloadSnapshot.toLowerCase().includes('researcher:'));
      if (!isVdp) return false;
      if (!vdpSearch.trim()) return true;
      const q = vdpSearch.trim().toLowerCase();
      return (
        (e.ipAddress && e.ipAddress.toLowerCase().includes(q)) ||
        (e.payloadSnapshot && e.payloadSnapshot.toLowerCase().includes(q)) ||
        (e.threatActorEmail && e.threatActorEmail.toLowerCase().includes(q))
      );
    });
  }, [events, vdpSearch]);

  const parseVdpPayload = (payload: string) => {
    const emailMatch = payload.match(/Researcher:\s*([^|]+)/i);
    const titleMatch = payload.match(/Title:\s*([^|]+)/i);
    const notesMatch = payload.match(/Notes:\s*(.*)$/is);
    return {
      email: emailMatch ? emailMatch[1].trim() : 'Gizli / Belirtilmedi',
      title: titleMatch ? titleMatch[1].trim() : 'Sorumlu Zafiyet Bildirimi',
      notes: notesMatch ? notesMatch[1].trim() : payload,
    };
  };

  const handleCopyEmail = (email: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(email).catch(() => {});
    }
    Alert.alert('E-Posta Kopyalandı', `${email} panoya kopyalandı.`);
  };

  const handleMailResearcher = (email: string, title: string) => {
    if (!email || email === 'Gizli / Belirtilmedi') {
      Alert.alert('E-Posta Bulunamadı', 'Bu bildirimde geçerli bir e-posta adresi belirtilmemiş.');
      return;
    }
    const subject = encodeURIComponent(`Kıstas Güvenlik Ekibi: ${title}`);
    const body = encodeURIComponent(
      `Merhaba,\n\nKıstas platformuna ilettiğiniz sorumlu zafiyet bildirimi için teşekkür ederiz.\n\nSaygılarımızla,\nKıstas Savunma & Siber Güvenlik Ekibi`
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
      handleCopyEmail(email);
    });
  };

  const handleCopyIp = (ip: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ip).catch(() => {});
    }
    Alert.alert('IP Kopyalandı', `${ip} panoya kopyalandı.`);
  };

  const handleToggleQuarantine = async (event: ThreatEvent) => {
    setActionInProgressId(event.id);
    try {
      if (event.isQuarantined) {
        const res = await AdminService.releaseThreatActor(event.id);
        if (res.success) {
          SecurityEnforcementService.clearCache();
          Alert.alert('Karantina Kaldırıldı', 'Saldırgan serbest bırakıldı ve WAF engeli kaldırıldı.');
          loadThreatData();
        } else {
          Alert.alert('Hata', res.error || 'İşlem başarısız.');
        }
      } else {
        const res = await AdminService.quarantineThreatActor(
          event.id,
          `${event.attackVector} saldırı denemesi nedeniyle karantinaya alındı.`
        );
        if (res.success) {
          SecurityEnforcementService.clearCache();
          Alert.alert('Karantinaya Alındı', 'Saldırgan IP ve hesabı aktif güvenlik duvarında engellendi.');
          loadThreatData();
        } else {
          Alert.alert('Hata', res.error || 'İşlem başarısız.');
        }
      }
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleManualBlock = async () => {
    const trimmedIp = manualIp.trim();
    if (!trimmedIp || trimmedIp.length < 7) {
      Alert.alert('Eksik Bilgi', 'Lütfen geçerli bir IPv4 veya IPv6 adresi girin.');
      return;
    }
    setIsBlockingManual(true);
    try {
      const res = await AdminService.manualQuarantineIp(trimmedIp, manualReason);
      if (res.success) {
        SecurityEnforcementService.clearCache();
        Alert.alert('Karantina Devrede', `${trimmedIp} adresi aktif güvenlik duvarı kuralına eklendi ve engellendi.`);
        setManualIp('');
        setManualReason('');
        setShowManualBlock(false);
        loadThreatData();
      } else {
        Alert.alert('Hata', res.error || 'Engelleme başarısız.');
      }
    } finally {
      setIsBlockingManual(false);
    }
  };

  const handleClearMockEvents = async () => {
    Alert.alert(
      'Simülasyon Verilerini Temizle',
      'Veritabanındaki başlangıç tatbikat/test kayıtları silinecek ve bundan sonra yalnızca sisteme vuran gerçek saldırılar gösterilecektir. Onaylıyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            setIsClearingMock(true);
            try {
              const res = await AdminService.clearMockThreatEvents();
              if (res.success) {
                Alert.alert('Başarılı', `${res.deletedCount ?? 0} adet test kaydı silindi. Artık yalnız gerçek veriler gösterilecek.`);
                loadThreatData();
              } else {
                Alert.alert('Hata', res.error || 'Temizleme başarısız.');
              }
            } finally {
              setIsClearingMock(false);
            }
          },
        },
      ]
    );
  };

  const getSeverityBadge = (sev: ThreatSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return { label: 'KRİTİK', bg: 'rgba(189,53,76,0.10)', text: '#BD354C', border: 'rgba(189,53,76,0.28)' };
      case 'HIGH':
        return { label: 'YÜKSEK', bg: 'rgba(147,100,19,0.10)', text: '#936413', border: 'rgba(147,100,19,0.28)' };
      case 'MEDIUM':
        return { label: 'ORTA', bg: 'rgba(50,105,199,0.10)', text: '#3269C7', border: 'rgba(50,105,199,0.25)' };
      default:
        return { label: 'DÜŞÜK', bg: 'rgba(104,116,138,0.10)', text: '#68758A', border: 'rgba(104,116,138,0.22)' };
    }
  };

  const getActionBadge = (action: string, vector?: string) => {
    if (vector === 'VULNERABILITY_DISCLOSURE_REPORT') {
      return { label: '🛡️ Sorumlu Zafiyet Raporu (VDP)', color: '#187657', bg: 'rgba(24,118,87,0.08)', border: 'rgba(24,118,87,0.25)' };
    }
    if (vector === 'CLICKJACKING_IFRAME_EMBED') {
      return { label: '🌐 Web Anti-Clickjacking Kalkanı', color: '#3269C7', bg: 'rgba(50,105,199,0.08)', border: 'rgba(50,105,199,0.25)' };
    }
    if (vector === 'DOM_XSS_SQLI_INJECTION') {
      return { label: '🛡️ Canlı Girdi & Payload Kalkanı', color: '#936413', bg: 'rgba(147,100,19,0.08)', border: 'rgba(147,100,19,0.25)' };
    }
    switch (action) {
      case 'HONEYPOT_DECEIVED':
        return { label: '🍯 Bal Küpü Tuzağına Düştü', color: '#936413', bg: 'rgba(147,100,19,0.08)', border: 'rgba(147,100,19,0.25)' };
      case 'SILENT_NULL_ROUTED':
        return { label: '🛡️ Sessizce Yutuldu (Null-Route)', color: '#187657', bg: 'rgba(24,118,87,0.08)', border: 'rgba(24,118,87,0.25)' };
      case 'QUARANTINED':
        return { label: '⛓️ Karantinada', color: '#BD354C', bg: 'rgba(189,53,76,0.08)', border: 'rgba(189,53,76,0.25)' };
      default:
        return { label: '👁️ Gözlemlendi & Kaydedildi', color: '#3269C7', bg: 'rgba(50,105,199,0.08)', border: 'rgba(50,105,199,0.25)' };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, isMobile && styles.contentContainerMobile]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. KISTAS ROYAL BLUE SAVUNMA HERO KARTI */}
      <View style={styles.heroWrapper}>
        <LinearGradient
          colors={['#173B72', '#2858AA', '#3269C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, isMobile && styles.heroCardMobile]}
        >
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTopRow}>
            <View style={styles.authorityPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseText}>SAYRA SAVUNMA RADARI AKTİF</Text>
            </View>

            <View style={styles.heroActionsRow}>
              <GlassIconButton
                icon="refresh-outline"
                size={36}
                iconSize={18}
                iconColor="#3269C7"
                onPress={loadThreatData}
                accessibilityLabel="Verileri Yenile"
              />
            </View>
          </View>

          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
            Siber Tehdit ve Bal Küpü Radarı
          </Text>
          <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
            Pars DevState güvenlik motoruyla senkronize; sisteme vuran pentest tarayıcılarını ve anormal istekleri tespit eder, tuzaklarla aldatır ve verilerini toplar.
          </Text>

          {/* Hızlı WAF Aksiyonları */}
          <View style={styles.heroQuickBar}>
            <TouchableOpacity
              style={styles.heroWafBtn}
              onPress={() => setShowManualBlock(!showManualBlock)}
              activeOpacity={0.8}
            >
              <Ionicons name={showManualBlock ? 'close-circle-outline' : 'shield-outline'} size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.heroWafBtnText}>{showManualBlock ? 'WAF Panelini Kapat' : 'Manuel IP Engelle (WAF)'}</Text>
            </TouchableOpacity>

            {events.length > 0 ? (
              <TouchableOpacity
                style={styles.heroClearBtn}
                onPress={handleClearMockEvents}
                disabled={isClearingMock}
                activeOpacity={0.8}
              >
                {isClearingMock ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.heroClearBtnText}>Test Loglarını Temizle</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>
      </View>

      {/* MANUEL IP ENGELLEME (WAF KURALI) FORMU */}
      {showManualBlock ? (
        <View style={styles.manualBlockCard}>
          <View style={styles.manualHeader}>
            <View style={styles.manualIconWrap}>
              <Ionicons name="shield-half-outline" size={18} color="#BD354C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.manualTitle}>Manuel Güvenlik Duvarı Engeli</Text>
              <Text style={styles.manualSubtitle}>Belirttiğiniz IP adresi anında tüm platform genelinde karantinaya alınır.</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Engellenecek IP Adresi</Text>
            <TextInput
              style={styles.textInput}
              value={manualIp}
              onChangeText={setManualIp}
              placeholder="Örn: 185.190.141.22"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Engelleme Gerekçesi</Text>
            <TextInput
              style={styles.textInput}
              value={manualReason}
              onChangeText={setManualReason}
              placeholder="Örn: Şüpheli tünel / API brute-force denemesi"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.manualActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowManualBlock(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Vazgeç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBlockBtn}
              onPress={handleManualBlock}
              disabled={isBlockingManual}
              activeOpacity={0.8}
            >
              {isBlockingManual ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBlockBtnText}>WAF Karantinasına Al</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* 2. KISTAS BEYAZ METRİK KARTLARI (2x2 Grid) */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, isMobile && styles.metricCardMobile]}>
          <View style={styles.metricTopRow}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(189,53,76,0.10)' }]}>
              <Ionicons name="warning-outline" size={18} color="#BD354C" />
            </View>
            <View style={[styles.miniBadge, { backgroundColor: 'rgba(189,53,76,0.08)' }]}>
              <Text style={[styles.miniBadgeText, { color: '#BD354C' }]}>Engellendi</Text>
            </View>
          </View>
          <Text style={[styles.metricValue, isMobile && styles.metricValueMobile]}>
            {overview?.totalThreats ?? 0}
          </Text>
          <Text style={styles.metricLabel}>Engellenen Tehdit</Text>
        </View>

        <View style={[styles.metricCard, isMobile && styles.metricCardMobile]}>
          <View style={styles.metricTopRow}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(147,100,19,0.10)' }]}>
              <Ionicons name="fish-outline" size={18} color="#936413" />
            </View>
            <View style={[styles.miniBadge, { backgroundColor: 'rgba(147,100,19,0.08)' }]}>
              <Text style={[styles.miniBadgeText, { color: '#936413' }]}>Tuzak</Text>
            </View>
          </View>
          <Text style={[styles.metricValue, isMobile && styles.metricValueMobile]}>
            {overview?.honeypotTrapped ?? 0}
          </Text>
          <Text style={styles.metricLabel}>Bal Küpü Tuzağı</Text>
        </View>

        <View style={[styles.metricCard, isMobile && styles.metricCardMobile]}>
          <View style={styles.metricTopRow}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(24,118,87,0.10)' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#187657" />
            </View>
            <View style={[styles.miniBadge, { backgroundColor: 'rgba(24,118,87,0.08)' }]}>
              <Text style={[styles.miniBadgeText, { color: '#187657' }]}>Eritildi</Text>
            </View>
          </View>
          <Text style={[styles.metricValue, isMobile && styles.metricValueMobile]}>
            {overview?.nullRouted ?? 0}
          </Text>
          <Text style={styles.metricLabel}>Sessiz Yutma</Text>
        </View>

        <View style={[styles.metricCard, isMobile && styles.metricCardMobile]}>
          <View style={styles.metricTopRow}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(50,105,199,0.10)' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#3269C7" />
            </View>
            <View style={[styles.miniBadge, { backgroundColor: 'rgba(50,105,199,0.08)' }]}>
              <Text style={[styles.miniBadgeText, { color: '#3269C7' }]}>Aktif</Text>
            </View>
          </View>
          <Text style={[styles.metricValue, isMobile && styles.metricValueMobile]}>
            {overview?.quarantinedActors ?? 0}
          </Text>
          <Text style={styles.metricLabel}>Karantinada</Text>
        </View>
      </View>

      {/* 3. İSTİHBARAT PANELLERİ (Hedef Vektörler & Pentest Araçları) */}
      <View style={[styles.intelligenceBanner, isMobile && styles.intelligenceBannerMobile]}>
        <View style={styles.intelCard}>
          <View style={styles.intelHeaderRow}>
            <View style={[styles.intelIconBox, { backgroundColor: 'rgba(189,53,76,0.10)' }]}>
              <Ionicons name="locate-outline" size={15} color="#BD354C" />
            </View>
            <View>
              <Text style={styles.intelTitle}>En Çok Hedeflenen Vektörler</Text>
              <Text style={styles.intelSubtitle}>Saldırganların yokladığı zayıf noktalar</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            {(overview?.topVectors || []).length === 0 ? (
              <Text style={styles.emptyChipText}>Kayıtlı saldırı vektörü bulunmuyor.</Text>
            ) : (
              (overview?.topVectors || []).map((v, i) => (
                <View key={i} style={styles.vectorChip}>
                  <Text style={styles.vectorChipText}>{v.attack_vector} ({v.count})</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.intelCard}>
          <View style={styles.intelHeaderRow}>
            <View style={[styles.intelIconBox, { backgroundColor: 'rgba(50,105,199,0.10)' }]}>
              <Ionicons name="flash-outline" size={15} color="#3269C7" />
            </View>
            <View>
              <Text style={styles.intelTitle}>Tespit Edilen Pentest Araçları</Text>
              <Text style={styles.intelSubtitle}>Filtrelenen scanner ve bot imzaları</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            {(overview?.topTools || []).length === 0 ? (
              <Text style={styles.emptyChipText}>Kayıtlı tarayıcı aracı bulunmuyor.</Text>
            ) : (
              (overview?.topTools || []).map((t, i) => (
                <View key={i} style={styles.toolChip}>
                  <Ionicons name="bug-outline" size={12} color="#3269C7" style={{ marginRight: 4 }} />
                  <Text style={styles.toolChipText}>{t.tool_fingerprint}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      {/* 4. GÖRÜNÜM MODU SEÇİCİ (Canlı Akış vs WAF Bloklistesi) */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'stream' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('stream')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="pulse-outline"
            size={16}
            color={viewMode === 'stream' ? '#FFFFFF' : '#173B72'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.viewModeBtnText, viewMode === 'stream' && styles.viewModeBtnTextActive]}>
            Canlı Tehdit Akışı ({events.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'blocklist' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('blocklist')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="shield-half"
            size={16}
            color={viewMode === 'blocklist' ? '#FFFFFF' : '#173B72'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.viewModeBtnText, viewMode === 'blocklist' && styles.viewModeBtnTextActive]}>
            WAF Bloklistesi ({totalQuarantinedCount})
          </Text>
          {totalQuarantinedCount > 0 ? (
            <View style={[styles.viewModeBadge, viewMode === 'blocklist' && styles.viewModeBadgeActive]}>
              <Text style={[styles.viewModeBadgeText, viewMode === 'blocklist' && styles.viewModeBadgeTextActive]}>
                {totalQuarantinedCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'vdp' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('vdp')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={viewMode === 'vdp' ? '#FFFFFF' : '#173B72'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.viewModeBtnText, viewMode === 'vdp' && styles.viewModeBtnTextActive]}>
            VDP Bildirimleri ({vdpEvents.length})
          </Text>
          {vdpEvents.length > 0 ? (
            <View style={[styles.viewModeBadge, viewMode === 'vdp' && styles.viewModeBadgeActive, { backgroundColor: '#187657' }]}>
              <Text style={[styles.viewModeBadgeText, { color: '#FFFFFF' }]}>
                {vdpEvents.length}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {viewMode === 'vdp' ? (
        /* VDP (SORUMLU ZAFİYET BİLDİRİMLERİ) YÖNETİCİSİ */
        <View style={styles.vdpSection}>
          <View style={styles.vdpHeaderRow}>
            <View style={styles.sectionHeading}>
              <GlassIconButton icon="shield-checkmark" size={38} iconSize={19} iconColor="#187657" />
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Sorumlu Zafiyet Bildirimleri (VDP)</Text>
                <Text style={styles.sectionSubtitle}>RFC 9116 ve /security portalından iletilen teknik bulgular</Text>
              </View>
            </View>

            <View style={styles.vdpSummaryBadge}>
              <Ionicons name="document-text-outline" size={14} color="#187657" style={{ marginRight: 6 }} />
              <Text style={styles.vdpSummaryBadgeText}>{vdpEvents.length} Bildirim</Text>
            </View>
          </View>

          {/* Arama Çubuğu */}
          <View style={styles.blocklistSearchRow}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              style={styles.blocklistSearchInput}
              value={vdpSearch}
              onChangeText={setVdpSearch}
              placeholder="Araştırmacı e-posta, başlık veya bulgu ara..."
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {vdpSearch ? (
              <TouchableOpacity onPress={() => setVdpSearch('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {vdpEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <GlassIconButton icon="shield-checkmark" size={54} iconSize={28} iconColor="#187657" />
              <Text style={styles.emptyTitle}>Kayıtlı Zafiyet Bildirimi Bulunmuyor</Text>
              <Text style={styles.emptySubtitle}>
                Güvenlik araştırmacıları /security portalı veya security.txt (RFC 9116) üzerinden bulgularını ilettiğinde bu panelde listelenecektir.
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {vdpEvents.map((event) => {
                const parsed = parseVdpPayload(event.payloadSnapshot);
                return (
                  <View key={event.id} style={styles.vdpCard}>
                    {/* Üst Satır: Rozet & Tarih */}
                    <View style={styles.vdpCardTop}>
                      <View style={styles.vdpResearcherBadge}>
                        <Ionicons name="ribbon-outline" size={14} color="#187657" style={{ marginRight: 6 }} />
                        <Text style={styles.vdpResearcherBadgeText}>Güvenlik Araştırmacısı Bildirimi</Text>
                      </View>

                      <View style={styles.vdpDateBadge}>
                        <Ionicons name="time-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.vdpDateText}>
                          {new Date(event.detectedAt).toLocaleString('tr-TR')}
                        </Text>
                      </View>
                    </View>

                    {/* Araştırmacı E-Postası */}
                    <View style={styles.vdpEmailRow}>
                      <View style={styles.vdpEmailBox}>
                        <Ionicons name="mail-outline" size={15} color="#173B72" style={{ marginRight: 6 }} />
                        <Text style={styles.vdpEmailText}>{parsed.email}</Text>
                        <TouchableOpacity
                          style={styles.copyBtn}
                          onPress={() => handleCopyEmail(parsed.email)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={14} color="#3269C7" />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.vdpMailBtn}
                        onPress={() => handleMailResearcher(parsed.email, parsed.title)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="send-outline" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                        <Text style={styles.vdpMailBtnText}>Yanıtla</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Rapor Başlığı */}
                    <View style={styles.vdpTitleRow}>
                      <Text style={styles.vdpReportTitle}>{parsed.title}</Text>
                    </View>

                    {/* Teknik Detay Kutusu */}
                    <View style={styles.vdpDetailsBox}>
                      <Text style={styles.vdpDetailsLabel}>Bulgu Özeti & Rapor Detayları:</Text>
                      <Text style={styles.vdpDetailsContent} selectable>
                        {parsed.notes}
                      </Text>
                    </View>

                    {/* Alt Bilgi */}
                    <View style={styles.vdpCardFooter}>
                      <View style={styles.vdpMetaItem}>
                        <Ionicons name="globe-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.vdpMetaText}>IP: {event.ipAddress || 'Bilinmiyor'}</Text>
                      </View>
                      <View style={styles.vdpMetaItem}>
                        <Ionicons name="finger-print-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.vdpMetaText}>{event.toolFingerprint}</Text>
                      </View>
                      <View style={styles.vdpStatusPill}>
                        <Text style={styles.vdpStatusPillText}>Doğrulandı</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : viewMode === 'blocklist' ? (
        /* WAF BLOKLİSTESİ YÖNETİCİSİ */
        <View style={styles.blocklistSection}>
          <View style={styles.blocklistHeaderRow}>
            <View style={styles.sectionHeading}>
              <GlassIconButton icon="lock-closed" size={38} iconSize={19} iconColor="#BD354C" />
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Aktif WAF Karantina Listesi</Text>
                <Text style={styles.sectionSubtitle}>Erişimi kısıtlanmış ve kalkan arkasında tutulan IP'ler</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.headerBlockBtn}
              onPress={() => setShowManualBlock(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.headerBlockBtnText}>Yeni IP Engelle</Text>
            </TouchableOpacity>
          </View>

          {/* Arama Çubuğu */}
          <View style={styles.blocklistSearchRow}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              style={styles.blocklistSearchInput}
              value={blocklistSearch}
              onChangeText={setBlocklistSearch}
              placeholder="IP Adresi, saldırı türü veya gerekçe ile ara..."
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {blocklistSearch ? (
              <TouchableOpacity onPress={() => setBlocklistSearch('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Bloklistesi Öğeleri */}
          {isLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#3269C7" />
              <Text style={styles.loaderText}>Karantina listesi taranıyor...</Text>
            </View>
          ) : quarantinedEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <GlassIconButton icon="shield-checkmark" size={54} iconSize={28} iconColor="#187657" />
              <Text style={styles.emptyTitle}>Karantinada IP Bulunmuyor</Text>
              <Text style={styles.emptySubtitle}>
                Güvenlik duvarı temiz; platformda aktif olarak erişimi kısıtlanmış IP veya kullanıcı bulunmuyor.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setShowManualBlock(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="shield-half-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Manuel IP Engelle (WAF)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {quarantinedEvents.map((event) => {
                const inAction = actionInProgressId === event.id;
                return (
                  <View key={event.id} style={styles.blocklistCard}>
                    {/* Üst Kısım: IP & Durum Rozetleri */}
                    <View style={styles.blocklistCardTop}>
                      <View style={styles.blocklistIpBadge}>
                        <Ionicons name="globe-outline" size={14} color="#173B72" style={{ marginRight: 6 }} />
                        <Text style={styles.blocklistIpText}>{event.ipAddress || '127.0.0.1'}</Text>
                        <TouchableOpacity
                          style={styles.copyBtn}
                          onPress={() => handleCopyIp(event.ipAddress || '127.0.0.1')}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={14} color="#3269C7" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.wafBlockedBadge}>
                        <Ionicons name="lock-closed" size={12} color="#BD354C" />
                        <Text style={styles.wafBlockedText}>WAF BLOCKED</Text>
                      </View>
                    </View>

                    {/* Vektör & Araç Bilgisi */}
                    <View style={styles.blocklistMetaRow}>
                      <View style={styles.metaChip}>
                        <Ionicons name="bug-outline" size={12} color="#3269C7" style={{ marginRight: 4 }} />
                        <Text style={styles.metaChipText}>{event.toolFingerprint}</Text>
                      </View>
                      <View style={styles.metaChip}>
                        <Ionicons name="locate-outline" size={12} color="#BD354C" style={{ marginRight: 4 }} />
                        <Text style={styles.metaChipText}>{event.attackVector}</Text>
                      </View>
                    </View>

                    {/* Gerekçe / Detay */}
                    <View style={styles.blocklistReasonBox}>
                      <Text style={styles.blocklistReasonLabel}>Karantina Gerekçesi & Zararlı Yük:</Text>
                      <Text style={styles.blocklistReasonText} numberOfLines={3}>
                        {event.payloadSnapshot || 'Belirtilmedi'}
                      </Text>
                    </View>

                    {/* Alt Kısım: Zaman & Unblock Aksiyonu */}
                    <View style={styles.blocklistCardFooter}>
                      <View style={styles.blocklistMetaCol}>
                        <Text style={styles.blocklistDateText}>
                          Tarih: {new Date(event.detectedAt).toLocaleString('tr-TR')}
                        </Text>
                        <Text style={styles.blocklistDateText}>
                          Hedef Aktör: {event.threatActorName || 'Anonim / IP Seviyesi'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.unblockActionBtn, inAction && { opacity: 0.6 }]}
                        onPress={() => handleToggleQuarantine(event)}
                        disabled={inAction}
                        activeOpacity={0.8}
                      >
                        {inAction ? (
                          <ActivityIndicator size="small" color="#3269C7" />
                        ) : (
                          <>
                            <Ionicons name="lock-open-outline" size={15} color="#3269C7" />
                            <Text style={styles.unblockActionBtnText}>Engeli Kaldır (WAF)</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        /* CANLI SİBER TEHDİT AKIŞI */
        <>
          {/* 4. OLAY AKIŞI BAŞLIĞI VE FİLTRE RAYI */}
          <View style={styles.sectionHeadingWrapper}>
            <View style={styles.sectionHeading}>
              <GlassIconButton icon="shield-checkmark-outline" size={38} iconSize={19} />
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Saldırgan Kara Kutusu</Text>
                <Text style={styles.sectionSubtitle}>Yakalanan anlık tehdit telemetrisi ve zararlı yükler</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRail}
            >
              {([null, 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev, idx) => {
                const active = selectedSeverity === sev;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.filterButton, active && styles.filterButtonActive]}
                    onPress={() => setSelectedSeverity(sev)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>
                      {sev === null ? 'Tüm Tehditler' : sev === 'CRITICAL' ? 'Kritik' : sev === 'HIGH' ? 'Yüksek' : 'Orta'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 5. OLAY KARTLARI (Kıstas Data Card Stili) */}
          {isLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#3269C7" />
              <Text style={styles.loaderText}>Tehdit telemetrisi taranıyor...</Text>
            </View>
          ) : events.length === 0 ? (
            <View style={styles.emptyCard}>
              <GlassIconButton icon="shield-checkmark" size={54} iconSize={28} iconColor="#187657" />
              <Text style={styles.emptyTitle}>Aktif Siber Tehdit Bulunmuyor</Text>
              <Text style={styles.emptySubtitle}>
                Sistem Sayra WAF ve Bal Küpü Radarı ile gerçek zamanlı korunuyor. Hiçbir simülasyon veya sahte kayıt gösterilmez. Sisteme dışarıdan vuran anormal istekler ve pentest tarayıcıları anlık olarak buraya düşecektir.
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {events.map((event) => {
                const sevBadge = getSeverityBadge(event.severity);
                const actBadge = getActionBadge(event.actionTaken, event.attackVector);
                const inAction = actionInProgressId === event.id;

                return (
                  <View key={event.id} style={[styles.eventCard, isMobile && styles.eventCardMobile]}>
                    {/* 1. ÜST SATIR: SEVİYE ROZETİ VE SAAT */}
                    <View style={styles.eventHeaderRow}>
                      <View style={styles.headerLeftBadges}>
                        <View style={[styles.badge, { backgroundColor: sevBadge.bg, borderColor: sevBadge.border }]}>
                          <Text style={[styles.badgeText, { color: sevBadge.text }]}>{sevBadge.label}</Text>
                        </View>
                        {event.isQuarantined ? (
                          <View style={styles.quarantineTag}>
                            <Ionicons name="lock-closed" size={10} color="#BD354C" style={{ marginRight: 3 }} />
                            <Text style={styles.quarantineTagText}>Aktif Bloklu</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.dateWrap}>
                        <Ionicons name="time-outline" size={12} color="#8A95A8" style={{ marginRight: 4 }} />
                        <Text style={styles.eventDate}>
                          {new Date(event.detectedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>

                    {/* 2. ARAÇ PARMAK İZİ ROZETİ */}
                    <View style={styles.toolFingerprintRow}>
                      <View style={styles.toolBadge}>
                        <Ionicons name="terminal-outline" size={12} color="#3269C7" style={{ marginRight: 5 }} />
                        <Text style={styles.toolBadgeText} numberOfLines={1}>{event.toolFingerprint}</Text>
                      </View>
                    </View>

                    {/* 3. SALDIRI VEKTÖRÜ BAŞLIĞI */}
                    <Text style={[styles.eventVectorTitle, isMobile && styles.eventVectorTitleMobile]}>
                      {event.attackVector}
                    </Text>

                    {/* 4. AKSİYON & IP KUTULARI */}
                    <View style={[styles.actionRow, isMobile && styles.actionRowMobile]}>
                      <View style={[styles.actionPill, { backgroundColor: actBadge.bg, borderColor: actBadge.border }]}>
                        <Text style={[styles.actionText, { color: actBadge.color }]}>{actBadge.label}</Text>
                      </View>
                      <View style={styles.ipPill}>
                        <Ionicons name="globe-outline" size={11} color="#3269C7" style={{ marginRight: 4 }} />
                        <Text style={styles.actorMeta}>IP: {event.ipAddress}</Text>
                      </View>
                    </View>

                    {/* 5. PAYLOAD DENETLEYİCİ KUTUSU (Kıstas Slate Inspector) */}
                    <View style={styles.payloadTerminal}>
                      <View style={styles.terminalTopBar}>
                        <View style={styles.macDots}>
                          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                          <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                        </View>
                        <Text style={styles.terminalTitle}>Yakalanan Zararlı Payload</Text>
                      </View>
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.payloadScrollContent}
                      >
                        <Text style={styles.payloadCode} selectable>
                          {event.payloadSnapshot || 'Payload tespit edilmedi veya gövde boş.'}
                        </Text>
                      </ScrollView>
                    </View>

                    {/* 6. ALT KISIM: USER AGENT VE KISTAS KARANTİNA BUTONU */}
                    <View style={[styles.eventFooter, isMobile && styles.eventFooterMobile]}>
                      <View style={styles.metaCol}>
                        <Text style={styles.uaLabel} numberOfLines={isMobile ? 2 : 1}>
                          User-Agent: {event.userAgent || 'Belirtilmedi'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.quarantineBtn,
                          isMobile && styles.quarantineBtnMobile,
                          event.isQuarantined ? styles.quarantineBtnRelease : styles.quarantineBtnBlock,
                          inAction && { opacity: 0.6 },
                        ]}
                        onPress={() => handleToggleQuarantine(event)}
                        disabled={inAction}
                        activeOpacity={0.78}
                      >
                        {inAction ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons
                              name={event.isQuarantined ? 'lock-open-outline' : 'lock-closed-outline'}
                              size={15}
                              color="#FFFFFF"
                              style={{ marginRight: 6 }}
                            />
                            <Text style={styles.quarantineBtnText}>
                              {event.isQuarantined ? 'Karantinayı Kaldır' : 'Saldırganı Karantinaya Al'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5FA',
  },
  contentContainer: {
    padding: 22,
    paddingBottom: 70,
  },
  contentContainerMobile: {
    padding: 14,
    paddingBottom: 85,
  },
  heroWrapper: {
    marginBottom: 16,
  },
  heroCard: {
    position: 'relative',
    borderRadius: 22,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#173B72',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  heroCardMobile: {
    borderRadius: 18,
    padding: 16,
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    right: -80,
    top: -140,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    right: 120,
    bottom: -80,
    backgroundColor: 'rgba(115, 224, 183, 0.16)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  authorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#73E0B7',
  },
  pulseText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroTitleMobile: {
    fontSize: 19,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12.5,
    lineHeight: 18,
    maxWidth: 620,
    marginBottom: 14,
  },
  heroSubtitleMobile: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },
  heroQuickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroWafBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroWafBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(189, 53, 76, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  heroClearBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  manualBlockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DFE6F0',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  manualIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(189,53,76,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualTitle: {
    color: '#25364E',
    fontSize: 14,
    fontWeight: '700',
  },
  manualSubtitle: {
    color: '#748096',
    fontSize: 11,
    marginTop: 1,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    color: '#68758A',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#DFE6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#25364E',
    fontSize: 13,
  },
  manualActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5FA',
  },
  cancelBtnText: {
    color: '#68758A',
    fontSize: 11.5,
    fontWeight: '600',
  },
  submitBlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#BD354C',
  },
  submitBlockBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E6EF',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  metricCardMobile: {
    flex: undefined,
    width: '48%',
    minWidth: 125,
    padding: 12,
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  metricValue: {
    color: '#25364E',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  metricValueMobile: {
    fontSize: 19,
  },
  metricLabel: {
    color: '#68758A',
    fontSize: 11,
    fontWeight: '600',
  },
  intelligenceBanner: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  intelligenceBannerMobile: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  intelCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E6EF',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  intelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  intelIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intelTitle: {
    color: '#25364E',
    fontSize: 13,
    fontWeight: '700',
  },
  intelSubtitle: {
    color: '#748096',
    fontSize: 10.5,
    marginTop: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  emptyChipText: {
    color: '#8A95A8',
    fontSize: 11,
  },
  vectorChip: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  vectorChipText: {
    color: '#BE123C',
    fontSize: 11,
    fontWeight: '600',
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  toolChipText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeadingWrapper: {
    marginBottom: 14,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: '#25364E',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: '#748096',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  filterRail: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E7EF',
  },
  filterButtonActive: {
    backgroundColor: '#3269C7',
    borderColor: '#3269C7',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  filterText: {
    color: '#68758A',
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loaderBox: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    color: '#68758A',
    marginTop: 10,
    fontSize: 12,
  },
  emptyCard: {
    padding: 36,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E6EF',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyTitle: {
    color: '#25364E',
    fontSize: 15.5,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#748096',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 480,
    marginTop: 6,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E0E6EF',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },
  eventCardMobile: {
    padding: 14,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  quarantineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(189,53,76,0.10)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(189,53,76,0.28)',
  },
  quarantineTagText: {
    color: '#BD354C',
    fontSize: 9.5,
    fontWeight: '700',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDate: {
    color: '#8A95A8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  toolFingerprintRow: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '100%',
  },
  toolBadgeText: {
    color: '#3269C7',
    fontSize: 11,
    fontWeight: '600',
  },
  eventVectorTitle: {
    color: '#25364E',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  eventVectorTitleMobile: {
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  actionRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  actionPill: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actorMeta: {
    color: '#475569',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  payloadTerminal: {
    backgroundColor: '#131F33',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#243754',
    marginBottom: 12,
  },
  terminalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 6,
  },
  macDots: {
    flexDirection: 'row',
    gap: 4.5,
  },
  dot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.25,
  },
  terminalTitle: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
  },
  payloadScrollContent: {
    paddingVertical: 2,
  },
  payloadCode: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 17,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F4F8',
    paddingTop: 12,
  },
  eventFooterMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  metaCol: {
    flex: 1,
  },
  uaLabel: {
    color: '#748096',
    fontSize: 10.5,
    lineHeight: 15,
  },
  quarantineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  quarantineBtnBlock: {
    backgroundColor: '#BD354C',
    shadowColor: '#BD354C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  quarantineBtnRelease: {
    backgroundColor: '#3269C7',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  quarantineBtnMobile: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 10,
  },
  quarantineBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Segmented Control Mod Switcher
  viewModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EEF5',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 6,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  viewModeBtnActive: {
    backgroundColor: '#173B72',
    ...Platform.select({
      ios: {
        shadowColor: '#173B72',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(23, 59, 114, 0.18)',
      },
    }),
  },
  viewModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#173B72',
  },
  viewModeBtnTextActive: {
    color: '#FFFFFF',
  },
  viewModeBadge: {
    backgroundColor: 'rgba(23, 59, 114, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  viewModeBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  viewModeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#173B72',
  },
  viewModeBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Blocklist Section & Search
  blocklistSection: {
    marginBottom: 20,
  },
  blocklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerBlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BD354C',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#BD354C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 6px rgba(189, 53, 76, 0.2)',
      },
    }),
  },
  headerBlockBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  blocklistSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D8E2EE',
    marginBottom: 16,
  },
  blocklistSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#173B72',
    marginLeft: 8,
    padding: 0,
  },

  // Blocklist Item Card
  blocklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D8E2EE',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#173B72',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 10px rgba(23, 59, 114, 0.05)',
      },
    }),
  },
  blocklistCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  blocklistIpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 59, 114, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(23, 59, 114, 0.12)',
  },
  blocklistIpText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#173B72',
    marginRight: 8,
    letterSpacing: 0.3,
  },
  copyBtn: {
    padding: 2,
  },
  wafBlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  wafBlockedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BD354C',
    marginLeft: 4,
  },
  blocklistMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5FA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#D8E2EE',
  },
  metaChipText: {
    fontSize: 11,
    color: '#25364E',
    fontWeight: '600',
  },
  blocklistReasonBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  blocklistReasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 3,
  },
  blocklistReasonText: {
    fontSize: 12.5,
    color: '#25364E',
    lineHeight: 18,
  },
  blocklistCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  blocklistMetaCol: {
    gap: 2,
  },
  blocklistDateText: {
    fontSize: 11,
    color: '#748096',
  },
  unblockActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5FA',
    borderWidth: 1,
    borderColor: '#3269C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  unblockActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3269C7',
    marginLeft: 6,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#173B72',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 16,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // VDP Raporları Stilleri
  vdpSection: {
    marginBottom: 28,
  },
  vdpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  vdpSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24,118,87,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(24,118,87,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  vdpSummaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#187657',
  },
  vdpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D8E2EE',
    shadowColor: '#173B72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 14,
  },
  vdpCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  vdpResearcherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24,118,87,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(24,118,87,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vdpResearcherBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#187657',
  },
  vdpDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vdpDateText: {
    fontSize: 11,
    color: '#64748B',
  },
  vdpEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10,
  },
  vdpEmailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5FA',
    borderWidth: 1,
    borderColor: '#D8E2EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    minWidth: 220,
  },
  vdpEmailText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#173B72',
    marginRight: 8,
  },
  vdpMailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3269C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  vdpMailBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  vdpTitleRow: {
    marginBottom: 10,
  },
  vdpReportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#173B72',
    letterSpacing: -0.3,
  },
  vdpDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  vdpDetailsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vdpDetailsContent: {
    fontSize: 12.5,
    color: '#25364E',
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vdpCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  vdpMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vdpMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  vdpStatusPill: {
    backgroundColor: 'rgba(50,105,199,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.20)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vdpStatusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3269C7',
  },
});
