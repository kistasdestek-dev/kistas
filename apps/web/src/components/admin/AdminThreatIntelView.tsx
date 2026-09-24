'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  Ban,
  Activity,
  Zap,
  Terminal,
  Search,
  RefreshCw,
  Plus,
  Loader2,
  Radio,
  FileCode,
} from 'lucide-react';
import { ManualBlockModal } from './ManualBlockModal';
import { GlassIconButton } from '../GlassIconButton';
import { createClient } from '@/lib/supabase/browser';

export interface ThreatEvent {
  id: string;
  threatActorId: string | null;
  threatActorName: string;
  threatActorEmail: string;
  ipAddress: string;
  userAgent: string;
  toolFingerprint: string;
  attackVector: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  payloadSnapshot: string;
  actionTaken: string;
  isQuarantined: boolean;
  detectedAt: string;
}

export interface ThreatIntelOverview {
  totalThreats: number;
  honeypotTrapped: number;
  nullRouted: number;
  quarantinedActors: number;
  topVectors: Array<{ attack_vector: string; count: number }>;
  topTools: Array<{ tool_fingerprint: string; count: number }>;
}

export const AdminThreatIntelView: React.FC = () => {
  const [overview, setOverview] = useState<ThreatIntelOverview | null>(null);
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'stream' | 'quarantined'>('stream');
  const [searchQuery, setSearchQuery] = useState('');
  const [isManualBlockOpen, setIsManualBlockOpen] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [overviewRes, eventsRes] = await Promise.all([
        supabase.rpc('admin_get_threat_intel_overview'),
        supabase.rpc('admin_get_threat_events', {
          p_limit: 100,
          p_offset: 0,
          p_severity: severityFilter || null,
        }),
      ]);

      if (overviewRes.data) {
        const d = overviewRes.data as any;
        setOverview({
          totalThreats: Number(d.total_threats || 0),
          honeypotTrapped: Number(d.honeypot_trapped || 0),
          nullRouted: Number(d.null_routed || 0),
          quarantinedActors: Number(d.quarantined_actors || 0),
          topVectors: d.top_vectors || [],
          topTools: d.top_tools || [],
        });
      }

      if (Array.isArray(eventsRes.data)) {
        setEvents(
          eventsRes.data.map((row: any) => ({
            id: row.id,
            threatActorId: row.threat_actor_id,
            threatActorName: row.threat_actor_name || 'Bilinmeyen Saldırgan',
            threatActorEmail: row.threat_actor_email || 'Belirtilmemiş',
            ipAddress: row.ip_address || 'Gizli IP',
            userAgent: row.user_agent || 'Bilinmiyor',
            toolFingerprint: row.tool_fingerprint || 'Script / Bot',
            attackVector: row.attack_vector || 'UNKNOWN',
            severity: row.severity || 'HIGH',
            payloadSnapshot: row.payload_snapshot || '',
            actionTaken: row.action_taken || 'LOGGED',
            isQuarantined: Boolean(row.is_quarantined),
            detectedAt: row.detected_at || new Date().toISOString(),
          }))
        );
      }
    } catch (err) {
      console.error('Threat radar load error:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [severityFilter, supabase]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 10000); // 10s telemetry heartbeat
    return () => clearInterval(interval);
  }, [loadData]);

  const handleToggleQuarantine = async (event: ThreatEvent) => {
    setActionBusyId(event.id);
    try {
      if (event.isQuarantined) {
        await supabase.rpc('admin_remove_quarantine', {
          p_actor_id: event.threatActorId || null,
          p_ip_address: event.ipAddress,
        });
      } else {
        await supabase.rpc('admin_quarantine_actor', {
          p_actor_id: event.threatActorId || null,
          p_ip_address: event.ipAddress,
          p_reason: `Otomatik Savunma Radarı: ${event.attackVector}`,
        });
      }
      loadData(true);
    } finally {
      setActionBusyId(null);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (viewMode === 'quarantined' && !e.isQuarantined) return false;
      if (severityFilter && e.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.ipAddress.toLowerCase().includes(q) ||
          e.attackVector.toLowerCase().includes(q) ||
          e.toolFingerprint.toLowerCase().includes(q) ||
          e.threatActorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, viewMode, severityFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Başlık Alanı (Kıstas Stili) */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          <GlassIconButton icon={ShieldAlert} size={44} iconSize={22} iconColor="#BD354C" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#25364E] tracking-tight">
            Pars DevState Siber Tehdit Radarı
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-medium">
            Gerçek zamanlı WAF telemetrisi, bal küpü tuzakları ve otomatik IP karantinası.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-white/90 bg-white/85 p-4 shadow-[-4px_-4px_12px_rgba(255,255,255,0.9),4px_6px_16px_rgba(130,146,168,0.12)]">
          <div className="flex items-center justify-between text-[#ba0816]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Toplam Tehdit</span>
            <ShieldAlert size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-[#25364E] tracking-tight">
            {overview?.totalThreats.toLocaleString('tr-TR') || 0}
          </p>
          <span className="text-[10px] text-[#63758E]">Engellenen saldırı girişimi</span>
        </div>

        <div className="rounded-2xl border border-white/90 bg-white/85 p-4 shadow-[-4px_-4px_12px_rgba(255,255,255,0.9),4px_6px_16px_rgba(130,146,168,0.12)]">
          <div className="flex items-center justify-between text-[#B98916]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Honeypot Tuzağı</span>
            <Zap size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-[#25364E] tracking-tight">
            {overview?.honeypotTrapped.toLocaleString('tr-TR') || 0}
          </p>
          <span className="text-[10px] text-[#63758E]">Yem alanına düşen bot</span>
        </div>

        <div className="rounded-2xl border border-white/90 bg-white/85 p-4 shadow-[-4px_-4px_12px_rgba(255,255,255,0.9),4px_6px_16px_rgba(130,146,168,0.12)]">
          <div className="flex items-center justify-between text-[#3269C7]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Null-Routed</span>
            <Activity size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-[#25364E] tracking-tight">
            {overview?.nullRouted.toLocaleString('tr-TR') || 0}
          </p>
          <span className="text-[10px] text-[#63758E]">Sessizce yutulan istek</span>
        </div>

        <div className="rounded-2xl border border-white/90 bg-white/85 p-4 shadow-[-4px_-4px_12px_rgba(255,255,255,0.9),4px_6px_16px_rgba(130,146,168,0.12)]">
          <div className="flex items-center justify-between text-[#187657]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Karantina</span>
            <Ban size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-[#25364E] tracking-tight">
            {overview?.quarantinedActors.toLocaleString('tr-TR') || 0}
          </p>
          <span className="text-[10px] text-[#63758E]">Tam izole edilen aktör</span>
        </div>
      </div>

      {/* Top Attack Vectors & Tools row */}
      {overview && (overview.topVectors.length > 0 || overview.topTools.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/90 bg-white/80 p-4 shadow-xs">
            <p className="text-[11px] font-bold text-[#627590] uppercase tracking-wider mb-2">
              En Çok Kullanılan Saldırı Vektörleri
            </p>
            <div className="flex flex-wrap gap-2">
              {overview.topVectors.map((v, i) => (
                <span key={i} className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-[#ba0816]">
                  {v.attack_vector}: {v.count}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/90 bg-white/80 p-4 shadow-xs">
            <p className="text-[11px] font-bold text-[#627590] uppercase tracking-wider mb-2">
              Tespit Edilen Araç Parmak İzleri
            </p>
            <div className="flex flex-wrap gap-2">
              {overview.topTools.map((t, i) => (
                <span key={i} className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-[#25364E]">
                  {t.tool_fingerprint}: {t.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Header: Search & Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('stream')}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              viewMode === 'stream'
                ? 'border-[#ba0816] bg-[#ba0816] text-white shadow-xs'
                : 'border-white/80 bg-white text-[#64748B]'
            }`}
          >
            <Radio size={13} className={viewMode === 'stream' ? 'animate-pulse' : ''} />
            <span>Canlı Tehdit Akışı ({events.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('quarantined')}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              viewMode === 'quarantined'
                ? 'border-[#3269C7] bg-[#3269C7] text-white shadow-xs'
                : 'border-white/80 bg-white text-[#64748B]'
            }`}
          >
            <Ban size={13} />
            <span>Karantina Listesi ({events.filter((e) => e.isQuarantined).length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="IP, aktör veya vektör ara..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-white/90 bg-[#EAF0F7]/70 text-xs font-semibold text-[#25364E] shadow-[inset_2px_2px_4px_rgba(130,146,168,0.12)] focus:outline-none"
            />
          </div>

          <select
            value={severityFilter || ''}
            onChange={(e) => setSeverityFilter(e.target.value || null)}
            className="h-9 px-3 rounded-xl border border-white/90 bg-[#EAF0F7]/70 text-xs font-bold text-[#25364E] shadow-[inset_2px_2px_4px_rgba(130,146,168,0.12)] focus:outline-none cursor-pointer"
          >
            <option value="">Tüm Seviyeler</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <button
            type="button"
            onClick={() => setIsManualBlockOpen(true)}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-[#ba0816]/30 bg-[#FFF0F0] text-xs font-bold text-[#ba0816] shadow-xs hover:bg-[#FFE5E5] transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Manuel IP Engelle</span>
          </button>

          <button
            type="button"
            onClick={() => loadData(false)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#3269C7] cursor-pointer"
            title="Yenile"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Threat Events Table */}
      <div className="rounded-[28px] border border-white/90 bg-white/90 shadow-[-6px_-6px_16px_rgba(255,255,255,0.9),6px_6px_20px_rgba(130,146,168,0.14)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#3269C7]/12 bg-[#F7FAFE] text-[10px] font-bold text-[#627590] uppercase tracking-wider">
                <th className="py-4 px-6">Saldırgan & IP</th>
                <th className="py-4 px-4">Saldırı Vektörü</th>
                <th className="py-4 px-4">Ciddiyet</th>
                <th className="py-4 px-4">Araç / Fingerprint</th>
                <th className="py-4 px-4">Tetiklenen Aksiyon</th>
                <th className="py-4 px-6 text-right">Savunma Kontrolü</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3269C7]/8 text-xs font-mono">
              {isLoading && events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs font-sans text-[#686474]">
                    <Loader2 size={24} className="animate-spin text-[#ba0816] mx-auto mb-2" />
                    <span>Canlı tehdit radarı taranıyor...</span>
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs font-sans text-[#686474]">
                    Aktif tehdit veya karantina kaydı bulunmuyor.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((e) => {
                  const isBusy = actionBusyId === e.id;
                  const isCritical = e.severity === 'CRITICAL';
                  const isHigh = e.severity === 'HIGH';

                  return (
                    <tr key={e.id} className="hover:bg-[#FFF9F9] transition-colors">
                      {/* IP & Actor */}
                      <td className="py-3.5 px-6 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#ba0816] bg-[#ba0816]/10 px-2 py-0.5 rounded-md">
                            {e.ipAddress}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#63758E] mt-0.5">
                          {e.threatActorName} {e.threatActorEmail !== 'Belirtilmemiş' && `(${e.threatActorEmail})`}
                        </p>
                      </td>

                      {/* Attack Vector */}
                      <td className="py-3.5 px-4 font-bold text-[#25364E]">
                        <span className="font-mono text-xs">{e.attackVector}</span>
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            isCritical
                              ? 'bg-[#ba0816] text-white'
                              : isHigh
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {e.severity}
                        </span>
                      </td>

                      {/* Tool fingerprint */}
                      <td className="py-3.5 px-4 text-[#475569] truncate max-w-[140px]">
                        {e.toolFingerprint}
                      </td>

                      {/* Action taken */}
                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {e.actionTaken}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right font-sans">
                        <div className="inline-flex items-center justify-end gap-2">
                          {e.payloadSnapshot && (
                            <button
                              type="button"
                              onClick={() => setSelectedPayload(e.payloadSnapshot)}
                              className="h-8 px-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-[#25364E] hover:bg-slate-50 cursor-pointer"
                              title="Payload'ı Görüntüle"
                            >
                              <FileCode size={13} />
                              <span>Payload</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleQuarantine(e)}
                            className={`h-8 px-3 inline-flex items-center gap-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
                              e.isQuarantined
                                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                                : 'border-[#ba0816]/30 bg-[#ba0816] text-white shadow-xs hover:bg-[#a00713]'
                            }`}
                          >
                            {isBusy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Ban size={13} />
                            )}
                            <span>{e.isQuarantined ? 'Karantinayı Kaldır' : 'Karantinaya Al'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Block Modal */}
      <ManualBlockModal
        isOpen={isManualBlockOpen}
        onClose={() => setIsManualBlockOpen(false)}
        onSuccess={() => loadData(false)}
      />

      {/* Payload Snapshot Viewer Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-150" onClick={() => setSelectedPayload(null)}>
          <div className="k-modal-glass-card w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-rose-500/25 via-rose-500/10 to-transparent blur-3xl" />
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Terminal size={16} className="text-rose-400" />
              <span>Saldırı Payload Snapshot’ı</span>
            </h4>
            <div className="p-4 rounded-xl border border-white/10 bg-black/60 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96 break-all backdrop-blur-md">
              {selectedPayload}
            </div>
            <div className="mt-4 text-right">
              <button
                type="button"
                onClick={() => setSelectedPayload(null)}
                className="k-modal-glass-btn-secondary h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer active:scale-98"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
