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
        return { label: 'KRİTİK', bg: 'rgba(239, 68, 68, 0.16)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.4)' };
      case 'HIGH':
        return { label: 'YÜKSEK', bg: 'rgba(245, 158, 11, 0.16)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.4)' };
      case 'MEDIUM':
        return { label: 'ORTA', bg: 'rgba(59, 130, 246, 0.14)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.35)' };
      default:
        return { label: 'DÜŞÜK', bg: 'rgba(107, 114, 128, 0.14)', text: '#9CA3AF', border: 'rgba(107, 114, 128, 0.25)' };
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'HONEYPOT_DECEIVED':
        return { label: '🍯 Bal Küpü Tuzağına Düştü', color: '#EAB308' };
      case 'SILENT_NULL_ROUTED':
        return { label: '🛡️ Sessizce Yutuldu (Null-Route)', color: '#10B981' };
      case 'QUARANTINED':
        return { label: '⛓️ Karantinada', color: '#EF4444' };
      default:
        return { label: '👁️ Gözlemlendi & Kaydedildi', color: '#3B82F6' };
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
      {/* BAŞLIK & SİSTEM DURUMU */}
      <LinearGradient
        colors={['#10192A', '#0B111E']}
        style={[styles.heroCard, isMobile && styles.heroCardMobile]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseText}>SAYRA SAVUNMA RADARI AKTİF</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadThreatData} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={15} color="#93C5FD" />
            <Text style={styles.refreshBtnText}>Yenile</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
          Siber Tehdit İstihbaratı & Bal Küpü
        </Text>
        <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
          Pars DevState motoruyla senkronize; sisteme vuran pentest tarayıcılarını, otomatik fuzzer'ları ve saldırganları profiller, tuzaklarla aldatır ve verilerini toplar.
        </Text>

        {/* METRİK ŞERİDİ */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricBox, isMobile && styles.metricBoxMobile]}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
            </View>
            <Text style={[styles.metricVal, isMobile && styles.metricValMobile]}>
              {overview?.totalThreats ?? 0}
            </Text>
            <Text style={styles.metricLbl} numberOfLines={1}>Engellenen</Text>
          </View>

          <View style={[styles.metricBox, isMobile && styles.metricBoxMobile]}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <Ionicons name="fish-outline" size={16} color="#EAB308" />
            </View>
            <Text style={[styles.metricVal, isMobile && styles.metricValMobile, { color: '#FACC15' }]}>
              {overview?.honeypotTrapped ?? 0}
            </Text>
            <Text style={styles.metricLbl} numberOfLines={1}>Bal Küpü</Text>
          </View>

          <View style={[styles.metricBox, isMobile && styles.metricBoxMobile]}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
            </View>
            <Text style={[styles.metricVal, isMobile && styles.metricValMobile, { color: '#34D399' }]}>
              {overview?.nullRouted ?? 0}
            </Text>
            <Text style={styles.metricLbl} numberOfLines={1}>Sessiz Yutma</Text>
          </View>

          <View style={[styles.metricBox, isMobile && styles.metricBoxMobile]}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="lock-closed-outline" size={16} color="#A855F7" />
            </View>
            <Text style={[styles.metricVal, isMobile && styles.metricValMobile, { color: '#C084FC' }]}>
              {overview?.quarantinedActors ?? 0}
            </Text>
            <Text style={styles.metricLbl} numberOfLines={1}>Karantinada</Text>
          </View>
        </View>
      </LinearGradient>

      {/* SALDIRI VEKTÖRLERİ & ARAÇ DAĞILIMI */}
      <View style={[styles.intelligenceBanner, isMobile && styles.intelligenceBannerMobile]}>
        <View style={styles.intelColumn}>
          <View style={styles.intelHeaderRow}>
            <Ionicons name="locate-outline" size={15} color="#F87171" style={{ marginRight: 6 }} />
            <Text style={styles.intelHeader}>En Çok Hedeflenen Vektörler</Text>
          </View>
          <View style={styles.chipRow}>
            {(overview?.topVectors || []).length === 0 ? (
              <Text style={styles.emptyChipText}>Kayıtlı vektör bulunmuyor.</Text>
            ) : (
              (overview?.topVectors || []).map((v, i) => (
                <View key={i} style={styles.vectorChip}>
                  <Text style={styles.vectorChipText}>{v.attack_vector} ({v.count})</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.intelColumn}>
          <View style={styles.intelHeaderRow}>
            <Ionicons name="flash-outline" size={15} color="#60A5FA" style={{ marginRight: 6 }} />
            <Text style={styles.intelHeader}>Tespit Edilen Pentest Araçları</Text>
          </View>
          <View style={styles.chipRow}>
            {(overview?.topTools || []).length === 0 ? (
              <Text style={styles.emptyChipText}>Kayıtlı araç bulunmuyor.</Text>
            ) : (
              (overview?.topTools || []).map((t, i) => (
                <View key={i} style={styles.toolChip}>
                  <Ionicons name="bug-outline" size={12} color="#60A5FA" style={{ marginRight: 4 }} />
                  <Text style={styles.toolChipText}>{t.tool_fingerprint}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      {/* FİLTRELEME ÇUBUĞU */}
      <View style={[styles.filterRow, isMobile && styles.filterRowMobile]}>
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionTitle}>Saldırgan Olay Akışı</Text>
          <Text style={styles.sectionSubtitle}>Telemetri ve Kara Kutu Günlüğü</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContainer}
        >
          {([null, 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev, idx) => {
            const active = selectedSeverity === sev;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedSeverity(sev)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {sev === null ? 'Tümü' : sev === 'CRITICAL' ? 'Kritik' : sev === 'HIGH' ? 'Yüksek' : 'Orta'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* OLAY LİSTESİ */}
      {isLoading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loaderText}>Tehdit telemetrisi taranıyor...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark" size={44} color="#10B981" />
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
                {/* 1. ÜST KATMAN: ROZET VE SAAT */}
                <View style={styles.eventHeaderRow}>
                  <View style={styles.headerLeftBadges}>
                    <View style={[styles.badge, { backgroundColor: sevBadge.bg, borderColor: sevBadge.border }]}>
                      <Text style={[styles.badgeText, { color: sevBadge.text }]}>{sevBadge.label}</Text>
                    </View>
                    {isCanary ? (
                      <View style={styles.canaryBadge}>
                        <Text style={styles.canaryBadgeText}>Tatbikat Simülasyonu</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.dateWrap}>
                    <Ionicons name="time-outline" size={12} color="#64748B" style={{ marginRight: 3 }} />
                    <Text style={styles.eventDate}>
                      {new Date(event.detectedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>

                {/* 2. ARAÇ PARMAK İZİ (MOBİLDE SIKIŞMAYACAK AYRI SATIR) */}
                <View style={styles.toolFingerprintRow}>
                  <View style={styles.toolBadge}>
                    <Ionicons name="terminal-outline" size={12} color="#93C5FD" style={{ marginRight: 5 }} />
                    <Text style={styles.toolBadgeText} numberOfLines={1}>{event.toolFingerprint}</Text>
                  </View>
                </View>

                {/* 3. VEKTÖR ADI */}
                <Text style={[styles.eventVectorTitle, isMobile && styles.eventVectorTitleMobile]}>
                  {event.attackVector}
                </Text>

                {/* 4. AKSİYON & IP KUTUSU */}
                <View style={[styles.actionRow, isMobile && styles.actionRowMobile]}>
                  <View style={styles.actionPill}>
                    <Text style={[styles.actionText, { color: actBadge.color }]}>{actBadge.label}</Text>
                  </View>
                  <View style={styles.ipPill}>
                    <Ionicons name="globe-outline" size={11} color="#60A5FA" style={{ marginRight: 4 }} />
                    <Text style={styles.actorMeta}>{event.ipAddress}</Text>
                  </View>
                </View>

                {/* 5. PAYLOAD TERMİNALİ (MOBİLDE KAYDIRILABİLİR, ASLA EKRANI PATLATMAZ) */}
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

                {/* 6. ALT KISIM: USER AGENT VE KARANTİNA BUTONU */}
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
                      event.isQuarantined && styles.quarantineBtnActive,
                    ]}
                    onPress={() => handleToggleQuarantine(event)}
                    disabled={inAction}
                    activeOpacity={0.75}
                  >
                    {inAction ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name={event.isQuarantined ? 'lock-open-outline' : 'lock-closed-outline'}
                          size={14}
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
    backgroundColor: '#070B13',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 70,
  },
  contentContainerMobile: {
    padding: 12,
    paddingBottom: 80,
  },
  heroCard: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    marginBottom: 16,
  },
  heroCardMobile: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  pulseText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  refreshBtnText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroTitleMobile: {
    fontSize: 17,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  heroSubtitleMobile: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  metricBoxMobile: {
    flex: undefined,
    width: '48%',
    minWidth: 120,
    padding: 10,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricVal: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricValMobile: {
    fontSize: 17,
  },
  metricLbl: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
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
  intelColumn: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  intelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  intelHeader: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emptyChipText: {
    color: '#64748B',
    fontSize: 11,
  },
  vectorChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  vectorChipText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '600',
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  toolChipText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  filterRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  sectionHeaderWrap: {
    marginBottom: 2,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loaderBox: {
    padding: 36,
    alignItems: 'center',
  },
  loaderText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 12,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  eventCardMobile: {
    padding: 13,
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
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  canaryBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  canaryBadgeText: {
    color: '#C084FC',
    fontSize: 9,
    fontWeight: '600',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDate: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  toolFingerprintRow: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxWidth: '100%',
  },
  toolBadgeText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
  },
  eventVectorTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  eventVectorTitleMobile: {
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  actionRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  actionPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actorMeta: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  payloadTerminal: {
    backgroundColor: '#030712',
    borderRadius: 9,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.18)',
    marginBottom: 10,
  },
  terminalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 5,
  },
  macDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  terminalTitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  payloadScrollContent: {
    paddingVertical: 2,
  },
  payloadCode: {
    color: '#38BDF8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
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
    color: '#64748B',
    fontSize: 10,
    lineHeight: 14,
  },
  quarantineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 7,
  },
  quarantineBtnMobile: {
    width: '100%',
    paddingVertical: 9,
    borderRadius: 8,
  },
  quarantineBtnActive: {
    backgroundColor: '#2563EB',
  },
  quarantineBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
