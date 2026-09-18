import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { HoneypotTrapService } from '../../security/application/HoneypotTrapService';
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

  const filteredEvents = useMemo(() => {
    if (!selectedSeverity) return events;
    if (selectedSeverity === 'HONEYPOT') {
      return events.filter(
        (e) =>
          HoneypotTrapService.isHoneypotVector(e.attackVector) ||
          e.actionTaken === 'HONEYPOT_DECEIVED'
      );
    }
    return events.filter((e) => e.severity === selectedSeverity);
  }, [events, selectedSeverity]);

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
    if (vector && HoneypotTrapService.isHoneypotVector(vector)) {
      return { label: '🍯 Pars Bal Küpü Tuzağına Düştü', color: '#B45309', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)' };
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
              {([
                { id: null, label: 'Tüm Tehditler' },
                { id: 'HONEYPOT', label: '🍯 Bal Küpü Tuzakları' },
                { id: 'CRITICAL', label: 'Kritik' },
                { id: 'HIGH', label: 'Yüksek' },
                { id: 'MEDIUM', label: 'Orta' },
              ] as const).map((filterItem, idx) => {
                const active = selectedSeverity === filterItem.id;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.filterButton, active && styles.filterButtonActive]}
                    onPress={() => setSelectedSeverity(filterItem.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>
                      {filterItem.label}
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
          ) : filteredEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <GlassIconButton icon="shield-checkmark" size={54} iconSize={28} iconColor="#187657" />
              <Text style={styles.emptyTitle}>
                {selectedSeverity === 'HONEYPOT' ? 'Bal Küpü Tuzağı Kaydı Bulunmuyor' : 'Aktif Siber Tehdit Bulunmuyor'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {selectedSeverity === 'HONEYPOT'
                  ? 'Henüz hiçbir otomatik bot, crawler veya saldırgan yem alanlara veya gizli kanaryalara dokunmadı. Pars savunma radarı aktif bekleyişte.'
                  : 'Sistem Sayra WAF ve Bal Küpü Radarı ile gerçek zamanlı korunuyor. Hiçbir simülasyon veya sahte kayıt gösterilmez. Sisteme dışarıdan vuran anormal istekler ve pentest tarayıcıları anlık olarak buraya düşecektir.'}
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {filteredEvents.map((event) => {
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

import { styles } from './ThreatIntelligenceView.styles';
