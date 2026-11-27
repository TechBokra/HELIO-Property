import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Button } from '../ui/Button';
import {
    deleteMyFinishingService,
    getFinishingMarketCategories,
    getMyFinishingServices,
    saveMyFinishingService,
} from '../../services/finishingMarketplace';
import type { FinishingMarketCategory, FinishingPricingDisplay, PartnerFinishingService } from '../../types';
import { localized } from '../finishing/marketplaceShared';

type Draft = Omit<PartnerFinishingService, 'id' | 'approvalStatus' | 'displayOrder' | 'adminNote' | 'reviewedAt'> & { id?: string };

const emptyDraft = (partnerId: string, categoryId: string): Draft => ({
    partnerId,
    categoryId,
    title: { ar: '', en: '' },
    description: { ar: '', en: '' },
    scope: { ar: '', en: '' },
    pricingDisplay: 'on_request',
    priceFrom: null,
    currency: 'EGP',
    isListed: true,
});

const STATUS_TEXT = {
    pending: { ar: 'بانتظار اعتماد الإدارة', en: 'Waiting for admin approval', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    approved: { ar: 'معتمدة وظاهرة للعملاء', en: 'Approved and visible to customers', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
    rejected: { ar: 'مرفوضة', en: 'Rejected', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    disabled: { ar: 'معطّلة من الإدارة', en: 'Disabled by admin', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
} as const;

const ServiceEditor: React.FC<{
    category: FinishingMarketCategory;
    partnerId: string;
    existing?: PartnerFinishingService;
}> = ({ category, partnerId, existing }) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Draft>(existing || emptyDraft(partnerId, category.id));
    useEffect(() => setDraft(existing || emptyDraft(partnerId, category.id)), [existing, partnerId, category.id]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['myFinishingServices', partnerId] });
        queryClient.invalidateQueries({ queryKey: ['finishingDirectory'] });
        queryClient.invalidateQueries({ queryKey: ['publicPartnerFinishingServices', partnerId] });
    };

    const saveMutation = useMutation({
        mutationFn: () => saveMyFinishingService({ ...draft, partnerId, categoryId: category.id }),
        onSuccess: () => {
            invalidate();
            setOpen(false);
            showToast(
                existing
                    ? (isAr ? 'تم حفظ التعديلات' : 'Changes saved')
                    : (isAr ? 'تم إرسال الخدمة للاعتماد' : 'Service submitted for approval'),
                'success'
            );
        },
        onError: (err: Error) => showToast(err.message, 'error'),
    });
    const deleteMutation = useMutation({
        mutationFn: () => deleteMyFinishingService(existing!.id),
        onSuccess: () => {
            invalidate();
            showToast(isAr ? 'تم حذف الطلب' : 'Request removed', 'success');
        },
        onError: (err: Error) => showToast(err.message, 'error'),
    });

    const input = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm';
    const needsPrice = draft.pricingDisplay !== 'on_request';
    const priceValid = !needsPrice || (draft.priceFrom !== null && draft.priceFrom !== undefined && Number(draft.priceFrom) >= 0);
    const canSave = !!(draft.title.ar.trim() || draft.title.en.trim()) && priceValid && !saveMutation.isPending;
    const status = existing ? STATUS_TEXT[existing.approvalStatus] : null;

    return (
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{localized(category.name, language)}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{localized(category.description, language)}</p>
                </div>
                {status && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}>{isAr ? status.ar : status.en}</span>}
            </div>

            {existing?.adminNote && (
                <p className="text-sm p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <span className="font-semibold">{isAr ? 'ملاحظة الإدارة: ' : 'Admin note: '}</span>
                    {existing.adminNote}
                </p>
            )}

            {!open ? (
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setOpen(true)} disabled={existing?.approvalStatus === 'disabled'}>
                        {existing ? (isAr ? 'تعديل تفاصيل الخدمة' : 'Edit service details') : (isAr ? 'أقدّم هذه الخدمة — أرسل للاعتماد' : 'I offer this — submit for approval')}
                    </Button>
                    {existing && existing.approvalStatus !== 'approved' && (
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                            {isAr ? 'حذف' : 'Remove'}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className={input} dir="rtl" placeholder="عنوان الخدمة بالعربي" value={draft.title.ar} onChange={(e) => setDraft({ ...draft, title: { ...draft.title, ar: e.target.value } })} />
                        <input className={input} dir="ltr" placeholder="Service title (English)" value={draft.title.en} onChange={(e) => setDraft({ ...draft, title: { ...draft.title, en: e.target.value } })} />
                        <textarea className={input} dir="rtl" rows={3} placeholder="وصف الخدمة" value={draft.description.ar} onChange={(e) => setDraft({ ...draft, description: { ...draft.description, ar: e.target.value } })} />
                        <textarea className={input} dir="ltr" rows={3} placeholder="Description" value={draft.description.en} onChange={(e) => setDraft({ ...draft, description: { ...draft.description, en: e.target.value } })} />
                        <textarea className={input} dir="rtl" rows={3} placeholder="ما الذي يتضمنه العرض (النطاق)" value={draft.scope.ar} onChange={(e) => setDraft({ ...draft, scope: { ...draft.scope, ar: e.target.value } })} />
                        <textarea className={input} dir="ltr" rows={3} placeholder="What the offer includes (scope)" value={draft.scope.en} onChange={(e) => setDraft({ ...draft, scope: { ...draft.scope, en: e.target.value } })} />
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="text-sm">
                            <span className="block mb-1 text-gray-600 dark:text-gray-300">{isAr ? 'طريقة عرض السعر' : 'How to show price'}</span>
                            <select
                                className={input}
                                value={draft.pricingDisplay}
                                onChange={(e) => setDraft({ ...draft, pricingDisplay: e.target.value as FinishingPricingDisplay })}
                            >
                                <option value="on_request">{isAr ? 'حسب العرض (بدون سعر)' : 'On quote (no price)'}</option>
                                <option value="starting_from">{isAr ? 'يبدأ من' : 'Starting from'}</option>
                                <option value="per_sqm">{isAr ? 'سعر المتر' : 'Per m²'}</option>
                                <option value="fixed">{isAr ? 'سعر ثابت' : 'Fixed price'}</option>
                            </select>
                        </label>
                        {needsPrice && (
                            <label className="text-sm">
                                <span className="block mb-1 text-gray-600 dark:text-gray-300">{isAr ? 'السعر (ج.م)' : 'Price (EGP)'}</span>
                                <input
                                    type="number"
                                    min={0}
                                    className={input}
                                    value={draft.priceFrom ?? ''}
                                    onChange={(e) => setDraft({ ...draft, priceFrom: e.target.value === '' ? null : Number(e.target.value) })}
                                />
                            </label>
                        )}
                        <label className="flex items-center gap-2 text-sm pb-2">
                            <input type="checkbox" checked={draft.isListed} onChange={(e) => setDraft({ ...draft, isListed: e.target.checked })} />
                            {isAr ? 'إظهار الخدمة للعملاء بعد اعتمادها' : 'Show to customers once approved'}
                        </label>
                    </div>
                    {existing?.approvalStatus === 'approved' && (
                        <p className="text-xs text-gray-500">
                            {isAr ? 'تعديلات الوصف والسعر تظهر مباشرة على الخدمة المعتمدة.' : 'Description and price edits go live on the approved service immediately.'}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button size="sm" disabled={!canSave} onClick={() => saveMutation.mutate()}>
                            {isAr ? 'حفظ' : 'Save'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setDraft(existing || emptyDraft(partnerId, category.id)); setOpen(false); }}>
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

const PartnerFinishingServicesPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const partnerId = currentUser?.id || '';

    const categoriesQuery = useQuery({ queryKey: ['finishingMarketCategories'], queryFn: () => getFinishingMarketCategories() });
    const servicesQuery = useQuery({
        queryKey: ['myFinishingServices', partnerId],
        queryFn: () => getMyFinishingServices(partnerId),
        enabled: !!partnerId,
    });

    if (categoriesQuery.isLoading || servicesQuery.isLoading) {
        return <p className="text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>;
    }
    if (categoriesQuery.isError || servicesQuery.isError) {
        return <p className="text-red-600">{((categoriesQuery.error || servicesQuery.error) as Error)?.message}</p>;
    }

    const services = servicesQuery.data || [];
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isAr ? 'خدماتي في التشطيبات' : 'My finishing services'}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {isAr
                        ? 'اختر الفئات التي تقدمها. كل خدمة تظهر للعملاء تحت فئتها وفي بروفايلك بعد اعتماد الإدارة. أنت من يحدد عرضك وسعرك.'
                        : 'Choose the categories you offer. Each service appears to customers under its category and on your profile after admin approval. You set your own offer and price.'}
                </p>
            </div>
            {(categoriesQuery.data || []).map((category) => (
                <ServiceEditor
                    key={category.id}
                    category={category}
                    partnerId={partnerId}
                    existing={services.find((s) => s.categoryId === category.id)}
                />
            ))}
        </div>
    );
};

export default PartnerFinishingServicesPage;
