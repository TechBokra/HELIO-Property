import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Button } from '../../ui/Button';
import {
    getAllPartnerFinishingServices,
    getFinishingMarketCategories,
    reviewPartnerFinishingService,
    saveFinishingMarketCategory,
    updatePartnerProfileKind,
    type AdminFinishingServiceRow,
} from '../../../services/finishingMarketplace';
import type { FinishingMarketCategory, FinishingProviderKind, FinishingServiceApprovalStatus } from '../../../types';
import { formatPartnerPrice, localized } from '../../finishing/marketplaceShared';

const STATUS_LABELS: Record<FinishingServiceApprovalStatus, { ar: string; en: string; cls: string }> = {
    pending: { ar: 'بانتظار المراجعة', en: 'Pending review', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    approved: { ar: 'معتمدة', en: 'Approved', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
    rejected: { ar: 'مرفوضة', en: 'Rejected', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    disabled: { ar: 'معطّلة', en: 'Disabled', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
};

const ServiceReviewRow: React.FC<{
    row: AdminFinishingServiceRow;
    categoryName: string;
    onReview: (status: FinishingServiceApprovalStatus, note: string) => void;
    onKindChange: (kind: FinishingProviderKind) => void;
    busy: boolean;
}> = ({ row, categoryName, onReview, onKindChange, busy }) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { service, provider } = row;
    const [note, setNote] = useState(service.adminNote || '');
    const status = STATUS_LABELS[service.approvalStatus];

    return (
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/partners/${provider.id}`} target="_blank" className="font-bold text-gray-900 dark:text-white hover:text-amber-600">
                            {localized(provider.name, language)}
                        </Link>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.cls}`}>{isAr ? status.ar : status.en}</span>
                        {provider.status && provider.status !== 'active' && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700">
                                {isAr ? `حساب الشريك: ${provider.status}` : `Partner account: ${provider.status}`}
                            </span>
                        )}
                        {!service.isListed && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                {isAr ? 'مخفية من الشريك' : 'Hidden by partner'}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {categoryName} · {localized(service.title, language) || '—'} · {formatPartnerPrice(service, language)}
                    </p>
                </div>
                <label className="text-sm flex items-center gap-2">
                    <span className="text-gray-500">{isAr ? 'نوع البروفايل' : 'Profile type'}</span>
                    <select
                        value={provider.profileKind}
                        disabled={busy}
                        onChange={(e) => onKindChange(e.target.value as FinishingProviderKind)}
                        className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                    >
                        <option value="company">{isAr ? 'شركة' : 'Company'}</option>
                        <option value="engineer">{isAr ? 'مهندس مستقل' : 'Independent engineer'}</option>
                    </select>
                </label>
            </div>

            {(localized(service.description, language) || localized(service.scope, language)) && (
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {localized(service.description, language) && <p className="whitespace-pre-line">{localized(service.description, language)}</p>}
                    {localized(service.scope, language) && (
                        <p className="whitespace-pre-line">
                            <span className="font-semibold">{isAr ? 'النطاق: ' : 'Scope: '}</span>
                            {localized(service.scope, language)}
                        </p>
                    )}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={isAr ? 'ملاحظة للشريك (اختياري)' : 'Note to partner (optional)'}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                    {service.approvalStatus !== 'approved' && (
                        <Button size="sm" variant="success" disabled={busy} onClick={() => onReview('approved', note)}>
                            {service.approvalStatus === 'disabled' ? (isAr ? 'إعادة التفعيل' : 'Re-enable') : (isAr ? 'اعتماد' : 'Approve')}
                        </Button>
                    )}
                    {service.approvalStatus === 'pending' && (
                        <Button size="sm" variant="danger" disabled={busy} onClick={() => onReview('rejected', note)}>
                            {isAr ? 'رفض' : 'Reject'}
                        </Button>
                    )}
                    {service.approvalStatus === 'approved' && (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onReview('disabled', note)}>
                            {isAr ? 'تعطيل الخدمة' : 'Disable service'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const CategoryEditor: React.FC<{ category: FinishingMarketCategory; onSave: (c: FinishingMarketCategory) => void; busy: boolean }> = ({
    category,
    onSave,
    busy,
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [draft, setDraft] = useState(category);
    useEffect(() => setDraft(category), [category]);
    const input = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm';

    return (
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <code className="text-xs text-gray-500">{category.id}</code>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={draft.isVisible}
                        onChange={(e) => setDraft({ ...draft, isVisible: e.target.checked })}
                    />
                    {isAr ? 'ظاهرة للعملاء' : 'Visible to customers'}
                </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className={input} dir="rtl" value={draft.name.ar} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, ar: e.target.value } })} placeholder="الاسم بالعربي" />
                <input className={input} dir="ltr" value={draft.name.en} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, en: e.target.value } })} placeholder="Name (English)" />
                <textarea className={input} dir="rtl" rows={2} value={draft.description.ar} onChange={(e) => setDraft({ ...draft, description: { ...draft.description, ar: e.target.value } })} placeholder="الوصف بالعربي" />
                <textarea className={input} dir="ltr" rows={2} value={draft.description.en} onChange={(e) => setDraft({ ...draft, description: { ...draft.description, en: e.target.value } })} placeholder="Description (English)" />
            </div>
            <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                    {isAr ? 'ترتيب العرض' : 'Display order'}
                    <input
                        type="number"
                        className="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                        value={draft.displayOrder}
                        onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) || 0 })}
                    />
                </label>
                <Button size="sm" disabled={busy || !draft.name.ar.trim() || !draft.name.en.trim()} onClick={() => onSave(draft)}>
                    {isAr ? 'حفظ' : 'Save'}
                </Button>
            </div>
        </div>
    );
};

const AdminFinishingProvidersPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'services' | 'categories'>('services');
    const [statusFilter, setStatusFilter] = useState<FinishingServiceApprovalStatus | 'all'>('pending');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const categoriesQuery = useQuery({
        queryKey: ['finishingMarketCategories', 'admin'],
        queryFn: () => getFinishingMarketCategories({ includeHidden: true }),
    });
    const servicesQuery = useQuery({ queryKey: ['adminPartnerFinishingServices'], queryFn: getAllPartnerFinishingServices });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['adminPartnerFinishingServices'] });
        queryClient.invalidateQueries({ queryKey: ['finishingMarketCategories'] });
        queryClient.invalidateQueries({ queryKey: ['finishingDirectory'] });
        queryClient.invalidateQueries({ queryKey: ['publicPartnerFinishingServices'] });
    };
    const onError = (err: Error) => showToast(err.message || (isAr ? 'تعذر الحفظ' : 'Save failed'), 'error');

    const reviewMutation = useMutation({
        mutationFn: (v: { id: string; status: FinishingServiceApprovalStatus; note: string }) => reviewPartnerFinishingService(v.id, v.status, v.note),
        onSuccess: () => {
            invalidate();
            showToast(isAr ? 'تم تحديث حالة الخدمة' : 'Service status updated', 'success');
        },
        onError,
    });
    const kindMutation = useMutation({
        mutationFn: (v: { partnerId: string; kind: FinishingProviderKind }) => updatePartnerProfileKind(v.partnerId, v.kind),
        onSuccess: () => {
            invalidate();
            queryClient.invalidateQueries({ queryKey: ['publicPartner'] });
            showToast(isAr ? 'تم تحديث نوع البروفايل' : 'Profile type updated', 'success');
        },
        onError,
    });
    const categoryMutation = useMutation({
        mutationFn: saveFinishingMarketCategory,
        onSuccess: () => {
            invalidate();
            showToast(isAr ? 'تم حفظ الفئة' : 'Category saved', 'success');
        },
        onError,
    });

    const categories = categoriesQuery.data || [];
    const rows = servicesQuery.data || [];
    const counts = useMemo(() => {
        const c: Record<string, number> = { all: rows.length };
        rows.forEach((r) => (c[r.service.approvalStatus] = (c[r.service.approvalStatus] || 0) + 1));
        return c;
    }, [rows]);
    const filtered = rows.filter(
        (r) => (statusFilter === 'all' || r.service.approvalStatus === statusFilter) && (categoryFilter === 'all' || r.service.categoryId === categoryFilter)
    );
    const categoryName = (id: string) => {
        const c = categories.find((x) => x.id === id);
        return c ? localized(c.name, language) : id;
    };
    const busy = reviewMutation.isPending || kindMutation.isPending || categoryMutation.isPending;

    const pill = (active: boolean) =>
        `px-3 py-1.5 rounded-full text-sm font-semibold border ${active ? 'bg-amber-500 text-gray-900 border-amber-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`;

    return (
        <div className="space-y-6">
            <div className="flex gap-2">
                <button className={pill(view === 'services')} onClick={() => setView('services')}>
                    {isAr ? 'اعتماد خدمات الشركاء' : 'Partner service approvals'}
                    {counts.pending ? <span className="ms-2 text-xs">({counts.pending})</span> : null}
                </button>
                <button className={pill(view === 'categories')} onClick={() => setView('categories')}>
                    {isAr ? 'فئات التشطيبات' : 'Finishing categories'}
                </button>
            </div>

            {view === 'services' ? (
                <>
                    <div className="flex flex-wrap gap-2 items-center">
                        {(['pending', 'approved', 'disabled', 'rejected', 'all'] as const).map((s) => (
                            <button key={s} className={pill(statusFilter === s)} onClick={() => setStatusFilter(s)}>
                                {s === 'all' ? (isAr ? 'الكل' : 'All') : isAr ? STATUS_LABELS[s].ar : STATUS_LABELS[s].en}
                                <span className="ms-1 text-xs opacity-70">({counts[s] || 0})</span>
                            </button>
                        ))}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="ms-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
                        >
                            <option value="all">{isAr ? 'كل الفئات' : 'All categories'}</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{localized(c.name, language)}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isAr
                            ? 'الخدمة تظهر للعملاء تحت فئتها فقط بعد اعتمادها. تعطيل خدمة يخفي مقدمها من هذه الفئة فقط. المدن المخدومة تُدار من صلاحيات المدن في بيانات الشريك.'
                            : 'A service appears to customers under its category only after approval. Disabling a service hides the provider from that category only. Served cities come from the partner’s city permissions.'}
                    </p>
                    {servicesQuery.isLoading ? (
                        <p className="text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
                    ) : servicesQuery.isError ? (
                        <p className="text-red-600">{(servicesQuery.error as Error)?.message}</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-gray-500 py-10 text-center">{isAr ? 'لا توجد خدمات في هذا التصنيف.' : 'No services match this filter.'}</p>
                    ) : (
                        <div className="space-y-4">
                            {filtered.map((row) => (
                                <ServiceReviewRow
                                    key={row.service.id}
                                    row={row}
                                    categoryName={categoryName(row.service.categoryId)}
                                    busy={busy}
                                    onReview={(status, note) => reviewMutation.mutate({ id: row.service.id, status, note })}
                                    onKindChange={(kind) => kindMutation.mutate({ partnerId: row.provider.id, kind })}
                                />
                            ))}
                        </div>
                    )}
                </>
            ) : categoriesQuery.isLoading ? (
                <p className="text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
            ) : (
                <div className="space-y-4">
                    {categories.map((c) => (
                        <CategoryEditor key={c.id} category={c} busy={busy} onSave={(next) => categoryMutation.mutate(next)} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminFinishingProvidersPage;
