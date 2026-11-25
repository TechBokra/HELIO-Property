import React, { useEffect, useMemo, useState } from 'react';
import type { Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import type { Language, SiteContent } from '../../../types';
import { Permission } from '../../../types';
import { normalizeSiteContent } from '../../../services/content';
import { SiteContentOverrideProvider } from '../../../hooks/useSiteContent';
import { PreviewLanguageProvider, useLanguage } from '../../shared/LanguageContext';
import { Header } from '../../shared/Header';
import MobileNav from '../../shared/MobileNav';
import Footer from '../../shared/Footer';
import HomePage from '../../home/HomePage';
import ContactPage from '../../contact/ContactPage';
import { Button } from '../../ui/Button';
import { CloseIcon } from '../../ui/Icons';

interface CmsLivePreviewPanelProps {
    control: Control<SiteContent>;
    isDirty: boolean;
    onClose: () => void;
    initialScope?: 'home' | 'contact';
}

type PreviewScope = 'home' | 'contact';
type PreviewViewport = 'desktop' | 'mobile';

const CmsLivePreviewPanel: React.FC<CmsLivePreviewPanelProps> = ({
    control,
    isDirty,
    onClose,
    initialScope = 'home',
}) => {
    const { language: adminLang } = useLanguage();
    const isAdminAr = adminLang === 'ar';

    const watchedContent = useWatch({ control });
    const previewContent = useMemo(() => normalizeSiteContent(watchedContent), [watchedContent]);

    const [scope, setScope] = useState<PreviewScope>(initialScope);
    const [viewport, setViewport] = useState<PreviewViewport>('desktop');
    const [previewLang, setPreviewLang] = useState<Language>(adminLang);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [interceptedNotice, setInterceptedNotice] = useState<string | null>(null);

    useEffect(() => {
        setScope(initialScope);
    }, [initialScope]);

    const handlePreviewClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null;
        const anchor = target?.closest('a') as HTMLAnchorElement | null;
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (!href) return;

        e.preventDefault();
        e.stopPropagation();

        if (href === '/' || href === '/home') {
            setScope('home');
            setMobileMenuOpen(false);
            setInterceptedNotice(null);
            return;
        }
        if (href === '/contact') {
            setScope('contact');
            setMobileMenuOpen(false);
            setInterceptedNotice(null);
            return;
        }

        setInterceptedNotice(
            isAdminAr
                ? `وجهة الرابط في المعاينة: ${href}`
                : `Preview link target: ${href}`
        );
    };

    const isMobile = viewport === 'mobile';

    return (
        <div className="mb-8 rounded-2xl border-2 border-amber-400/70 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
            {/* Preview Toolbar */}
            <div className="px-4 py-3 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-sm text-amber-400">
                        {isAdminAr ? 'المعاينة المباشرة قبل الحفظ' : 'Pre-Save Live Preview'}
                    </span>
                    <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            isDirty
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                                : 'bg-gray-700 text-gray-200'
                        }`}
                    >
                        {isDirty
                            ? isAdminAr ? 'تعرض التعديلات غير المحفوظة' : 'Showing Unsaved Edits'
                            : isAdminAr ? 'مطابق للنسخة المحفوظة' : 'Synced with Saved'}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Scope */}
                    <div className="inline-flex rounded-lg bg-gray-800 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => setScope('home')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                                scope === 'home' ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:text-white'
                            }`}
                        >
                            {isAdminAr ? 'الرئيسية' : 'Home'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setScope('contact')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                                scope === 'contact' ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:text-white'
                            }`}
                        >
                            {isAdminAr ? 'صفحة التواصل' : 'Contact Page'}
                        </button>
                    </div>

                    {/* Viewport */}
                    <div className="inline-flex rounded-lg bg-gray-800 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                setViewport('desktop');
                                setMobileMenuOpen(false);
                            }}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                                viewport === 'desktop' ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:text-white'
                            }`}
                        >
                            {isAdminAr ? 'سطح المكتب' : 'Desktop'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewport('mobile')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                                viewport === 'mobile' ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:text-white'
                            }`}
                        >
                            {isAdminAr ? 'موبايل (390px)' : 'Mobile (390px)'}
                        </button>
                    </div>

                    {isMobile && (
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((prev) => !prev)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                                mobileMenuOpen
                                    ? 'bg-amber-500 text-gray-900 border-amber-400'
                                    : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                            }`}
                        >
                            {mobileMenuOpen
                                ? isAdminAr ? 'إغلاق قائمة الموبايل' : 'Close Mobile Menu'
                                : isAdminAr ? 'فتح قائمة الموبايل' : 'Open Mobile Menu'}
                        </button>
                    )}

                    {/* Language */}
                    <div className="inline-flex rounded-lg bg-gray-800 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => setPreviewLang('ar')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                                previewLang === 'ar' ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:text-white'
                            }`}
                        >
                            العربية
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreviewLang('en')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                                previewLang === 'en' ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:text-white'
                            }`}
                        >
                            English
                        </button>
                    </div>

                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={onClose}
                        className="h-7 w-7 text-gray-300 hover:text-white hover:bg-gray-800"
                        title={isAdminAr ? 'إغلاق المعاينة' : 'Close Preview'}
                    >
                        <CloseIcon className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {interceptedNotice && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-mono font-semibold">{interceptedNotice}</span>
                    <button
                        type="button"
                        onClick={() => setInterceptedNotice(null)}
                        className="underline font-semibold"
                    >
                        {isAdminAr ? 'إخفاء' : 'Dismiss'}
                    </button>
                </div>
            )}

            {/* Preview Viewport Canvas */}
            <div className="bg-gray-100 dark:bg-gray-950 p-3 sm:p-5 overflow-x-auto">
                <div
                    dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
                    onClickCapture={handlePreviewClickCapture}
                    className={`relative mx-auto bg-white text-gray-900 shadow-2xl border border-gray-300 dark:border-gray-700 overflow-y-auto overflow-x-hidden transition-all ${
                        isMobile ? 'w-[390px] max-w-full rounded-3xl border-4 border-gray-800' : 'w-full rounded-xl'
                    }`}
                    style={{ maxHeight: '72vh' }}
                >
                    <SiteContentOverrideProvider value={previewContent}>
                        <PreviewLanguageProvider language={previewLang} onChangeLanguage={setPreviewLang}>
                            <Header
                                previewViewport={viewport}
                                onToggleQuietZone={() => {}}
                                onOpenMobileNav={() => setMobileMenuOpen(true)}
                                currentUser={null}
                                dashboardPath="/"
                                dashboardText=""
                                logout={() => {}}
                            />

                            {isMobile && (
                                <MobileNav
                                    id="cms-preview-mobile-nav"
                                    isPreview
                                    isOpen={mobileMenuOpen}
                                    onClose={() => setMobileMenuOpen(false)}
                                    onToggleQuietZone={() => {}}
                                    currentUser={null}
                                    dashboardPath="/"
                                    logout={() => {}}
                                    hasPermission={(p: Permission) => false}
                                />
                            )}

                            <main>{scope === 'home' ? <HomePage /> : <ContactPage />}</main>

                            <Footer />
                        </PreviewLanguageProvider>
                    </SiteContentOverrideProvider>
                </div>
            </div>
        </div>
    );
};

export default CmsLivePreviewPanel;
