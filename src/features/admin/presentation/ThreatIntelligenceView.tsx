import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
        return { label: 'KRİTİK', bg: 'rgba(239, 68, 68, 0.14)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.35)' };
      case 'HIGH':
        return { label: 'YÜKSEK', bg: 'rgba(245, 158, 11, 0.14)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.35)' };
      case 'MEDIUM':
        return { label: 'ORTA', bg: 'rgba(59, 130, 246, 0.12)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' };
      default:
        return { label: 'DÜŞÜK', bg: 'rgba(107, 114, 128, 0.12)', text: '#9CA3AF', border: 'rgba(107, 114, 128, 0.25)' };
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* BAŞLIK & SİSTEM DURUMU */}
      <LinearGradient colors={['#10192A', '#0B111E']} style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseText}>SAYRA SAVUNMA RADARI AKTİF</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadThreatData} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={16} color="#93C5FD" />
            <Text style={styles.refreshBtnText}>Yenile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heroTitle}>Siber Tehdit İstihbaratı & Karşı-Aldatma</Text>
        <Text style={styles.heroSubtitle}>
          Pars DevState ofansif analiz motoruyla entegre; sisteme vuran pentest tarayıcılarını, otomatik fuzzing botlarını ve saldırganları profiller, tuzaklarla aldatır ve verilerini toplar.
        </Text>

        {/* METRİK ŞERİDİ */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="warning-outline" size={18} color="#EF4444" />
            </View>
            <Text style={styles.metricVal}>{overview?.totalThreats ?? 0}</Text>
            <Text style={styles.metricLbl}>Engellenen Tehdit</Text>
          </View>

          <View style={styles.metricBox}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <Ionicons name="fish-outline" size={18} color="#EAB308" />
            </View>
            <Text style={[styles.metricVal, { color: '#FACC15' }]}>{overview?.honeypotTrapped ?? 0}</Text>
            <Text style={styles.metricLbl}>Bal Küpü Tuzağı</Text>
          </View>

          <View style={styles.metricBox}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
            </View>
            <Text style={[styles.metricVal, { color: '#34D399' }]}>{overview?.nullRouted ?? 0}</Text>
            <Text style={styles.metricLbl}>Sessiz Yutma</Text>
          </View>

          <View style={styles.metricBox}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#A855F7" />
            </View>
            <Text style={[styles.metricVal, { color: '#C084FC' }]}>{overview?.quarantinedActors ?? 0}</Text>
            <Text style={styles.metricLbl}>Karantinada</Text>
          </View>
        </View>
      </LinearGradient>

      {/* SALDIRI VEKTÖRLERİ & ARAÇ DAĞILIMI */}
      <View style={styles.intelligenceBanner}>
        <View style={styles.intelColumn}>
          <Text style={styles.intelHeader}>🎯 En Çok Hedeflenen Vektörler</Text>
          <View style={styles.chipRow}>
            {(overview?.topVectors || []).map((v, i) => (
              <View key={i} style={styles.vectorChip}>
                <Text style={styles.vectorChipText}>{v.attack_vector} ({v.count})</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.intelColumn}>
          <Text style={styles.intelHeader}>⚡ Tespit Edilen Pentest Araçları</Text>
          <View style={styles.chipRow}>
            {(overview?.topTools || []).map((t, i) => (
              <View key={i} style={styles.toolChip}>
                <Ionicons name="bug-outline" size={12} color="#60A5FA" style={{ marginRight: 4 }} />
                <Text style={styles.toolChipText}>{t.tool_fingerprint}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* FİLTRELEME ÇUBUĞU */}
      <View style={styles.filterRow}>
        <Text style={styles.sectionTitle}>Saldırgan Kara Kutusu & Olay Akışı</Text>
        <View style={styles.filterChips}>
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
        </View>
      </View>

      {/* OLAY LİSTESİ */}
      {isLoading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loaderText}>Tehdit telemetrisi yükleniyor...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark" size={48} color="#10B981" />
          <Text style={styles.emptyTitle}>Aktif Tehdit Bulunmuyor</Text>
          <Text style={styles.emptySubtitle}>Sistem sınırları tam koruma altında ve siber saldırı tespit edilmedi.</Text>
        </View>
      ) : (
        <View style={styles.eventsList}>
          {events.map((event) => {
            const sevBadge = getSeverityBadge(event.severity);
            const actBadge = getActionBadge(event.actionTaken);
            const inAction = actionInProgressId === event.id;

            return (
              <View key={event.id} style={styles.eventCard}>
                {/* KART ÜST KISMI */}
                <View style={styles.eventHeader}>
                  <View style={styles.headerBadges}>
                    <View style={[styles.badge, { backgroundColor: sevBadge.bg, borderColor: sevBadge.border }]}>
                      <Text style={[styles.badgeText, { color: sevBadge.text }]}>{sevBadge.label}</Text>
                    </View>
                    <View style={styles.toolBadge}>
                      <Ionicons name="terminal-outline" size={12} color="#93C5FD" style={{ marginRight: 4 }} />
                      <Text style={styles.toolBadgeText}>{event.toolFingerprint}</Text>
                    </View>
                  </View>
                  <Text style={styles.eventDate}>
                    {new Date(event.detectedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* VEKTÖR & AKSİYON */}
                <Text style={styles.eventVectorTitle}>{event.attackVector}</Text>
                <View style={styles.actionRow}>
                  <Text style={[styles.actionText, { color: actBadge.color }]}>{actBadge.label}</Text>
                  <Text style={styles.actorMeta}>IP: {event.ipAddress}</Text>
                </View>

                {/* PAYLOAD TERMİNAL KUTUSU */}
                <View style={styles.payloadTerminal}>
                  <View style={styles.terminalTopBar}>
                    <View style={styles.macDots}>
                      <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                      <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                      <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={styles.terminalTitle}>Yakalanan Zararlı Payload</Text>
                  </View>
                  <Text style={styles.payloadCode} selectable>
                    {event.payloadSnapshot || 'Payload yakalanamadı veya gizlendi.'}
                  </Text>
                </View>

                {/* AKSİYON BUTONLARI */}
                <View style={styles.eventFooter}>
                  <View style={styles.metaCol}>
                    <Text style={styles.uaLabel} numberOfLines={1}>
                      User-Agent: {event.userAgent || 'Belirtilmedi'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.quarantineBtn,
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
    paddingBottom: 60,
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    marginBottom: 20,
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
    paddingHorizontal: 10,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  refreshBtnText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricVal: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricLbl: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  intelligenceBanner: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
    marginBottom: 24,
  },
  intelColumn: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  intelHeader: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vectorChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loaderBox: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 13,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  eventsList: {
    gap: 16,
  },
  eventCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toolBadgeText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
  },
  eventDate: {
    color: '#64748B',
    fontSize: 12,
  },
  eventVectorTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actorMeta: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  payloadTerminal: {
    backgroundColor: '#040711',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    marginBottom: 14,
  },
  terminalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 6,
  },
  macDots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  terminalTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  payloadCode: {
    color: '#38BDF8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaCol: {
    flex: 1,
    minWidth: 160,
  },
  uaLabel: {
    color: '#64748B',
    fontSize: 11,
  },
  quarantineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quarantineBtnActive: {
    backgroundColor: '#2563EB',
  },
  quarantineBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
