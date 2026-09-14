/**
 * Auth & Profile Domain Models
 */


export interface UserProfile {
  id: string;
  email?: string;
  role?: 'admin' | 'user';
  phone?: string | null;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  iban?: string | null;
  identityNumber?: string | null;
  availableBalance: number;
  pendingBalance: number;
  boostCredits?: number;
  ratingAverage: number;
  ratingCount: number;
  city?: string | null;
  district?: string | null;
  isVerified: boolean;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PendingRegistrationConsents {
  kvkkAydinlatma: boolean;
  acikRiza: boolean;
  ticariIleti: boolean;
}

export interface AuthSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  profile: UserProfile | null;
}
