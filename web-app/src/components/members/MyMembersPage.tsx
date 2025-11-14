'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, limit, orderBy, query, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';
import {
  MEMBER_STATUS_VALUES,
  type MemberStatus,
  type MemberStatusScope,
  type MemberStatusScopeType,
  type MemberCategoryScopeType,
  type MemberCategory,
  type MemberElectionDayStatus,
  type MemberAssignments,
  type MemberMeta,
} from '@/types/member';
import { getRoleHomePath, isAppRole } from '@/lib/auth/roles';
import MembersDirectoryPage, { type MemberSearchRecord } from './MembersDirectoryPage';

function toScopeType(value: unknown): MemberStatusScopeType {
  return value === 'head' || value === 'leader' ? value : 'global';
}

function filterMyMembers(
  members: MemberSearchRecord[],
  scopeType: MemberCategoryScopeType,
  scopeId: string | null,
  selectedCategoryId: string | null,
): MemberSearchRecord[] {
  if (!scopeId) {
    return [];
  }

  return members
    .map((member) => {
      const scopes = member.statusScopes ?? [];
      // Find the scope for this user
      const userScope = scopes.find(
        (scope) => scope.scopeType === scopeType && scope.scopeId === scopeId,
      );

      // Only include members that:
      // 1. Have a scope updated by this user
      // 2. The status is not "chance" (user has actually updated it)
      if (!userScope || userScope.status === 'chance') {
        return null;
      }

      // If a category is selected, check if the member has that category
      if (selectedCategoryId) {
        const categoryIds = Array.isArray(userScope.categories) ? userScope.categories : [];
        if (!categoryIds.includes(selectedCategoryId)) {
          return null;
        }
      }

      return member;
    })
    .filter((member): member is MemberSearchRecord => member !== null);
}

export default function MyMembersPage() {
  const { role, profile, user } = useAuth();
  const [allMembers, setAllMembers] = useState<MemberSearchRecord[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<MemberCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const manageableScope = useMemo(() => {
    if (role === 'teamHead' && profile?.headId) {
      return { scopeType: 'head' as MemberCategoryScopeType, scopeId: profile.headId };
    }
    if (role === 'teamLeader') {
      const leaderIds = Array.isArray(profile?.leaderIds)
        ? profile.leaderIds.filter((id): id is string => Boolean(id))
        : [];
      const leaderScopeId = leaderIds[0] && leaderIds[0].length > 0 ? leaderIds[0] : user?.uid ?? null;
      if (leaderScopeId) {
        return { scopeType: 'leader' as MemberCategoryScopeType, scopeId: leaderScopeId };
      }
    }
    return null;
  }, [role, profile?.headId, profile?.leaderIds, user?.uid]);

  // Load all members from memberSearch collection
  useEffect(() => {
    if (!manageableScope) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setLoading(true);
      setError(null);

      try {
        // Fetch all members (we'll filter them client-side)
        const q = query(
          collection(firestore, 'memberSearch'),
          orderBy('fullNameNormalized'),
          limit(5000), // Large limit to get all members, then filter
        );

        const snapshot = await getDocs(q);
        const members: MemberSearchRecord[] = [];

        snapshot.docs.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          const data = docSnap.data() as Partial<MemberSearchRecord>;
          const mobiles = Array.from(new Set([...(data.mobiles ?? [])].filter(Boolean)));

          const statusScopes: MemberStatusScope[] = [];
          const statusScopesRaw = Array.isArray(data.statusScopes)
            ? (data.statusScopes as Array<Record<string, unknown>>)
            : [];

          statusScopesRaw.forEach((scopeRaw) => {
            if (typeof scopeRaw !== 'object' || scopeRaw === null) {
              return;
            }
            const scopeObj = scopeRaw as Record<string, unknown>;
            const scopeType = toScopeType(scopeObj.scopeType);
            const scopeId =
              scopeObj.scopeId === undefined || scopeObj.scopeId === null
                ? null
                : String(scopeObj.scopeId);
            const status = typeof scopeObj.status === 'string' && MEMBER_STATUS_VALUES.includes(scopeObj.status as MemberStatus)
              ? (scopeObj.status as MemberStatus)
              : 'chance';
            const updatedAtValue = scopeObj.updatedAt;
            let updatedAt: string | null = null;
            if (typeof updatedAtValue === 'string') {
              updatedAt = updatedAtValue;
            } else if (updatedAtValue instanceof Date) {
              updatedAt = updatedAtValue.toISOString();
            } else if (
              updatedAtValue &&
              typeof updatedAtValue === 'object' &&
              'toDate' in updatedAtValue &&
              typeof (updatedAtValue as { toDate?: unknown }).toDate === 'function'
            ) {
              try {
                updatedAt = (updatedAtValue as { toDate: () => Date }).toDate().toISOString();
              } catch {
                updatedAt = null;
              }
            }
            const updatedBy =
              scopeObj.updatedBy === undefined || scopeObj.updatedBy === null
                ? null
                : String(scopeObj.updatedBy);
            const displayName =
              scopeObj.displayName === undefined || scopeObj.displayName === null
                ? null
                : String(scopeObj.displayName);
            const categories = Array.isArray(scopeObj.categories)
              ? scopeObj.categories.map((value) => (typeof value === 'string' ? value.trim() : ''))
                  .filter((value): value is string => Boolean(value))
              : [];

            statusScopes.push({
              scopeType,
              scopeId,
              status,
              updatedAt,
              updatedBy,
              displayName,
              categories,
            });
          });

          const record: MemberSearchRecord = {
            memberId: docSnap.id,
            fullName: data.fullName ?? '',
            fullNameNormalized: data.fullNameNormalized ?? '',
            membershipId: data.membershipId ?? null,
            address: data.address ?? null,
            mobiles,
            landLine: data.landLine ?? null,
            status: (data.status as MemberStatus) ?? 'chance',
            electionDayStatus: (data.electionDayStatus as MemberElectionDayStatus) ?? 'pending',
            statusScopes,
            assignments: (data.assignments as MemberAssignments) ?? { headId: null, leaderId: null, groupIds: [] },
            meta: (data.meta as MemberMeta) ?? { createdAt: null, createdBy: null, updatedAt: null, updatedBy: null },
            tokens: Array.isArray(data.tokens) ? data.tokens : [],
          };

          members.push(record);
        });

        if (!cancelled) {
          setAllMembers(members);
        }
      } catch (err) {
        console.error('Failed to load members', err);
        if (!cancelled) {
          setError('تعذر تحميل الأعضاء');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [manageableScope]);

  // Load available categories for the scope
  useEffect(() => {
    if (!manageableScope) {
      return;
    }

    async function loadCategories() {
      try {
        if (!manageableScope) {
          setAvailableCategories([]);
          return;
        }
        const params = new URLSearchParams({
          scopeType: manageableScope.scopeType,
          scopeId: manageableScope.scopeId,
        });
        const data = await fetchWithAuth<{ categories?: MemberCategory[] }>(
          `/api/member-categories?${params.toString()}`,
        );
        setAvailableCategories(data.categories ?? []);
      } catch (error) {
        console.error('Failed to load categories', error);
        setAvailableCategories([]);
      }
    }

    loadCategories();
  }, [manageableScope]);

  // Filter members based on user's updates and selected category
  const filteredMembers = useMemo(() => {
    if (!manageableScope) {
      return [];
    }

    return filterMyMembers(
      allMembers,
      manageableScope.scopeType,
      manageableScope.scopeId,
      selectedCategoryId,
    );
  }, [allMembers, manageableScope, selectedCategoryId]);

  const homeHref = isAppRole(role) ? getRoleHomePath(role) : '/dashboard';

  if (!manageableScope) {
    return (
      <div className="px-6 py-10">
        <div className="rounded-3xl border border-white/10 px-6 py-12 text-center text-white/70">
          لا يمكن الوصول إلى هذه الصفحة بدون ربط رئيس فريق أو قائد.
        </div>
        <footer className="mt-10 flex justify-center">
          <Link href={homeHref} className="text-[var(--color-brand-gold)] underline">
            العودة إلى اللوحة الرئيسية
          </Link>
        </footer>
      </div>
    );
  }

  // Create a wrapper that provides filtered members to MembersDirectoryPage
  // We'll need to modify MembersDirectoryPage to accept props or create a variant
  // For now, let's render a custom view that reuses components from MembersDirectoryPage
  
  if (error) {
    return (
      <div className="px-6 py-10">
        <div className="rounded-3xl border border-rose-400/40 bg-rose-500/10 px-6 py-12 text-center text-rose-200">
          {error}
        </div>
        <footer className="mt-10 flex justify-center">
          <Link href={homeHref} className="text-[var(--color-brand-gold)] underline">
            العودة إلى اللوحة الرئيسية
          </Link>
        </footer>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="rounded-3xl border border-white/10 px-6 py-12 text-center text-white/70">
          جاري تحميل البيانات...
        </div>
      </div>
    );
  }

  return (
    <>
      {availableCategories.length > 0 && (
        <div className="mb-8 px-6">
          <section className="glass-panel rounded-3xl p-6">
            <label className="flex flex-col gap-2 text-sm text-white/80">
              <span>تصفية حسب التصنيف</span>
              <div className="relative">
                <select
                  value={selectedCategoryId ?? ''}
                  onChange={(event) => setSelectedCategoryId(event.target.value || null)}
                  className="app-select w-full"
                >
                  <option value="">جميع التصنيفات</option>
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute inset-y-0 left-4 my-auto h-4 w-4 text-white/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </label>
          </section>
        </div>
      )}

      {filteredMembers.length === 0 ? (
        <div className="px-6 py-10">
          <div className="rounded-3xl border border-white/10 px-6 py-12 text-center text-white/70">
            {selectedCategoryId
              ? 'لا توجد أعضاء في هذا التصنيف.'
              : 'لم تقم بتحديث حالة أي عضو بعد.'}
          </div>
          <footer className="mt-10 flex justify-center">
            <Link href={homeHref} className="text-[var(--color-brand-gold)] underline">
              العودة إلى اللوحة الرئيسية
            </Link>
          </footer>
        </div>
      ) : (
        <MembersDirectoryPage
          preloadedMembers={filteredMembers}
          hideSearch={true}
          hideStatusFilter={true}
          title="أعضائي"
          subtitle="الأعضاء الذين قمت بتحديث حالاتهم (لا يتضمن الأعضاء بحالة 'فرصة')."
        />
      )}
    </>
  );
}
