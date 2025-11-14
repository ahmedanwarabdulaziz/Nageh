import type { Timestamp } from 'firebase/firestore';
import type { AppRole } from '@/lib/auth/roles';

export type UserProfile = {
  role: AppRole;
  displayName?: string;
  email?: string;
  phone?: string;
  headId?: string | null;
  leaderIds?: string[];
  superAdminManaged?: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: Timestamp | null;
  createdAt?: Timestamp | null;
};



