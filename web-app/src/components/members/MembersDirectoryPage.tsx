'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  doc,
  updateDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import {
  ArrowClockwise,
  MagnifyingGlass,
  PhoneCall,
  AddressBook,
  CaretDown,
  Plus,
  Tag,
  Trash,
  XCircle,
} from '@phosphor-icons/react/dist/ssr';
import { firestore } from '@/lib/firebase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';
import {
  MEMBER_STATUS_VALUES,
  type MemberElectionDayStatus,
  type MemberStatus,
  type MemberStatusScope,
  type MemberStatusScopeType,
  type MemberCategory,
  type MemberCategoryScopeType,
} from '@/types/member';
import { buildSearchTokens, tokenizeQuery, normalizeArabic } from '@/lib/search/utils';
import { getRoleHomePath, isAppRole } from '@/lib/auth/roles';

interface MemberAssignmentsLite {
  headId?: string | null;
  leaderId?: string | null;
  groupIds?: string[];
}

interface MemberMetaLite {
  createdAt?: Date | string | { toDate: () => Date } | null;
  createdBy?: string | null;
  updatedAt?: Date | string | { toDate: () => Date } | null;
  updatedBy?: string | null;
}

export interface MemberSearchRecord {
  memberId: string;
  fullName: string;
  fullNameNormalized: string;
  membershipId: string | null;
  address: string | null;
  mobiles: string[];
  landLine: string | null;
  status: MemberStatus;
  electionDayStatus: MemberElectionDayStatus;
  statusScopes?: MemberStatusScope[];
  assignments?: MemberAssignmentsLite | null;
  meta?: MemberMetaLite | null;
  tokens: string[];
}

type StatusUpdateResponse = {
  status: MemberStatus;
  electionDayStatus?: MemberElectionDayStatus | null;
  statusScopes?: MemberStatusScope[];
  assignments?: MemberAssignmentsLite | null;
};

type NavigatorWithContacts = Navigator & {
  contacts?: {
    select?: (
      properties: string[],
      options?: { multiple?: boolean },
    ) => Promise<Array<{ tel?: string[]; name?: string }>>;
  };
};

const membershipIdRegex = /^[0-9]{2,}$/;
const phoneRegex = /^0?[1-9][0-9]{7,}$/;

const PAGE_SIZE = 20;
const CONTACT_PICKER_AVAILABLE =
  typeof navigator !== 'undefined' &&
  typeof (navigator as NavigatorWithContacts).contacts?.select === 'function';

function normalizeScopeStatus(value: unknown): MemberStatus {
  if (typeof value === 'string' && MEMBER_STATUS_VALUES.includes(value as MemberStatus)) {
    return value as MemberStatus;
  }
  return 'chance';
}

function toScopeType(value: unknown): MemberStatusScopeType {
  return value === 'head' || value === 'leader' ? value : 'global';
}

function formatScopeTimestamp(value: MemberStatusScope['updatedAt']) {
  if (!value) return 'غير محدد';
  try {
    if (value instanceof Date) {
      return value.toLocaleString('ar-EG');
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ar-EG');
    }
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      const candidate = value as { toDate?: () => Date };
      if (typeof candidate.toDate === 'function') {
        return candidate.toDate().toLocaleString('ar-EG');
      }
    }
  } catch (error) {
    console.error('Failed to format scope timestamp', error);
  }
  return 'غير محدد';
}

type StatusFilter = MemberStatus | 'all';

interface SearchFormState {
  search: string;
  status: StatusFilter;
}

const STATUS_LABELS: Record<MemberStatus, string> = {
  chance: 'فرصة',
  contacted: 'تم التواصل',
  committed: 'التزام',
  voteSecured: 'صوت مؤكد',
  no: 'غير مهتم',
  voted: 'صوّت',
};

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'جميع الحالات',
  ...STATUS_LABELS,
};

const INITIAL_FORM: SearchFormState = {
  search: '',
  status: 'all',
};

function isMembershipIdSearch(term: string) {
  return membershipIdRegex.test(term.replace(/\s+/g, ''));
}

function isPhoneSearch(term: string) {
  const cleaned = term.replace(/[^0-9]/g, '');
  if (!cleaned) return false;
  return phoneRegex.test(cleaned);
}

function normalizePhoneInput(term: string) {
  const digits = term.replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) return digits;
  return `0${digits}`;
}

function formatPhoneNumber(value: string | null | undefined) {
  if (!value) return { display: 'غير متوفر', tel: null };
  const raw = value.toString().replace(/[^\d+]/g, '');
  if (!raw) return { display: 'غير متوفر', tel: null };

  let digits = raw;

  if (digits.startsWith('+20') && digits.length >= 13) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.startsWith('20') && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  } else if (!digits.startsWith('0') && digits.length >= 9 && digits.length <= 11) {
    digits = `0${digits}`;
  }

  const tel = `tel:${digits}`;
  return { display: digits, tel };
}

function formatDate(value: unknown) {
  if (!value) return 'غير متوفر';
  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    date = Number.isNaN(parsed.getTime()) ? null : parsed;
  } else if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    date = value.toDate();
  }

  if (!date) return 'غير متوفر';

  try {
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (error) {
    console.error('Failed to format date:', error);
    return date.toLocaleString('ar-EG');
  }
}

function makeScopeKey(scopeType: MemberCategoryScopeType, scopeId: string) {
  return `${scopeType}:${scopeId}`;
}

function buildSearchQuery({
  status,
  tokens,
  rawTerm,
  primaryToken,
}: {
  status: StatusFilter;
  tokens: string[];
  rawTerm: string;
  primaryToken?: string | null;
}) {
  const constraints: Array<ReturnType<typeof where> | ReturnType<typeof orderBy> | ReturnType<typeof limit>> = [];

  if (status !== 'all') {
    constraints.push(where('status', '==', status));
  }

  const trimmed = rawTerm.trim();

  if (trimmed && isMembershipIdSearch(trimmed)) {
    constraints.push(where('membershipId', '==', trimmed));
    constraints.push(limit(40));
  } else if (trimmed && isPhoneSearch(trimmed)) {
    const normalizedPhone = normalizePhoneInput(trimmed);
    if (normalizedPhone) {
      constraints.push(where('mobiles', 'array-contains', normalizedPhone));
      constraints.push(limit(40));
    }
  } else if (tokens.length > 0) {
    const tokenForQuery = primaryToken ?? tokens[0];
    constraints.push(where('tokens', 'array-contains', tokenForQuery));
    constraints.push(limit(200));
  } else {
    constraints.push(orderBy('fullNameNormalized'));
    constraints.push(limit(PAGE_SIZE));
  }

  return query(collection(firestore, 'memberSearch'), ...constraints);
}

type UseMemberSearchArgs = {
  status: StatusFilter;
  term: string;
};

function useMemberSearch({ status, term }: UseMemberSearchArgs) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<MemberSearchRecord[]>([]);

  const normalizedTokens = useMemo(() => tokenizeQuery(term), [term]);
  const rawTerm = term.trim();
  const normalizedFull = useMemo(() => normalizeArabic(term), [term]);
  const hasSearch = normalizedTokens.length > 0 || isMembershipIdSearch(rawTerm) || isPhoneSearch(rawTerm);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!hasSearch && status === 'all') {
        setRecords([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const tokensToQuery = normalizedTokens.length > 0 ? normalizedTokens.slice(0, 4) : [null];

        const seen = new Map<string, MemberSearchRecord>();

        for (const [index, token] of tokensToQuery.entries()) {
          const snapshot = await getDocs(
            buildSearchQuery({
              status,
              tokens: normalizedTokens,
              rawTerm,
              primaryToken: token ?? undefined,
            }),
          );

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

              const categories = Array.isArray(scopeObj.categories)
                ? scopeObj.categories
                    .map((value) => (typeof value === 'string' ? value.trim() : ''))
                    .filter((value): value is string => Boolean(value))
                : [];

              statusScopes.push({
                scopeType,
                scopeId,
                status: normalizeScopeStatus(scopeObj.status),
                updatedAt,
                updatedBy:
                  scopeObj.updatedBy === undefined || scopeObj.updatedBy === null
                    ? null
                    : String(scopeObj.updatedBy),
                displayName:
                  scopeObj.displayName === undefined || scopeObj.displayName === null
                    ? null
                    : String(scopeObj.displayName),
                categories,
              });
            });

            if (!statusScopes.some((scope) => scope.scopeType === 'global' && scope.scopeId === null)) {
              statusScopes.push({
                scopeType: 'global',
                scopeId: null,
                status: normalizeScopeStatus(data.status),
                updatedAt: null,
                updatedBy: null,
                displayName: 'عام',
                categories: [],
              });
            }

            const record: MemberSearchRecord = {
              memberId: data.memberId ?? docSnap.id,
              fullName: data.fullName ?? '',
              fullNameNormalized: data.fullNameNormalized ?? normalizeArabic(data.fullName ?? ''),
              membershipId: data.membershipId ?? null,
              address: data.address ?? null,
              mobiles,
              landLine: data.landLine ?? null,
              status: (data.status as MemberStatus) ?? 'chance',
              electionDayStatus:
                (data.electionDayStatus as MemberElectionDayStatus) ?? 'pending',
              statusScopes,
              assignments: {
                headId: data.assignments?.headId ?? null,
                leaderId: data.assignments?.leaderId ?? null,
                groupIds: Array.isArray(data.assignments?.groupIds)
                  ? data.assignments?.groupIds ?? []
                  : [],
              },
              meta: data.meta ?? {},
              tokens:
                data.tokens ??
                buildSearchTokens([
                  data.fullName,
                  data.membershipId ?? undefined,
                  data.address ?? undefined,
                  ...mobiles,
                ]),
            } satisfies MemberSearchRecord;

            if (!seen.has(record.memberId)) {
              seen.set(record.memberId, record);
            }
          });

          if (seen.size >= 200 || (index === 0 && seen.size >= 60)) {
            break;
          }
        }

        const docs = Array.from(seen.values());

        let filtered = docs;
        if (normalizedFull.length > 0 && !isMembershipIdSearch(rawTerm) && !isPhoneSearch(rawTerm)) {
          filtered = docs.filter((record) => record.fullNameNormalized.includes(normalizedFull));

          if (filtered.length === 0 && normalizedTokens.length > 0) {
            filtered = docs.filter((record) => normalizedTokens.every((token) => record.tokens.includes(token)));
          }
        }

        const hasNameSearch = normalizedTokens.length > 0 && !isMembershipIdSearch(rawTerm) && !isPhoneSearch(rawTerm);
        const firstToken = hasNameSearch ? normalizedTokens[0] : null;

        const ranked = filtered.map((record) => {
          const nameTokens = record.fullNameNormalized.split(' ').filter(Boolean);
          let score = 0;
          if (hasNameSearch && normalizedFull && record.fullNameNormalized.startsWith(normalizedFull)) {
            score = 3;
          } else if (hasNameSearch && firstToken && nameTokens[0] === firstToken) {
            score = 2;
          } else if (hasNameSearch && firstToken && nameTokens.some((token) => token.startsWith(firstToken))) {
            score = 1;
          }
          return { record, score };
        });

        const sorted = ranked
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.record.fullNameNormalized.localeCompare(b.record.fullNameNormalized);
          })
          .map((entry) => entry.record);

        setRecords(sorted);
      } catch (err) {
        console.error('Failed to fetch search results:', err);
        if (!cancelled) {
          setError('تعذر تحميل البيانات. حاول مرة أخرى.');
          setRecords([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [status, term, hasSearch, normalizedTokens, normalizedFull, rawTerm]);

  return { results: records, loading, error };
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-white/10 px-6 py-16 text-center text-white/70">
      <p>ابدأ بإدخال اسم العضو، رقم العضوية أو رقم الهاتف لعرض النتائج.</p>
    </div>
  );
}

type StatusSelectProps = {
  memberId: string;
  value: MemberStatus;
  variant?: 'table' | 'card';
  disabled?: boolean;
  error?: string | null;
  onChange: (memberId: string, status: MemberStatus) => void;
};

function StatusSelect({
  memberId,
  value,
  variant = 'card',
  disabled = false,
  error,
  onChange,
}: StatusSelectProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(memberId, event.target.value as MemberStatus);
  };

  const selectClass =
    variant === 'table'
      ? 'app-select w-full pr-10 text-xs md:text-sm'
      : 'app-select w-full pr-10 text-sm';

  return (
    <div className="flex flex-col gap-1 text-xs text-white/70">
      <div className="relative">
        <select
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={selectClass}
          aria-label="تحديث الحالة الحالية"
        >
          {MEMBER_STATUS_VALUES.map((statusKey) => (
            <option key={statusKey} value={statusKey}>
              {STATUS_LABELS[statusKey]}
            </option>
          ))}
        </select>
        <CaretDown
          size={14}
          weight="bold"
          className="pointer-events-none absolute inset-y-0 left-4 my-auto text-white/60"
        />
      </div>
      {disabled ? <span className="text-[10px] text-white/60">جاري الحفظ...</span> : null}
      {error ? <span className="text-[10px] text-rose-300">{error}</span> : null}
    </div>
  );
}

type StatusHistoryListProps = {
  scopes: MemberStatusScope[];
  formatScopeLabel: (scope: MemberStatusScope) => string;
  getCategoryDetails?: (categoryId: string) => MemberCategory | null;
  variant?: 'card' | 'table';
};

function StatusHistoryList({
  scopes,
  formatScopeLabel,
  getCategoryDetails,
  variant = 'card',
}: StatusHistoryListProps) {
  if (scopes.length === 0) {
    return <p className="text-xs text-white/50">لا توجد حالات مخصصة.</p>;
  }

  const containerClass =
    variant === 'card'
      ? 'space-y-2 text-xs text-white/70'
      : 'space-y-1 text-[11px] text-white/70';

  const itemClass =
    variant === 'card'
      ? 'space-y-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2'
      : 'space-y-1 rounded-xl border border-white/10 bg-white/5 px-2 py-2';

  const headerClass =
    variant === 'card'
      ? 'flex items-center justify-between gap-2'
      : 'flex items-center justify-between gap-2';

  return (
    <ul className={containerClass}>
      {scopes.map((scope, index) => {
        const label = formatScopeLabel(scope);
        const updatedAt = formatScopeTimestamp(scope.updatedAt);
        const categories =
          Array.isArray(scope.categories) && scope.categories.length > 0 ? scope.categories : [];
        return (
          <li
            key={`${scope.scopeType}-${scope.scopeId ?? 'global'}-${index}`}
            className={itemClass}
          >
            <div className={headerClass}>
              <span className="text-white">
                <span className="font-semibold">{label}</span> —{' '}
                {STATUS_LABELS[scope.status]}
              </span>
              <span className="text-[10px] text-white/50">{updatedAt}</span>
            </div>
            {categories.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((categoryId) => {
                  const category = getCategoryDetails?.(categoryId);
                  const labelText = category?.name ?? 'تصنيف غير متوفر';
                  return (
                    <span
                      key={`${scope.scopeType}-${scope.scopeId ?? 'global'}-${categoryId}`}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] text-white/80"
                    >
                      <Tag size={10} weight="bold" />
                      {labelText}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

type CategorySelectorProps = {
  availableCategoryIds: string[];
  selectedCategoryIds: string[];
  getCategoryDetails: (categoryId: string) => MemberCategory | null;
  onToggle: (categoryId: string) => void;
  disabled?: boolean;
};

function CategorySelector({
  availableCategoryIds,
  selectedCategoryIds,
  getCategoryDetails,
  onToggle,
  disabled = false,
}: CategorySelectorProps) {
  if (availableCategoryIds.length === 0) {
    return <p className="text-xs text-white/60">لا توجد تصنيفات متاحة بعد.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableCategoryIds.map((categoryId) => {
        const category = getCategoryDetails(categoryId);
        if (!category) return null;
        const active = selectedCategoryIds.includes(categoryId);
        return (
          <button
            key={categoryId}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(categoryId)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)] ${
              active
                ? 'border-[var(--color-brand-gold)] bg-[var(--color-brand-gold)] text-black'
                : 'border-white/20 bg-white/5 text-white hover:border-white/40'
            } ${disabled ? 'opacity-60' : ''}`}
          >
            <Tag size={14} weight="bold" />
            <span>{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}

type CategoryManagerModalProps = {
  isOpen: boolean;
  scopeLabel: string;
  categories: MemberCategory[];
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
  creating: boolean;
  deletingId: string | null;
  error: string | null;
};

function CategoryManagerModal({
  isOpen,
  scopeLabel,
  categories,
  onClose,
  onCreate,
  onDelete,
  creating,
  deletingId,
  error,
}: CategoryManagerModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      const timeout = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await onCreate(trimmed);
      setName('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to create category', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#14141c] p-6 text-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading text-[var(--color-brand-gold)]">إدارة التصنيفات</h2>
            <p className="mt-1 text-sm text-white/60">النطاق الحالي: {scopeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 p-2 text-white/70 transition hover:border-white/40 hover:text-white"
            aria-label="إغلاق"
          >
            <XCircle size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="flex flex-col gap-2 text-sm text-white/80">
            <span>اسم التصنيف</span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="مثال: أصحاب الأنشطة التجارية"
              disabled={creating}
              className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[var(--color-brand-gold)] focus:outline-none"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold)] px-4 py-2 text-sm text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} weight="bold" />
              إضافة تصنيف
            </button>
          </div>
        </form>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-white/80">التصنيفات الحالية</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-white/50">لم تقم بإنشاء أي تصنيف بعد.</p>
          ) : (
            <ul className="space-y-2 text-sm text-white/80">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    {category.color ? (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                        aria-hidden
                      />
                    ) : (
                      <Tag size={16} className="text-[var(--color-brand-gold)]" weight="bold" />
                    )}
                    <span>{category.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(category.id)}
                    disabled={deletingId === category.id}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-50"
                  >
                    <Trash size={14} weight="bold" />
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  onMobileAdded,
  onStatusChange,
  statusUpdating,
  statusError,
  canEdit,
  displayStatus,
  resolveVisibleScopes,
  formatScopeLabel,
  getCategoryDetails,
  availableCategoryIds,
  selectedCategoryIds,
  onCategoryToggle,
  canManageCategories,
  categoryUpdating,
  onOpenCategoryManager,
}: {
  member: MemberSearchRecord;
  onMobileAdded: (mobiles: string[]) => void;
  onStatusChange: (memberId: string, status: MemberStatus) => void;
  statusUpdating: boolean;
  statusError: string | null;
  canEdit: boolean;
  displayStatus: MemberStatus;
  resolveVisibleScopes: (member: MemberSearchRecord) => MemberStatusScope[];
  formatScopeLabel: (scope: MemberStatusScope) => string;
  getCategoryDetails: (categoryId: string) => MemberCategory | null;
  availableCategoryIds: string[];
  selectedCategoryIds: string[];
  onCategoryToggle: (memberId: string, categoryId: string) => void;
  canManageCategories: boolean;
  categoryUpdating: boolean;
  onOpenCategoryManager: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localMobiles, setLocalMobiles] = useState<string[]>(member.mobiles);
  const [expanded, setExpanded] = useState(false);
  const visibleScopes = useMemo(
    () => resolveVisibleScopes(member),
    [member, resolveVisibleScopes],
  );
  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      onCategoryToggle(member.memberId, categoryId);
    },
    [member.memberId, onCategoryToggle],
  );
  const categorySectionDisabled = statusUpdating || categoryUpdating;

  useEffect(() => {
    setLocalMobiles(member.mobiles);
  }, [member.mobiles]);

  const landLine = formatPhoneNumber(member.landLine);

  const persistMobile = async (value: string) => {
    const phone = formatPhoneNumber(value);
    if (!phone.tel || !phone.display || phone.display === 'غير متوفر') return;

    const updatedMobiles = Array.from(new Set([...localMobiles, phone.display]));

    setSaving(true);
    setErrorMessage(null);
    try {
      const memberRef = doc(firestore, 'members', member.memberId);
      const newTokens = buildSearchTokens([
        member.fullName,
        member.membershipId ?? undefined,
        member.address ?? undefined,
        ...updatedMobiles,
      ]);

      await updateDoc(memberRef, {
        'contact.mobile': updatedMobiles[0] ?? null,
        'contact.mobiles': updatedMobiles,
        searchTokens: newTokens,
      });

      const searchRef = doc(firestore, 'memberSearch', member.memberId);
      await updateDoc(searchRef, {
        mobiles: updatedMobiles,
        tokens: newTokens,
      });

      setLocalMobiles(updatedMobiles);
      onMobileAdded(updatedMobiles);
    } catch (error) {
      console.error('Failed to save mobile number:', error);
      setErrorMessage('تعذر حفظ الرقم الجديد. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const handleLocalContactPick = async () => {
    if (!CONTACT_PICKER_AVAILABLE) return;
    try {
      const nav = navigator as NavigatorWithContacts;
      const contacts = (await nav.contacts?.select?.(['tel', 'name'], { multiple: false })) ?? [];
      if (!contacts || contacts.length === 0) return;
      const numbers = (contacts[0].tel ?? [])
        .map((value) => formatPhoneNumber(value).display)
        .filter((v) => v && v !== 'غير متوفر');
      await Promise.all(numbers.map((number) => persistMobile(number)));
    } catch (error) {
      console.error('Failed to pick contact:', error);
    }
  };

  const handleManualAdd = async () => {
    const input = window.prompt('أدخل رقم الموبايل الجديد:');
    if (!input) return;
    await persistMobile(input);
  };

  const displayMobiles = Array.from(new Set(localMobiles));

  return (
    <article
      className={`rounded-3xl border border-white/10 bg-white/5 text-white/80 shadow-sm transition ${
        expanded ? 'border-white/20 bg-white/10' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-transparent px-1 py-2 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]"
      >
        <div className="text-start">
          <h3 className="text-lg font-heading text-white">{member.fullName}</h3>
          <p className="text-xs text-white/60">رقم العضوية: {member.membershipId ?? 'غير متوفر'}</p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit ? (
            <StatusSelect
              memberId={member.memberId}
              value={displayStatus}
              onChange={onStatusChange}
              disabled={statusUpdating}
              error={statusError}
              variant="card"
            />
          ) : (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-[var(--color-brand-gold)]">
              {STATUS_LABELS[displayStatus]}
            </span>
          )}
          <CaretDown
            size={18}
            weight="bold"
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {expanded ? (
        <div className="mt-4 space-y-4 text-sm">
          <dl className="space-y-2">
            <fieldset className="space-y-2 border-b border-white/10 pb-3">
              <legend className="flex flex-col gap-2 text-white/60">
                <span className="flex items-center justify-between gap-2">
                  <span>أرقام المحمول</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLocalContactPick}
                      disabled={!CONTACT_PICKER_AVAILABLE || saving}
                      className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
                        CONTACT_PICKER_AVAILABLE
                          ? 'border-white/20 text-white hover:border-white/40'
                          : 'border-white/10 text-white/40'
                      }`}
                    >
                      <AddressBook size={14} />
                      جهات الاتصال
                    </button>
                    <button
                      type="button"
                      onClick={handleManualAdd}
                      disabled={saving}
                      className="rounded-full border border-white/20 px-2 py-1 text-xs text-white transition hover:border-white/40"
                    >
                      إضافة رقم
                    </button>
                  </div>
                </span>
              </legend>
      <div className="space-y-2">
        {displayMobiles.length > 0 ? (
          displayMobiles.map((mobile) => {
            const phone = formatPhoneNumber(mobile);
            return (
              <div
                key={mobile}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white/80"
              >
                <span>{phone.display}</span>
                {phone.tel ? (
                  <a
                    href={`tel:${phone.tel}`}
                    className="flex items-center gap-2 rounded-full bg-[var(--color-brand-gold)] px-3 py-1 text-xs text-black transition hover:bg-white"
                  >
                    <PhoneCall size={16} weight="bold" />
                    اتصال
                  </a>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="text-xs text-white/50">لا توجد أرقام مضافة بعد.</p>
        )}
      </div>
            </fieldset>
            <div className="space-y-1 border-b border-white/10 pb-3">
              <dt className="text-white/60">العنوان</dt>
              <dd>{member.address ?? 'غير متوفر'}</dd>
            </div>
            <div className="space-y-1 border-b border-white/10 pb-3">
              <dt className="text-white/60">التليفون الأرضي</dt>
              <dd>{landLine.display}</dd>
            </div>
            <div className="space-y-1 border-b border-white/10 pb-3">
              <dt className="text-white/60">آخر تحديث</dt>
              <dd>{member.meta?.updatedAt ? formatDate(member.meta.updatedAt) : 'غير متوفر'}</dd>
            </div>
          </dl>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          {canManageCategories ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-white/80">تصنيفاتك لهذا العضو</h4>
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  <Tag size={14} weight="bold" />
                  إدارة التصنيفات
                </button>
              </div>
              {availableCategoryIds.length > 0 ? (
                <CategorySelector
                  availableCategoryIds={availableCategoryIds}
                  selectedCategoryIds={selectedCategoryIds}
                  getCategoryDetails={getCategoryDetails}
                  onToggle={handleCategoryToggle}
                  disabled={categorySectionDisabled}
                />
              ) : (
                <div className="text-xs text-white/60">
                  لم تقم بإنشاء تصنيفات بعد.
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className="mr-2 inline-flex items-center gap-1 text-[var(--color-brand-gold)] transition hover:text-white"
                  >
                    <Plus size={12} weight="bold" />
                    إنشاء أول تصنيف
                  </button>
                </div>
              )}
              {categorySectionDisabled ? (
                <p className="mt-2 text-[10px] text-white/60">جاري حفظ التغييرات...</p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h4 className="mb-3 text-sm font-semibold text-white/80">
              سجل الحالات (حسب النطاق)
            </h4>
            <StatusHistoryList
              scopes={visibleScopes}
              formatScopeLabel={formatScopeLabel}
              getCategoryDetails={getCategoryDetails}
              variant="card"
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MembersTable({
  rows,
  onStatusChange,
  statusUpdating,
  statusErrors,
  canEditStatus,
  getDisplayStatus,
  resolveVisibleScopes,
  formatScopeLabel,
  getCategoryDetails,
  getAvailableCategories,
  getSelectedCategories,
  onCategoryToggle,
  canManageCategories,
  categoryUpdating,
  onOpenCategoryManager,
}: {
  rows: MemberSearchRecord[];
  onStatusChange: (memberId: string, status: MemberStatus) => void;
  statusUpdating: Record<string, boolean>;
  statusErrors: Record<string, string | null>;
  canEditStatus: (member: MemberSearchRecord) => boolean;
  getDisplayStatus: (member: MemberSearchRecord) => MemberStatus;
  resolveVisibleScopes: (member: MemberSearchRecord) => MemberStatusScope[];
  formatScopeLabel: (scope: MemberStatusScope) => string;
  getCategoryDetails: (categoryId: string) => MemberCategory | null;
  getAvailableCategories: (member: MemberSearchRecord) => string[];
  getSelectedCategories: (member: MemberSearchRecord) => string[];
  onCategoryToggle: (memberId: string, categoryId: string) => void;
  canManageCategories: (member: MemberSearchRecord) => boolean;
  categoryUpdating: Record<string, boolean>;
  onOpenCategoryManager: () => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 px-6 py-12 text-center text-white/70">
        لا توجد نتائج مطابقة لخيارات البحث الحالية.
      </div>
    );
  }

  return (
    <div className="hidden overflow-x-auto rounded-3xl border border-white/10 md:block">
      <table className="min-w-full divide-y divide-white/10 text-right text-sm text-white/80">
        <thead className="bg-white/5 text-xs uppercase text-white/60">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              الاسم الكامل
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              رقم العضوية
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              أرقام المحمول
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              الهاتف الأرضي
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              العنوان
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              الحالة الحالية
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              التصنيفات
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              سجل الحالات
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((member) => {
            const landLine = formatPhoneNumber(member.landLine);
            const mobileLinks = member.mobiles.length > 0 ? member.mobiles : ['غير متوفر'];
            const canEdit = canEditStatus(member);
            const visibleStatus = getDisplayStatus(member);
            const scopeHistory = resolveVisibleScopes(member);
            const availableCategories = getAvailableCategories(member);
            const selectedCategories = getSelectedCategories(member);
            const selectedCategoryDetails = selectedCategories
              .map((categoryId) => getCategoryDetails(categoryId))
              .filter((value): value is MemberCategory => Boolean(value));
            const canManageCats = canManageCategories(member);
            const categoryDisabled =
              (statusUpdating[member.memberId] ?? false) || (categoryUpdating[member.memberId] ?? false);
            const handleToggleCategory = (categoryId: string) => onCategoryToggle(member.memberId, categoryId);

            return (
              <tr key={member.memberId} className="hover:bg-white/5">
                <td className="whitespace-nowrap px-4 py-3 text-white">{member.fullName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white/70">{member.membershipId ?? '-'}</td>
                <td className="px-4 py-3 text-white/70">
                  <div className="flex flex-col gap-1">
                    {mobileLinks.map((value) => {
                      const phone = formatPhoneNumber(value);
                      return phone.tel ? (
                        <a
                          key={`${member.memberId}-${phone.display}`}
                          href={phone.tel}
                          className="flex items-center gap-2 text-[var(--color-brand-gold)] hover:text-white"
                        >
                          <PhoneCall size={16} />
                          {phone.display}
                        </a>
                      ) : (
                        <span key={`${member.memberId}-${phone.display}`}>{phone.display}</span>
                      );
                    })}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-white/70">{landLine.display}</td>
                <td className="px-4 py-3 text-white/70">{member.address ?? '-'}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {canEdit ? (
                    <StatusSelect
                      memberId={member.memberId}
                      value={visibleStatus}
                      onChange={onStatusChange}
                      disabled={statusUpdating[member.memberId] ?? false}
                      error={statusErrors[member.memberId] ?? null}
                      variant="table"
                    />
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-[var(--color-brand-gold)]">
                      {STATUS_LABELS[visibleStatus]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {canManageCats ? (
                    <div className="flex flex-col gap-2">
                      {availableCategories.length > 0 ? (
                        <CategorySelector
                          availableCategoryIds={availableCategories}
                          selectedCategoryIds={selectedCategories}
                          getCategoryDetails={getCategoryDetails}
                          onToggle={handleToggleCategory}
                          disabled={categoryDisabled}
                        />
                      ) : (
                        <span className="text-xs text-white/60">
                          لم تُنشئ تصنيفات بعد.
                          <button
                            type="button"
                            onClick={onOpenCategoryManager}
                            className="mr-2 inline-flex items-center gap-1 text-[var(--color-brand-gold)] transition hover:text-white"
                          >
                            <Plus size={12} weight="bold" />
                            إنشاء تصنيف
                          </button>
                        </span>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={onOpenCategoryManager}
                          className="inline-flex items-center gap-2 text-[11px] text-white/60 transition hover:text-white"
                        >
                          <Tag size={12} weight="bold" />
                          إدارة التصنيفات
                        </button>
                      </div>
                      {categoryDisabled ? (
                        <p className="text-[10px] text-white/60">جاري حفظ التغييرات...</p>
                      ) : null}
                    </div>
                  ) : selectedCategoryDetails.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCategoryDetails.map((category) => (
                        <span
                          key={category.id}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/80"
                        >
                          <Tag size={10} weight="bold" />
                          {category.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-white/50">لا توجد تصنيفات.</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusHistoryList
                    scopes={scopeHistory}
                    formatScopeLabel={formatScopeLabel}
                    getCategoryDetails={getCategoryDetails}
                    variant="table"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type MembersDirectoryPageProps = {
  preloadedMembers?: MemberSearchRecord[];
  hideSearch?: boolean;
  hideStatusFilter?: boolean;
  title?: string;
  subtitle?: string;
};

export default function MembersDirectoryPage({
  preloadedMembers,
  hideSearch = false,
  hideStatusFilter = false,
  title = 'قاعدة بيانات الأعضاء',
  subtitle = 'بحث عربي متقدم يعرض النتائج فور الكتابة، مع تطبيع كامل للحروف والأرقام.',
}: MembersDirectoryPageProps) {
  const [form, setForm] = useState<SearchFormState>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState<SearchFormState>(INITIAL_FORM);
  const [page, setPage] = useState(0);
  const { role, profile, user } = useAuth();

  const homeHref = isAppRole(role) ? getRoleHomePath(role) : '/dashboard';

  useEffect(() => {
    const debounce = setTimeout(() => {
      setSubmitted(form);
      setPage(0);
    }, 350);

    return () => clearTimeout(debounce);
  }, [form]);

  const { results: searchResults, loading, error } = useMemberSearch({
    status: submitted.status,
    term: submitted.search,
  });
  const [results, setResults] = useState<MemberSearchRecord[]>([]);
  
  // Use preloaded members if provided, otherwise use search results
  const effectiveResults = preloadedMembers ?? results;
  const effectiveLoading = preloadedMembers ? false : loading;
  const effectiveError = preloadedMembers ? null : error;
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});
  const [statusErrors, setStatusErrors] = useState<Record<string, string | null>>({});
  const [headNames, setHeadNames] = useState<Record<string, string>>({});
  const [leaderNames, setLeaderNames] = useState<Record<string, string>>({});
  const [categoriesById, setCategoriesById] = useState<Record<string, MemberCategory>>({});
  const [categoriesByScope, setCategoriesByScope] = useState<Record<string, string[]>>({});
  const categoryScopesLoadedRef = useRef<Set<string>>(new Set());
  const categoryScopesLoadingRef = useRef<Set<string>>(new Set());
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const applyCategoriesForScope = useCallback(
    (scopeType: MemberCategoryScopeType, scopeId: string, entries: MemberCategory[]) => {
      if (!scopeId) return;
      const normalizedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      const scopeKey = makeScopeKey(scopeType, scopeId);
      const entryIds = normalizedEntries.map((category) => category.id);

      setCategoriesById((prev) => {
        const next = { ...prev };
        Object.values(prev).forEach((category) => {
          if (category.scopeType === scopeType && category.scopeId === scopeId && !entryIds.includes(category.id)) {
            delete next[category.id];
          }
        });
        normalizedEntries.forEach((category) => {
          next[category.id] = category;
        });
        return next;
      });

      setCategoriesByScope((prev) => ({
        ...prev,
        [scopeKey]: entryIds,
      }));

      categoryScopesLoadedRef.current.add(scopeKey);
    },
    [],
  );

  const ensureScopeCategoriesLoaded = useCallback(
    async (scopeType: MemberCategoryScopeType, scopeId: string) => {
      if (!scopeId) return;
      const scopeKey = makeScopeKey(scopeType, scopeId);
      if (categoryScopesLoadedRef.current.has(scopeKey) || categoryScopesLoadingRef.current.has(scopeKey)) {
        return;
      }
      categoryScopesLoadingRef.current.add(scopeKey);
      try {
        const params = new URLSearchParams({ scopeType, scopeId });
        const data = await fetchWithAuth<{ categories?: MemberCategory[] }>(
          `/api/member-categories?${params.toString()}`,
        );
        applyCategoriesForScope(scopeType, scopeId, data.categories ?? []);
      } catch (error) {
        console.error('Failed to load categories for scope', scopeType, scopeId, error);
      } finally {
        categoryScopesLoadingRef.current.delete(scopeKey);
      }
    },
    [applyCategoriesForScope],
  );

  useEffect(() => {
    // If preloadedMembers is provided, use it directly; otherwise use searchResults
    const sourceResults = preloadedMembers ?? searchResults;
    // Create new references for statusScopes to prevent sharing between members
    const isolatedResults = sourceResults.map((member) => ({
      ...member,
      statusScopes: member.statusScopes
        ? member.statusScopes.map((scope) => ({
            ...scope,
            categories: Array.isArray(scope.categories) ? [...scope.categories] : [],
          }))
        : [],
      assignments: member.assignments ? { ...member.assignments } : null,
    }));
    setResults(isolatedResults);
  }, [preloadedMembers, searchResults]);

  useEffect(() => {
    setPage(0);
  }, [results]);

  const leaderPriorityKeys = useMemo(() => {
    const keys: string[] = [];
    if (user?.uid) {
      keys.push(user.uid);
    }
    (profile?.leaderIds ?? []).forEach((id) => {
      if (id && !keys.includes(id)) {
        keys.push(id);
      }
    });
    return keys;
  }, [profile?.leaderIds, user?.uid]);

  const primaryLeaderScopeId = useMemo(() => {
    for (const key of leaderPriorityKeys) {
      if (key) {
        return key;
      }
    }
    return user?.uid ?? null;
  }, [leaderPriorityKeys, user?.uid]);

  const manageableScope = useMemo(() => {
    if (role === 'teamHead' && profile?.headId) {
      return { scopeType: 'head' as MemberCategoryScopeType, scopeId: profile.headId };
    }
    if (role === 'teamLeader' && primaryLeaderScopeId) {
      return { scopeType: 'leader' as MemberCategoryScopeType, scopeId: primaryLeaderScopeId };
    }
    return null;
  }, [primaryLeaderScopeId, profile?.headId, role]);

  useEffect(() => {
    if (!manageableScope) {
      return;
    }
    ensureScopeCategoriesLoaded(manageableScope.scopeType, manageableScope.scopeId);
  }, [ensureScopeCategoriesLoaded, manageableScope]);

  // Removed: Leaders should NOT load head categories
  // Each leader should only see and manage their own categories
  // Head categories are loaded separately when viewing member data, but not for management

  useEffect(() => {
    const scopesToLoad = new Set<string>();
    
    // Always load categories for the manageable scope if it exists
    if (manageableScope) {
      scopesToLoad.add(makeScopeKey(manageableScope.scopeType, manageableScope.scopeId));
    }
    
    // Also load categories for all scopes found in member results that have categories assigned
    // BUT: For leaders, only load their own leader scope categories, not head categories
    results.forEach((record) => {
      (record.statusScopes ?? []).forEach((scope) => {
        if (
          (scope.scopeType === 'head' || scope.scopeType === 'leader') &&
          typeof scope.scopeId === 'string' &&
          scope.scopeId &&
          Array.isArray(scope.categories) &&
          scope.categories.length > 0
        ) {
          // For teamLeader role, only load their own leader scope categories
          // They can see head categories in member data, but shouldn't load them for management
          if (role === 'teamLeader' && scope.scopeType === 'head') {
            // Skip head categories for leaders - they should only manage their own categories
            return;
          }
          scopesToLoad.add(makeScopeKey(scope.scopeType, scope.scopeId));
        }
      });
    });

    // Load categories for all identified scopes
    scopesToLoad.forEach((key) => {
      const [scopeType, scopeId] = key.split(':') as [MemberCategoryScopeType, string];
      if (scopeId) {
        void ensureScopeCategoriesLoaded(scopeType, scopeId);
      }
    });
  }, [ensureScopeCategoriesLoaded, results, manageableScope, role]);

  const getCategoryDetails = useCallback(
    (categoryId: string) => categoriesById[categoryId] ?? null,
    [categoriesById],
  );

  const canManageStatus = (member: MemberSearchRecord): boolean => {
    if (role === 'superAdmin' || role === 'admin') {
      return true;
    }

    if (role === 'teamHead') {
      return Boolean(profile?.headId);
    }

    if (role === 'teamLeader') {
      const candidateIds = new Set<string>(leaderPriorityKeys);
      if (profile?.headId) {
        candidateIds.add(profile.headId);
      }

      const scopes = member.statusScopes ?? [];
      if (
        scopes.some(
          (scope) =>
            scope.scopeType === 'leader' && scope.scopeId !== null && candidateIds.has(scope.scopeId),
        )
      ) {
        return true;
      }

      const headId = profile?.headId ?? null;
      if (headId) {
        const hasHeadScope = scopes.some((scope) => scope.scopeType === 'head' && scope.scopeId === headId);
        if (hasHeadScope) {
          return true;
        }
        if (!member.assignments?.headId || member.assignments?.headId === headId) {
          return true;
        }
      } else if (!member.assignments?.headId) {
        return true;
      }

      return false;
    }

    return false;
  };

  const resolveEditableScope = useCallback(
    (member: MemberSearchRecord): { scopeType: MemberCategoryScopeType; scopeId: string } | null => {
      if (!manageableScope) {
        return null;
      }
      if (!canManageStatus(member)) {
        return null;
      }
      return manageableScope;
    },
    [manageableScope, role, profile?.headId, leaderPriorityKeys],
  );

  const getSelectedCategoriesForMember = useCallback(
    (member: MemberSearchRecord) => {
      const editableScope = resolveEditableScope(member);
      if (!editableScope) {
        return [];
      }
      const scopes = member.statusScopes ?? [];
      const target = scopes.find(
        (scope) =>
          scope.scopeType === editableScope.scopeType &&
          scope.scopeId === editableScope.scopeId,
      );
      return Array.isArray(target?.categories) ? target?.categories : [];
    },
    [resolveEditableScope],
  );

  const getAvailableCategories = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_member: MemberSearchRecord) => {
      if (!manageableScope) {
        return [];
      }
      const scopeKey = makeScopeKey(manageableScope.scopeType, manageableScope.scopeId);
      return categoriesByScope[scopeKey] ?? [];
    },
    [categoriesByScope, manageableScope],
  );

  const canManageMemberCategories = useCallback(
    (member: MemberSearchRecord) => Boolean(resolveEditableScope(member)),
    [resolveEditableScope],
  );

  const getStatusForUpdate = useCallback(
    (member: MemberSearchRecord): MemberStatus => {
      if (role === 'teamHead' && profile?.headId) {
        const headScope = member.statusScopes?.find(
          (scope) => scope.scopeType === 'head' && scope.scopeId === profile.headId,
        );
        if (headScope) {
          return normalizeScopeStatus(headScope.status);
        }
      }

      if (role === 'teamLeader') {
        for (const key of leaderPriorityKeys) {
          if (!key) continue;
          const leaderScope = member.statusScopes?.find(
            (scope) => scope.scopeType === 'leader' && scope.scopeId === key,
          );
          if (leaderScope) {
            return normalizeScopeStatus(leaderScope.status);
          }
        }
      }

      const globalScope = member.statusScopes?.find((scope) => scope.scopeType === 'global');
      if (globalScope) {
        return normalizeScopeStatus(globalScope.status);
      }

      return member.status;
    },
    [leaderPriorityKeys, profile?.headId, role],
  );

  const submitStatusUpdate = useCallback(
    async (
      member: MemberSearchRecord,
      statusToApply: MemberStatus,
      options?: { categories?: string[] },
    ) => {
      const memberId = member.memberId;
      if (!canManageStatus(member)) {
        setStatusErrors((prev) => ({
          ...prev,
          [memberId]: 'لا تملك صلاحية تحديث حالة هذا العضو.',
        }));
        return;
      }

      setStatusUpdating((prev) => ({ ...prev, [memberId]: true }));
      setStatusErrors((prev) => ({ ...prev, [memberId]: null }));

      try {
        const body: Record<string, unknown> = { status: statusToApply };
        if (options && Object.prototype.hasOwnProperty.call(options, 'categories')) {
          body.categories = options?.categories;
        }

        const payload = await fetchWithAuth<StatusUpdateResponse>(
          `/api/members/${memberId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          },
        );

        setResults((prev) =>
          prev.map((record) => {
            if (record.memberId !== memberId) {
              return record;
            }
            const updatedStatusScopes = payload.statusScopes
              ? payload.statusScopes.map((scope) => ({
                  ...scope,
                  categories: Array.isArray(scope.categories) ? [...scope.categories] : [],
                }))
              : record.statusScopes;
            return {
              ...record,
              status: payload.status,
              electionDayStatus: payload.electionDayStatus ?? record.electionDayStatus,
              statusScopes: updatedStatusScopes,
              assignments: payload.assignments
                ? { ...payload.assignments }
                : record.assignments,
            };
          }),
        );
      } catch (error) {
        setStatusErrors((prev) => ({
          ...prev,
          [memberId]: error instanceof Error ? error.message : 'تعذر تحديث الحالة',
        }));
      } finally {
        setStatusUpdating((prev) => ({ ...prev, [memberId]: false }));
      }
    },
    [canManageStatus],
  );

  useEffect(() => {
    async function loadScopeNames() {
      if (role === 'superAdmin' || role === 'admin') {
        try {
          const data = await fetchWithAuth<{
            headers: Array<{
              id: string;
              displayName?: string;
              leaders?: Array<{ id: string; displayName?: string }>;
            }>;
          }>('/api/admin/team/structure');

          const headerMap: Record<string, string> = {};
          const leaderMap: Record<string, string> = {};
          data.headers?.forEach((header) => {
            headerMap[header.id] = header.displayName ?? header.id;
            header.leaders?.forEach((leader) => {
              leaderMap[leader.id] = leader.displayName ?? leader.id;
            });
          });
          setHeadNames(headerMap);
          setLeaderNames(leaderMap);
        } catch (error) {
          console.error('Failed to load admin scope names', error);
        }
        return;
      }

      if (role === 'teamHead') {
        const headerMap: Record<string, string> = {};
        if (profile?.headId) {
          headerMap[profile.headId] = profile.displayName ?? 'الرئيس';
        }
        setHeadNames(headerMap);

        try {
          const data = await fetchWithAuth<{
            leaders: Array<{ id: string; displayName?: string }>;
          }>('/api/team-head/leaders');
          const leaderMap: Record<string, string> = {};
          data.leaders?.forEach((leader) => {
            leaderMap[leader.id] = leader.displayName ?? leader.id;
          });
          setLeaderNames(leaderMap);
        } catch (error) {
          console.error('Failed to load leader scope names', error);
        }
        return;
      }

      if (role === 'teamLeader') {
        const headerMap: Record<string, string> = {};
        if (profile?.headId) {
          headerMap[profile.headId] = 'الرئيس المسؤول';
        }
        setHeadNames(headerMap);

        const leaderMap: Record<string, string> = {};
        leaderPriorityKeys.forEach((id) => {
          if (!id) return;
          leaderMap[id] = id === user?.uid ? profile?.displayName ?? 'أنا' : leaderMap[id] ?? id;
        });
        setLeaderNames(leaderMap);
      }
    }

    loadScopeNames().catch((error) => {
      console.error('Failed to load scope names', error);
    });
  }, [role, profile?.headId, profile?.displayName, leaderPriorityKeys, user?.uid]);

  const getDisplayStatus = useCallback(
    (member: MemberSearchRecord): MemberStatus => {
      const scopes = member.statusScopes ?? [];
      const globalScope =
        scopes.find((scope) => scope.scopeType === 'global' && scope.scopeId === null) ?? null;

      if (role === 'superAdmin' || role === 'admin') {
        return globalScope?.status ?? member.status;
      }

      if (role === 'teamHead') {
        const headId = profile?.headId ?? null;
        if (headId) {
          const headScope = scopes.find(
            (scope) => scope.scopeType === 'head' && scope.scopeId === headId,
          );
          if (headScope) {
            return headScope.status;
          }
        }

        return globalScope?.status ?? member.status;
      }

      if (role === 'teamLeader') {
        const leaderScopes = scopes.filter((scope) => scope.scopeType === 'leader');
        for (const key of leaderPriorityKeys) {
          const matching = leaderScopes.find((scope) => scope.scopeId === key);
          if (matching) {
            return matching.status;
          }
        }

        const headId = profile?.headId ?? null;
        if (headId) {
          const headScope = scopes.find(
            (scope) => scope.scopeType === 'head' && scope.scopeId === headId,
          );
          if (headScope) {
            return headScope.status;
          }
        }

        return globalScope?.status ?? member.status;
      }

      return globalScope?.status ?? member.status;
    },
    [leaderPriorityKeys, profile?.headId, role],
  );

  const resolveVisibleScopes = useCallback(
    (member: MemberSearchRecord): MemberStatusScope[] => {
      const scopes = member.statusScopes ?? [];

      if (role === 'superAdmin' || role === 'admin') {
        return scopes;
      }

      if (role === 'teamHead') {
        if (!profile?.headId) {
          return scopes;
        }
        const headId = profile.headId;
        return scopes.filter((scope) => {
          if (scope.scopeType === 'global') return true;
          if (scope.scopeType === 'head' && scope.scopeId === headId) return true;
          if (scope.scopeType === 'leader') {
            return !member.assignments?.headId || member.assignments?.headId === headId;
          }
          return false;
        });
      }

      if (role === 'teamLeader') {
        const allowed = new Set<string>(
          leaderPriorityKeys.filter((value): value is string => Boolean(value)),
        );
        if (profile?.headId) {
          allowed.add(profile.headId);
        }
        return scopes.filter((scope) => {
          if (scope.scopeType === 'global') return true;
          if (scope.scopeType === 'head' && scope.scopeId === profile?.headId) return true;
          if (scope.scopeType === 'leader' && scope.scopeId && allowed.has(scope.scopeId)) {
            return true;
          }
          return false;
        });
      }

      return scopes.filter((scope) => scope.scopeType === 'global');
    },
    [leaderPriorityKeys, profile?.headId, role],
  );

  const formatScopeLabel = useCallback(
    (scope: MemberStatusScope) => {
      if (scope.scopeType === 'global') {
        const name = scope.displayName ?? 'عام';
        return `الحالة العامة (${name})`;
      }

      if (scope.scopeType === 'head') {
        const isSelf = profile?.headId && scope.scopeId === profile.headId;
        const name =
          scope.displayName ??
          (scope.scopeId ? headNames[scope.scopeId] ?? scope.scopeId : 'غير معروف');
        return `حالة الرئيس (${name}${isSelf ? ' - أنت' : ''})`;
      }

      if (scope.scopeType === 'leader') {
        const isSelf =
          scope.scopeId !== null &&
          leaderPriorityKeys.some((id) => Boolean(id) && scope.scopeId === id);
        const name =
          scope.displayName ??
          (scope.scopeId ? leaderNames[scope.scopeId] ?? scope.scopeId : 'غير معروف');
        return `حالة القائد (${name}${isSelf ? ' - أنت' : ''})`;
      }

      return scope.displayName ?? scope.scopeId ?? 'غير معروف';
    },
    [headNames, leaderNames, leaderPriorityKeys, profile?.headId],
  );

  const handleMobileUpdate = (memberId: string, mobiles: string[]) => {
    setResults((prev) =>
      prev.map((record) =>
        record.memberId === memberId
          ? {
              ...record,
              mobiles: Array.from(new Set(mobiles)),
              tokens: buildSearchTokens([
                record.fullName,
                record.membershipId ?? undefined,
                record.address ?? undefined,
                ...mobiles,
              ]),
            }
          : record,
      ),
    );
  };

  const handleStatusChange = async (memberId: string, nextStatus: MemberStatus) => {
    const targetMember = results.find((record) => record.memberId === memberId);
    if (!targetMember) {
      return;
    }
    await submitStatusUpdate(targetMember, nextStatus);
  };

  const handleCategoryToggle = useCallback(
    async (memberId: string, categoryId: string) => {
      const targetMember = results.find((record) => record.memberId === memberId);
      if (!targetMember) {
        return;
      }

      const editableScope = resolveEditableScope(targetMember);
      if (!editableScope) {
        setStatusErrors((prev) => ({
          ...prev,
          [memberId]: 'لا تملك صلاحية تعديل تصنيفات هذا العضو.',
        }));
        return;
      }

      const currentCategories = getSelectedCategoriesForMember(targetMember);
      // Only allow one category per member per scope
      // If clicking the same category, deselect it; otherwise, replace with the new one
      const nextCategories = currentCategories.includes(categoryId)
        ? [] // Deselect if already selected
        : [categoryId]; // Replace with the new category (only one allowed)
      const statusForUpdate = getStatusForUpdate(targetMember);

      await submitStatusUpdate(targetMember, statusForUpdate, { categories: nextCategories });
    },
    [
      getSelectedCategoriesForMember,
      getStatusForUpdate,
      resolveEditableScope,
      results,
      submitStatusUpdate,
    ],
  );

  const handleCreateCategory = useCallback(
    async (name: string) => {
      if (!manageableScope) {
        setCategoryError('هذا الدور لا يمكنه إنشاء تصنيفات.');
        return;
      }

      setCategoryError(null);
      setCreatingCategory(true);

      try {
        const response = await fetchWithAuth<{ category: MemberCategory }>('/api/member-categories', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });

        const category = response.category;
        if (category) {
          const scopeKey = makeScopeKey(category.scopeType, category.scopeId);
          const existingIds = categoriesByScope[scopeKey] ?? [];
          const existingCategories = existingIds
            .map((id) => categoriesById[id])
            .filter((entry): entry is MemberCategory => Boolean(entry));
          applyCategoriesForScope(category.scopeType, category.scopeId, [...existingCategories, category]);
        }
      } catch (error) {
        console.error('Failed to create category', error);
        setCategoryError(error instanceof Error ? error.message : 'تعذر إنشاء التصنيف');
      } finally {
        setCreatingCategory(false);
      }
    },
    [applyCategoriesForScope, categoriesById, categoriesByScope, manageableScope],
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      const category = categoriesById[categoryId];
      if (!category) {
        setCategoryError('التصنيف غير موجود');
        return;
      }

      setCategoryError(null);
      setDeletingCategoryId(categoryId);

      try {
        const response = await fetchWithAuth(`/api/member-categories/${categoryId}`, {
          method: 'DELETE',
        });

        // Check if response indicates success
        if (!response || (typeof response === 'object' && 'error' in response)) {
          const errorMessage = typeof response === 'object' && response !== null && 'error' in response
            ? String(response.error)
            : 'تعذر حذف التصنيف';
          throw new Error(errorMessage);
        }

        const scopeKey = makeScopeKey(category.scopeType, category.scopeId);
        setCategoriesById((prev) => {
          const next = { ...prev };
          delete next[categoryId];
          return next;
        });
        setCategoriesByScope((prev) => ({
          ...prev,
          [scopeKey]: (prev[scopeKey] ?? []).filter((id) => id !== categoryId),
        }));
        setResults((prev) =>
          prev.map((record) => ({
            ...record,
            statusScopes: (record.statusScopes ?? []).map((scope) => {
              if (scope.scopeType === category.scopeType && scope.scopeId === category.scopeId) {
                const nextScopeCategories = Array.isArray(scope.categories)
                  ? scope.categories.filter((id) => id !== categoryId)
                  : [];
                return { ...scope, categories: nextScopeCategories };
              }
              return scope;
            }),
          })),
        );
      } catch (error) {
        console.error('Failed to delete category', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'error' in error
          ? String(error.error)
          : 'تعذر حذف التصنيف';
        setCategoryError(errorMessage);
      } finally {
        setDeletingCategoryId(null);
      }
    },
    [categoriesById, setResults],
  );

  const manageableCategories = useMemo(() => {
    if (!manageableScope) {
      return [];
    }
    const scopeKey = makeScopeKey(manageableScope.scopeType, manageableScope.scopeId);
    const ids = categoriesByScope[scopeKey] ?? [];
    return ids
      .map((id) => categoriesById[id])
      .filter((value): value is MemberCategory => Boolean(value))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [categoriesById, categoriesByScope, manageableScope]);

  const categoryScopeLabel = useMemo(() => {
    if (!manageableScope) {
      return 'غير متاح';
    }
    if (manageableScope.scopeType === 'head') {
      return profile?.displayName ?? 'رئيس الفريق';
    }
    if (manageableScope.scopeType === 'leader') {
      return profile?.displayName ?? 'القائد';
    }
    return 'غير متاح';
  }, [manageableScope, profile?.displayName]);

  const openCategoryManager = useCallback(() => {
    if (!manageableScope) {
      return;
    }
    setCategoryError(null);
    void ensureScopeCategoriesLoaded(manageableScope.scopeType, manageableScope.scopeId);
    setCategoryModalOpen(true);
  }, [ensureScopeCategoriesLoaded, manageableScope]);

  const closeCategoryManager = useCallback(() => {
    setCategoryModalOpen(false);
  }, []);

  const pageCount = Math.max(1, Math.ceil(effectiveResults.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paginated = effectiveResults.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div className="px-6 py-10">
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-heading text-[var(--color-brand-gold)]">{title}</h1>
          <p className="mt-2 text-sm text-white/70">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          {manageableScope ? (
            <button
              type="button"
              onClick={openCategoryManager}
              className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40"
            >
              <Tag size={18} weight="bold" />
              إدارة التصنيفات
            </button>
          ) : null}
          {!preloadedMembers && effectiveResults.length > 0 ? (
            <button
              type="button"
              onClick={() => setSubmitted(form)}
              className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm text-white transition hover:border-white/40"
            >
              <ArrowClockwise size={18} weight="bold" />
              تحديث النتائج
            </button>
          ) : null}
        </div>
      </header>

      {!hideSearch && (
      <section className="glass-panel mb-8 rounded-3xl p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
            <span>بحث</span>
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
              <MagnifyingGlass size={18} weight="bold" className="text-white/60" />
              <input
                type="search"
                value={form.search}
                onChange={(event) => setForm((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="اسم العضو، رقم العضوية، رقم الهاتف..."
                className="w-full bg-transparent text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!CONTACT_PICKER_AVAILABLE) return;
                  try {
                    const nav = navigator as NavigatorWithContacts;
                    const contacts = (await nav.contacts?.select?.(['tel', 'name'], { multiple: false })) ?? [];
                    if (!contacts || contacts.length === 0) return;
                    const numbers = (contacts[0].tel ?? [])
                      .map((value) => formatPhoneNumber(value).display)
                      .filter((v) => v && v !== 'غير متوفر');
                    if (numbers.length > 0) {
                      setForm((prev) => ({ ...prev, search: numbers[0], status: 'all' }));
                    }
                  } catch (pickError) {
                    console.error('Failed to pick contact:', pickError);
                  }
                }}
                disabled={!CONTACT_PICKER_AVAILABLE}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                  CONTACT_PICKER_AVAILABLE
                    ? 'border-white/20 text-white hover:border-white/40'
                    : 'border-white/10 text-white/40'
                }`}
                title={
                  CONTACT_PICKER_AVAILABLE
                    ? 'اختيار رقم من جهات الاتصال'
                    : 'المتصفح الحالي لا يدعم اختيار جهات الاتصال'
                }
              >
                <AddressBook size={16} />
                جهات الاتصال
              </button>
            </div>
          </label>
          {!hideStatusFilter && (
          <label className="flex flex-col gap-2 text-sm text-white/80">
            <span>حالة الاتصال</span>
            <div className="relative">
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as StatusFilter }))}
                className="app-select w-full"
              >
                {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <CaretDown
                size={16}
                weight="bold"
                className="pointer-events-none absolute inset-y-0 left-4 my-auto text-white/60"
              />
            </div>
          </label>
          )}
        </div>
        {effectiveError ? (
          <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {effectiveError}
          </div>
        ) : null}
      </section>
      )}

      {effectiveResults.length === 0 && !effectiveLoading ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <div className="space-y-4 md:hidden">
            {paginated.map((member) => (
              <MemberCard
                key={member.memberId}
                member={member}
                onMobileAdded={(mobiles) => handleMobileUpdate(member.memberId, mobiles)}
                onStatusChange={handleStatusChange}
                statusUpdating={statusUpdating[member.memberId] ?? false}
                statusError={statusErrors[member.memberId] ?? null}
                canEdit={canManageStatus(member)}
                displayStatus={getDisplayStatus(member)}
                resolveVisibleScopes={resolveVisibleScopes}
                formatScopeLabel={formatScopeLabel}
                getCategoryDetails={getCategoryDetails}
                availableCategoryIds={getAvailableCategories(member)}
                selectedCategoryIds={getSelectedCategoriesForMember(member)}
                onCategoryToggle={handleCategoryToggle}
                canManageCategories={canManageMemberCategories(member)}
                categoryUpdating={statusUpdating[member.memberId] ?? false}
                onOpenCategoryManager={openCategoryManager}
              />
            ))}
          </div>
          <MembersTable
            rows={paginated}
            onStatusChange={handleStatusChange}
            statusUpdating={statusUpdating}
            statusErrors={statusErrors}
            canEditStatus={canManageStatus}
            getDisplayStatus={getDisplayStatus}
            resolveVisibleScopes={resolveVisibleScopes}
            formatScopeLabel={formatScopeLabel}
            getCategoryDetails={getCategoryDetails}
            getAvailableCategories={getAvailableCategories}
            getSelectedCategories={getSelectedCategoriesForMember}
            onCategoryToggle={handleCategoryToggle}
            canManageCategories={canManageMemberCategories}
            categoryUpdating={statusUpdating}
            onOpenCategoryManager={openCategoryManager}
          />
          <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 sm:flex-row">
            <span>
              الصفحة {currentPage + 1} من {pageCount} — السجلات المعروضة: {paginated.length}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40 disabled:opacity-50"
                disabled={currentPage === 0}
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pageCount - 1, prev + 1))}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40 disabled:opacity-50"
                disabled={currentPage >= pageCount - 1}
              >
                التالي
              </button>
            </div>
          </div>
          {effectiveLoading ? (
            <div className="rounded-3xl border border-white/10 px-6 py-8 text-center text-white/70">
              جاري تحميل البيانات...
            </div>
          ) : null}
        </div>
      )}

      <CategoryManagerModal
        isOpen={categoryModalOpen && Boolean(manageableScope)}
        scopeLabel={categoryScopeLabel}
        categories={manageableCategories}
        onClose={closeCategoryManager}
        onCreate={handleCreateCategory}
        onDelete={handleDeleteCategory}
        creating={creatingCategory}
        deletingId={deletingCategoryId}
        error={categoryError}
      />

      <footer className="mt-10 flex flex-col gap-2 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
        <p>يمكنك البحث بالأسماء العربية أو الأرقام بسهولة، مع عرض النتائج على صفحات.</p>
        <Link href={homeHref} className="text-[var(--color-brand-gold)] underline">
          العودة إلى اللوحة الرئيسية
        </Link>
      </footer>
    </div>
  );
}


