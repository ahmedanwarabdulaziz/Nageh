import type { Route } from 'next';

export const APP_ROLES = ['superAdmin', 'admin', 'teamHead', 'teamLeader', 'viewer'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const UNKNOWN_ROLE = 'unknown' as const;

export type RoleWithUnknown = AppRole | typeof UNKNOWN_ROLE;

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as ReadonlyArray<string>).includes(value);
}

export function getRoleHomePath(role: AppRole): Route {
  switch (role) {
    case 'superAdmin':
      return '/admin';
    case 'admin':
      return '/dashboard/admin';
    case 'teamHead':
      return '/headers/dashboard';
    case 'teamLeader':
      return '/leaders/members';
    case 'viewer':
      return '/dashboard/viewer';
    default:
      return '/dashboard';
  }
}



