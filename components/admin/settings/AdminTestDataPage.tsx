import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { Role } from '../../../types';
import {
    PURGE_CONFIRMATION_TEXT,
    getTestDataAccounts,
    getTestDataSummary,
    getTestMode,
    purgeTestData,
    setTestMode,
    unmarkTestData,
    type TestDataGroup,
} from '../../../services/testData';

const GROUPS: { id: TestDataGroup; title: string; hint: string }[] = [
    { id: 'test_accounts', title: 'حسابات تجريبية', hint: 'حذفها يحذف معها كل ما يملكه الحساب من عقارات ومشاريع وخدمات.' },
    { id: 'demo_staff_accounts', title: 'حسابات فريق تجريبية', hint: 'حسابات أدوار المنصة (مدير التشطيبات، علاقات العملاء…). احذف علامة أي حساب تريد الإبقاء عليه.' },
    { id: 'content', title: 'محتوى تجريبي', hint: 'عقارات ومشاريع وأعمال ديكور وخدمات تشطيب.' },
    { id: 'operations', title: 'عمليات تجريبية', hint: 'طلبات ورسائل ومعاملات وإشعارات وأحداث تحليلات.' },
];

const TABLE_LABELS: Record<string, string> = {
    'auth.users': 'حسابات',
    properties: 'عقارات',
    projects: 'مشاريع',
    portfolio_items: 'أعمال الديكور',
    partner_finishing_services: 'خدمات التشطيب',
    partner_capabilities: 'قدرات الشركاء',
    requests: 'طلبات',
    request_messages: 'رسائل الطلبات',
    request_history: 'سجل الطلبات',
    finishing_request_history: 'سجل طلبات التشطيب',
    finishing_request_invitations: 'دعوات المناقصات',
    finishing_quotes: 'عروض الأسعار',
    finishing_milestones: 'مراحل التنفيذ',
    execution_attachments: 'مرفقات التنفيذ',
    notifications: 'إشعارات',
    customer_favorites: 'مفضلات',
    analytics_events: 'أحداث تحليلات',
    transactions: 'معاملات مالية',
    property_history: 'سجل العقارات',
};

const AdminTestDataPage: React.FC = () => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const isSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;

    const [selectedGroups, setSelectedGroups] = useState<TestDataGroup[]>(GROUPS.map((g) => g.id));
    const [confirmText, setConfirmText] = useState('');
    const [lastResult, setLastResult] = useState<Record<string, number> | null>(null);

    const testModeQuery = useQuery({ queryKey: ['test-data', 'mode'], queryFn: getTestMode, enabled: isSuperAdmin });
    const summaryQuery = useQuery({ queryKey: ['test-data', 'summary'], queryFn: getTestDataSummary, enabled: isSuperAdmin });
    const accountsQuery = useQuery({ queryKey: ['test-data', 'accounts'], queryFn: getTestDataAccounts, enabled: isSuperAdmin });

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['test-data'] });

    const modeMutation = useMutation({ mutationFn: setTestMode, onSuccess: refresh });
    const unmarkMutation = useMutation({
        mutationFn: (userId: string) => unmarkTestData('auth.users', [userId]),
        onSuccess: refresh,
    });
    const purgeMutation = useMutation({
        mutationFn: () => purgeTestData(confirmText.trim(), selectedGroups),
        onSuccess: (result) => {
            setLastResult(result);
            setConfirmText('');
            queryClient.invalidateQueries();
        },
    });

    const byGroup = useMemo(() => {
        const map = new Map<TestDataGroup, { tableName: string; existing: number }[]>();
        (summaryQuery.data || []).forEach((row) => {
            const list = map.get(row.groupName) || [];
            list.push({ tableName: row.tableName, existing: row.existing });
            map.set(row.groupName, list);
        });
        return map;
    }, [summaryQuery.data]);

    const selectedTotal = (summaryQuery.data || [])
        .filter((r) => selectedGroups.includes(r.groupName))
        .reduce((sum, r) => sum + r.existing, 0);

    if (!isSuperAdmin) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center text-gray-600">
                هذه الصفحة متاحة للمدير العام فقط.
            </div>
        );
    }

    const testMode = testModeQuery.data === true;
    const canPurge = confirmText.trim() === PURGE_CONFIRMATION_TEXT && selectedGroups.length > 0 && selectedTotal > 0;

    return (
        <div className="max-w-5xl mx-auto space-y-8" dir="rtl">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">بيانات الاختبار</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    كل بيانات التجربة على الموقع مسجّلة هنا، ويمكن حذفها كلها بخطوة واحدة عند الانتقال للتشغيل الفعلي.
                </p>
            </header>

            <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">وضع التجربة</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
                            {testMode
                                ? 'مُفعّل: أي حساب جديد وأي طلب أو محتوى يُضاف الآن يُسجَّل تلقائيًا كبيانات اختبار.'
                                : 'متوقف: البيانات الجديدة تُعتبر حقيقية، إلا ما يُنشئه حساب تجريبي مسجّل فيُسجَّل تلقائيًا.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={modeMutation.isPending || testModeQuery.isLoading}
                        onClick={() => modeMutation.mutate(!testMode)}
                        className={`px-5 py-2.5 rounded-lg font-semibold ${testMode ? 'bg-gray-900 text-white hover:bg-gray-700' : 'bg-amber-500 text-gray-900 hover:bg-amber-600'}`}
                    >
                        {testMode ? 'إيقاف وضع التجربة' : 'تفعيل وضع التجربة'}
                    </button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                {GROUPS.map((group) => {
                    const rows = byGroup.get(group.id) || [];
                    const total = rows.reduce((s, r) => s + r.existing, 0);
                    const checked = selectedGroups.includes(group.id);
                    return (
                        <label
                            key={group.id}
                            className={`block rounded-xl border p-5 cursor-pointer transition-colors ${checked ? 'border-red-300 bg-red-50/60 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4"
                                    checked={checked}
                                    onChange={(e) =>
                                        setSelectedGroups((prev) =>
                                            e.target.checked ? [...prev, group.id] : prev.filter((g) => g !== group.id)
                                        )
                                    }
                                />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{group.title}</h3>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{group.hint}</p>
                                    {rows.length > 0 && (
                                        <ul className="mt-3 flex flex-wrap gap-2">
                                            {rows.map((r) => (
                                                <li key={r.tableName} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2.5 py-1">
                                                    {TABLE_LABELS[r.tableName] || r.tableName}: {r.existing}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </label>
                    );
                })}
            </section>

            <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">الحسابات المسجّلة كتجريبية</h2>
                {accountsQuery.isLoading ? (
                    <p className="text-gray-500">جارٍ التحميل…</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-right py-2">البريد</th>
                                    <th className="text-right py-2">الاسم</th>
                                    <th className="text-right py-2">الدور</th>
                                    <th className="text-right py-2">المجموعة</th>
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(accountsQuery.data || []).map((a) => (
                                    <tr key={a.userId} className="border-b border-gray-100 dark:border-gray-700/60">
                                        <td className="py-2 font-mono text-xs" dir="ltr">{a.email}</td>
                                        <td className="py-2">{a.name || '—'}</td>
                                        <td className="py-2 text-xs">{a.role || '—'}</td>
                                        <td className="py-2 text-xs">{GROUPS.find((g) => g.id === a.groupName)?.title}</td>
                                        <td className="py-2 text-left">
                                            <button
                                                type="button"
                                                disabled={unmarkMutation.isPending}
                                                onClick={() => {
                                                    if (window.confirm(`إبقاء الحساب ${a.email} كحساب حقيقي؟ لن يُحذف مع بيانات الاختبار.`)) {
                                                        unmarkMutation.mutate(a.userId);
                                                    }
                                                }}
                                                className="text-xs text-amber-700 hover:underline"
                                            >
                                                إبقاء كحساب حقيقي
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/10 p-6 space-y-4">
                <h2 className="text-lg font-bold text-red-800 dark:text-red-300">حذف بيانات الاختبار نهائيًا</h2>
                <p className="text-sm text-red-900/80 dark:text-red-200">
                    سيُحذف {selectedTotal} عنصرًا من المجموعات المحددة بشكل نهائي، ولا يمكن التراجع. حسابك الحالي والمدن وإعدادات المحتوى لا تتأثر.
                    للتأكيد اكتب <span className="font-mono font-bold" dir="ltr">{PURGE_CONFIRMATION_TEXT}</span>
                </p>
                <input
                    type="text"
                    dir="ltr"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={PURGE_CONFIRMATION_TEXT}
                    className="w-full md:w-96 rounded-lg border border-red-300 px-3 py-2 font-mono text-sm"
                />
                <div>
                    <button
                        type="button"
                        disabled={!canPurge || purgeMutation.isPending}
                        onClick={() => purgeMutation.mutate()}
                        className="px-5 py-2.5 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {purgeMutation.isPending ? 'جارٍ الحذف…' : 'احذف بيانات الاختبار'}
                    </button>
                </div>
                {purgeMutation.isError && (
                    <p className="text-sm text-red-700">تعذر الحذف: {(purgeMutation.error as Error)?.message}</p>
                )}
                {lastResult && (
                    <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">
                        تم الحذف:{' '}
                        {Object.entries(lastResult).length === 0
                            ? 'لا شيء'
                            : Object.entries(lastResult)
                                  .map(([k, v]) => `${k === 'accounts' ? 'حسابات' : TABLE_LABELS[k] || k} ${v}`)
                                  .join('، ')}
                    </div>
                )}
            </section>
        </div>
    );
};

export default AdminTestDataPage;
