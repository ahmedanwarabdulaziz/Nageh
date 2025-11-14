/* eslint-disable @typescript-eslint/no-empty-function */
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebaseAuth, firestore } from '@/lib/firebase/client';
import { RoleWithUnknown, UNKNOWN_ROLE, isAppRole } from '@/lib/auth/roles';
import type { UserProfile } from '@/types/user';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  role: RoleWithUnknown;
  setRole: (role: RoleWithUnknown) => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  role: UNKNOWN_ROLE,
  setRole: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [role, setRole] = useState<RoleWithUnknown>(UNKNOWN_ROLE);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(UNKNOWN_ROLE);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const profileRef = doc(firestore, 'userProfiles', user.uid);

    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        const data = snapshot.data() as UserProfile | undefined;
        const nextRole = data?.role;
        setRole(nextRole && isAppRole(nextRole) ? nextRole : UNKNOWN_ROLE);
        setProfileLoading(false);
      },
      (error) => {
        console.error('Failed to load user profile:', error);
        setRole(UNKNOWN_ROLE);
        setProfileLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const loading = authLoading || profileLoading;

  const value = useMemo(
    () => ({
      user,
      loading,
      role,
      setRole,
    }),
    [user, loading, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
