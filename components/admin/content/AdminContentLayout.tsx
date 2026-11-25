import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useOutletContext, Link, useLocation } from 'react-router-dom';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildContentPatch, getContent, updateContent } from '../../../services/content';
import { useToast } from '../../shared/ToastContext';
import { useLanguage } from '../../shared/LanguageContext';
import { Button } from '../../ui/Button';
import type { SiteContent } from '../../../types';
import CmsLivePreviewPanel from './CmsLivePreviewPanel';
import {
    PhotoIcon,
    SparklesIcon,
    CheckCircleIcon,
    UsersIcon,
    QuoteIcon,
    ChartBarIcon,
    LocationMarkerIcon,
    PhoneIcon,
    GlobeAltIcon,
    CubeIcon,
    WrenchScrewdriverIcon,
    MegaphoneIcon,
    HomeIcon,
    ShieldCheckIcon,
    ListIcon,
    EyeIcon,
} from '../../ui/Icons';

export type ContentFormContext = UseFormReturn<SiteContent>;
export function useContentFormContext() {
    return useOutletContext<ContentFormContext>();
}

const AdminContentLayout: React.FC = () => {
    const { language, t } = useLanguage();
    const isAr = language === 'ar';
    const t_content = t.adminDashboard.contentManagement;
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const location = useLocation();

    const { data: initialContent, isLoading } = useQuery({
        queryKey: ['siteContent'],
        queryFn: () => getContent({ forceRefresh: true }),
        staleTime: 0,
        refetchOnMount: 'always',
    });

    const formMethods = useForm<SiteContent>();
    const {
        control,
        handleSubmit,
        reset,
        formState: { isSubmitting, isDirty, dirtyFields },
    } = formMethods;

    const savedBaselineRef = useRef<SiteContent | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (initialContent && (!savedBaselineRef.current || !isDirty)) {
            savedBaselineRef.current = initialContent;
            reset(initialContent);
        }
    }, [initialContent, isDirty, reset]);

    const handleRestoreSaved = () => {
        const baseline = savedBaselineRef.current || initialContent;
        if (baseline) {
            reset(baseline);
        }
        setSaveError(null);
    };

    const onSubmit = async (data: SiteContent) => {
        setSaveError(null);
        const baseline = savedBaselineRef.current || initialContent;
        const patch = baseline ? buildContentPatch(baseline, data, dirtyFields) : (data as Partial<SiteContent>);

        if (Object.keys(patch).length === 0) {
            if (baseline) {
                reset(baseline);
            }
            return;
        }

        try {
            const updated = await updateContent(patch);
            savedBaselineRef.current = updated;
            queryClient.setQueryData(['siteContent'], updated);
            reset(updated);
            showToast(
                language === 'ar'
                    ? 'تم حفظ المحتوى بنجاح في قاعدة البيانات وتحديث الموقع مباشرة!'
                    : 'Site content updated successfully and live on site!',
                'success'
            );
        } catch (err: any) {
            console.error('Failed to update content:', err);
            const detail = err?.message ? String(err.message) : '';
            const fallbackMsg =
                language === 'ar'
                    ? 'حدث خطأ أثناء حفظ المحتوى في قاعدة البيانات. تم الاحتفاظ بالقيمة المحفوظة سابقًا.'
                    : 'Failed to save site content to the database. Previously saved values have been preserved.';
            setSaveError(detail ? `${fallbackMsg} (${detail})` : fallbackMsg);
            showToast(
                language === 'ar' ? 'فشل حفظ المحتوى — تم الاحتفاظ بالقيمة السابقة' : 'Failed to save site content — previous values preserved',
                'error'
            );
        }
    };

    const navGroups = [
        {
            title: isAr ? 'الصفحة الرئيسية' : 'Home Page',
            links: [
                { key: 'homeLayout', href: 'home-layout', icon: ListIcon, label: 'Home Layout & Order' },
                { key: 'hero', href: 'hero', icon: PhotoIcon, label: 'Hero Section' },
                { key: 'homeListings', href: 'home-listings', icon: HomeIcon, label: 'Home Listings' },
                { key: 'socialProof', href: 'social-proof', icon: ChartBarIcon, label: 'Social Proof' },
                { key: 'whyNewHeliopolis', href: 'why-new-heliopolis', icon: LocationMarkerIcon, label: 'Why New Heliopolis' },
                { key: 'whyUs', href: 'why-us', icon: CheckCircleIcon, label: 'Why Us' },
                { key: 'partners', href: 'partners', icon: UsersIcon, label: 'Partners' },
                { key: 'testimonials', href: 'testimonials', icon: QuoteIcon, label: 'Testimonials' },
                { key: 'cta', href: 'home-cta', icon: MegaphoneIcon, label: 'Call to Action' },
            ],
        },
        {
            title: isAr ? 'الصفحات الأساسية' : 'Core Pages',
            links: [
                { key: 'contactPage', href: 'contact-page', icon: PhoneIcon, label: 'Contact Page' },
                { key: 'projectsPage', href: 'projects-page', icon: CubeIcon, label: 'Projects Page' },
                { key: 'services', href: 'services', icon: SparklesIcon, label: 'Services Overview' },
                { key: 'finishingPage', href: 'finishing-page', icon: WrenchScrewdriverIcon, label: 'Finishing Page' },
                { key: 'decorationsPage', href: 'decorations-page', icon: SparklesIcon, label: 'Decorations Page' },
            ],
        },
        {
            title: isAr ? 'السياسات والقانونية' : 'Legal & Policies',
            links: [
                { key: 'privacyPolicy', href: 'privacy-policy', icon: ShieldCheckIcon, label: 'Privacy Policy' },
                { key: 'termsOfUse', href: 'terms-of-use', icon: ShieldCheckIcon, label: 'Terms of Use' },
            ],
        },
        {
            title: isAr ? 'العناصر العامة والقوائم' : 'Global Elements',
            links: [
                { key: 'navigation', href: 'navigation', icon: ListIcon, label: 'Navigation Menu' },
                { key: 'actionButtons', href: 'action-buttons', icon: MegaphoneIcon, label: 'Action Buttons (CTAs)' },
                { key: 'quotes', href: 'quotes', icon: QuoteIcon, label: 'Wisdom Quotes' },
                { key: 'footer', href: 'footer', icon: PhoneIcon, label: 'Footer & Contact' },
            ],
        },
    ];

    const baseLinkClasses = 'flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 group';
    const activeLinkClasses = 'bg-amber-50 text-gray-900 shadow-sm';
    const inactiveLinkClasses = 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-amber-600 dark:hover:text-amber-400';

    if (isLoading && !savedBaselineRef.current) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    const previewInitialScope = location.pathname.includes('contact-page') ? 'contact' : 'home';

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_content.title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t_content.subtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <Button
                        type="button"
                        variant={showPreview ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setShowPreview((prev) => !prev)}
                        className="flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                        <EyeIcon className="w-4 h-4" />
                        {showPreview
                            ? isAr ? 'إخفاء المعاينة' : 'Hide Preview'
                            : isAr ? 'معاينة قبل الحفظ' : 'Live Preview'}
                    </Button>
                    <Link
                        to="/"
                        target="_self"
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-amber-600 transition-colors whitespace-nowrap shrink-0"
                        title={language === 'ar' ? 'عرض الموقع في نفس الصفحة' : 'View Live Site'}
                    >
                        <GlobeAltIcon className="w-4 h-4" />
                        {language === 'ar' ? 'عرض الموقع' : 'View Live Site'}
                    </Link>
                    {isDirty && (
                        <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-800 shrink-0">
                            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 whitespace-nowrap">
                                {t_content.unsavedChanges}
                            </span>
                            <Button type="submit" isLoading={isSubmitting} disabled={!isDirty || isSubmitting} size="sm" className="whitespace-nowrap shrink-0">
                                {isSubmitting ? t_content.saving : t_content.saveChanges}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {saveError && (
                <div
                    role="alert"
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                    className="mb-6 p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-800 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    <div className="space-y-1">
                        <p className="font-bold text-sm">
                            {language === 'ar' ? 'فشل حفظ المحتوى' : 'Content Save Failed'}
                        </p>
                        <p className="text-sm">{saveError}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button type="button" variant="secondary" size="sm" onClick={handleRestoreSaved}>
                            {language === 'ar' ? 'استعادة القيم المحفوظة' : 'Restore Saved Values'}
                        </Button>
                    </div>
                </div>
            )}

            {showPreview && (
                <CmsLivePreviewPanel
                    control={control}
                    isDirty={isDirty}
                    initialScope={previewInitialScope}
                    onClose={() => setShowPreview(false)}
                />
            )}

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <nav className="w-full lg:w-64 flex-shrink-0 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-24 max-h-[calc(100vh-150px)] overflow-y-auto">
                    {navGroups.map((group) => (
                        <div key={group.title} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {group.title}
                            </div>
                            <ul className="p-2 space-y-1">
                                {group.links.map((link) => {
                                    const Icon = link.icon;
                                    return (
                                        <li key={link.key}>
                                            <NavLink
                                                to={link.href}
                                                className={({ isActive }) =>
                                                    `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                                                }
                                            >
                                                <Icon className={`w-4 h-4 shrink-0 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                                                {t_content.tabs[link.key] || link.label}
                                            </NavLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                <main className="flex-1 min-w-0 w-full bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <Outlet context={formMethods} />
                </main>
            </div>
        </form>
    );
};

export default AdminContentLayout;