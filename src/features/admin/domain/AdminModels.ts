import { Listing } from '../../listings/domain/Listing';

export interface PlatformStats {
  totalProjects: number;
  activeProjects: number;
  sponsoredProjects: number;
  pendingProjects: number;
  totalUpvotes: number;
  totalUsers: number;
  circulatingCredits: number;
}

export type AdminPermission = 'community' | 'launches' | 'blog';

export interface AdminAccess {
  isAdmin: boolean;
  isOwner: boolean;
  permissions: AdminPermission[];
}

export interface AdminUserSummary {
  id: string;
  fullName: string;
  email?: string;
  role: 'admin' | 'staff' | 'user';
  adminPermissions: AdminPermission[];
  isAdminOwner: boolean;
  boostCredits: number;
  balance: number;
  isVerified: boolean;
  projectsCount: number;
  commentMutedUntil?: string | null;
  createdAt: string;
}

export type AdminListingFilter = 'all' | 'sponsored' | 'active' | 'pending' | 'revision' | 'banned';

export type AdminListingItem = Listing;
