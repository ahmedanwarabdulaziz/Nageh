import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppRole, isAppRole } from './roles';
import type { UserProfile } from '@/types/user';

export type AuthenticatedContext = {
  uid: string;
  role: AppRole;
  profile: UserProfile;
};

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

async function loadUserProfile(uid: string): Promise<UserProfile> {
  const snapshot = await adminDb.collection('userProfiles').doc(uid).get();
  if (!snapshot.exists) {
    throw new UnauthorizedError('User profile not found');
  }
  return snapshot.data() as UserProfile;
}

export async function authenticateRequest(
  request: NextRequest,
  allowedRoles?: ReadonlyArray<AppRole>,
): Promise<AuthenticatedContext> {
  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new UnauthorizedError('Missing token value');
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  const profile = await loadUserProfile(uid);
  const role = profile.role ?? decoded.role;

  if (!isAppRole(role)) {
    throw new UnauthorizedError('User role is not recognized');
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new ForbiddenError();
  }

  return { uid, role, profile };
}



