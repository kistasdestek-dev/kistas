import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
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

  const loadThreatData = useCallback(async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [selectedSeverity]);

  useEffect(() => {
    loadThreatData();
  }, [loadThreatData]);

  const handleToggleQuarantine = async (event: ThreatEvent) => {
    setActionInProgressId(event.id);
    try {
      if (event.isQuarantined) {
        const res = await AdminService.releaseThreatActor(event.id);
        if (res.success) {
          Alert.alert('Karantina Kaldırıldı', 'Saldırgan serbest bırakıldı.');
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
          Alert.alert('Karantinaya Alındı', 'Saldırgan tüm erişim noktalarında karantinaya alındı.');
          loadThreatData();
        } else {
          Alert.alert('Hata', res.error || 'İşlem başarısız.');
        }
      }
    } finally {
      setActionInProgressId(null);
    }
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

  const getActionBadge = (action: string) => {
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

  const isCanarySimulation = (fingerprint: string) => {
    return [
      'sqlmap / Automated Injector',
      'Burp Suite / Repeater Intruder',
      'Nuclei Scanner Engine',
      'Python Async Fuzzer',
    ].includes(fingerprint);
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

            <GlassIconButton
              icon="refresh-outline"
              size={36}
              iconSize={18}
              iconColor="#3269C7"
              onPress={loadThreatData}
              accessibilityLabel="Verileri Yenile"
            />
          </View>

          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
            Siber Tehdit ve Bal Küpü Radarı
          </Text>
          <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
            Pars DevState güvenlik motoruyla senkronize; sisteme vuran pentest tarayıcılarını ve anormal istekleri tespit eder, tuzaklarla aldatır ve verilerini toplar.
          </Text>
        </LinearGradient>
      </View>

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
          <GlassIconButton icon="shield-checkmark" size={48} iconSize={24} iconColor="#187657" />
          <Text style={styles.emptyTitle}>Aktif Tehdit Bulunmuyor</Text>
          <Text style={styles.emptySubtitle}>Sistem sınırları tam koruma altında ve siber anomali tespit edilmedi.</Text>
        </View>
      ) : (
        <View style={styles.eventsList}>
          {events.map((event) => {
            const sevBadge = getSeverityBadge(event.severity);
            const actBadge = getActionBadge(event.actionTaken);
            const inAction = actionInProgressId === event.id;
            const isCanary = isCanarySimulation(event.toolFingerprint);

            return (
              <View key={event.id} style={[styles.eventCard, isMobile && styles.eventCardMobile]}>
                {/* 1. ÜST SATIR: KRİTİK / TATBİKAT ROZETİ VE SAAT */}
                <View style={styles.eventHeaderRow}>
                  <View style={styles.headerLeftBadges}>
                    <View style={[styles.badge, { backgroundColor: sevBadge.bg, borderColor: sevBadge.border }]}>
                      <Text style={[styles.badgeText, { color: sevBadge.text }]}>{sevBadge.label}</Text>
                    </View>
                    {isCanary ? (
                      <View style={styles.canaryBadge}>
                        <Ionicons name="flask-outline" size={10} color="#7E22CE" style={{ marginRight: 3 }} />
                        <Text style={styles.canaryBadgeText}>Tatbikat Kaydı</Text>
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
  },
  heroSubtitleMobile: {
    fontSize: 11.5,
    lineHeight: 16,
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
    marginTop: 10,
  },
  emptySubtitle: {
    color: '#748096',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
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
  canaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  canaryBadgeText: {
    color: '#7E22CE',
    fontSize: 9.5,
    fontWeight: '600',
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
});
