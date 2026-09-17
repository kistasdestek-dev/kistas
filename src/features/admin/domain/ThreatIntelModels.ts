export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ThreatAction =
  | 'HONEYPOT_DECEIVED'
  | 'SILENT_NULL_ROUTED'
  | 'LOGGED'
  | 'QUARANTINED'
  | 'BLOCKED';

export interface ThreatEvent {
  id: string;
  threatActorId: string | null;
  threatActorName: string;
  threatActorEmail: string;
  ipAddress: string;
  userAgent: string;
  toolFingerprint: string;
  attackVector: string;
  severity: ThreatSeverity;
  payloadSnapshot: string;
  actionTaken: ThreatAction;
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
