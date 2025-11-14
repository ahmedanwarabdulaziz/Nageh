'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebaseAuth, firestore } from '@/lib/firebase/client';
import { RoleWithUnknown, UNKNOWN_ROLE, isAppRole } from '@/lib/auth/roles';
import type { UserProfile } from '@/types/user';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  role: RoleWithUnknown;
  profile: UserProfile | null;
  setRole: (role: RoleWithUnknown) => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  role: UNKNOWN_ROLE,
  profile: null,
  setRole: () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [role, setRole] = useState<RoleWithUnknown>(UNKNOWN_ROLE);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (!firebaseUser) {
        setRole(UNKNOWN_ROLE);
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeProfile: (() => void) | undefined;

    const clearProfileListener = () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }
    };

    const resolveRoleFromClaims = async (firebaseUser: User) => {
      setClaimsLoading(true);
      try {
        const tokenResult = await getIdTokenResult(firebaseUser, true);
        const claimRole = tokenResult.claims.role;
        if (isAppRole(claimRole)) {
          setRole(claimRole);
        }
      } catch (error) {
        console.error('Failed to load role claims:', error);
      } finally {
        if (isMounted) {
          setClaimsLoading(false);
        }
      }
    };

    if (!user) {
      clearProfileListener();
      setClaimsLoading(false);
      setProfileLoading(false);
      setProfile(null);
      return () => {
        isMounted = false;
        clearProfileListener();
      };
    }

    resolveRoleFromClaims(user).catch((error) => {
      console.error('Unexpected role claim error:', error);
    });

    setProfileLoading(true);
    const profileRef = doc(firestore, 'userProfiles', user.uid);

    unsubscribeProfile = onSnapshot(
      profileRef,
      (snapshot) => {
        if (!isMounted) {
          return;
        }
        const data = snapshot.data() as UserProfile | undefined;
        const nextRole = data?.role;
        if (nextRole && isAppRole(nextRole)) {
          setRole(nextRole);
        }
        setProfile(data ?? null);
        setProfileLoading(false);
      },
      (error) => {
        console.error('Failed to load user profile:', error);
        if (isMounted) {
          // Keep existing role (possibly from claims) but stop loading.
          setProfileLoading(false);
        }
      },
    );

    return () => {
      isMounted = false;
      clearProfileListener();
    };
  }, [user]);

  const loading = authLoading || claimsLoading || profileLoading;

  const value = useMemo(
    () => ({
      user,
      loading,
      role,
      profile,
      setRole,
    }),
    [user, loading, role, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}


