import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useOutletContext, Link } from 'react-router-dom';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContent, updateContent } from '../../../services/content';
import { useToast } from '../../shared/ToastContext';
import { useLanguage } from '../../shared/LanguageContext';
import { Button } from '../../ui/Button';
import type { SiteContent } from '../../../types';
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
    ChevronDownIcon
} from '../../ui/Icons';

export type ContentFormContext = UseFormReturn<SiteContent>;
export function useContentFormContext() {
  return useOutletContext<ContentFormContext>();
}

const AdminContentLayout: React.FC = () => {
    const { language, t } = useLanguage();
    const t_content = t.adminDashboard.contentManagement;
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { data: initialContent, isLoading, refetch } = useQuery({ queryKey: ['siteContent'], queryFn: getContent });
    
    const formMethods = useForm<SiteContent>();
    const { handleSubmit, reset, formState: { isSubmitting, isDirty } } = formMethods;

    useEffect(() => {
        if (initialContent) {
            reset(initialContent);
        }
    }, [initialContent, reset]);
    
    const onSubmit = async (data: SiteContent) => {
        try {
            const updated = await updateContent(data as Partial<SiteContent>);
            queryClient.setQueryData(['siteContent'], updated);
            await queryClient.invalidateQueries({ queryKey: ['siteContent'] });
            showToast(
                language === 'ar' 
                    ? 'تم حفظ المحتوى بنجاح في قاعدة البيانات وتحديث الموقع مباشرة!' 
                    : 'Site content updated successfully and live on site!', 
                'success'
            );
            await refetch();
            reset(updated); 
        } catch (err: any) {
            console.error('Failed to update content:', err);
            showToast(language === 'ar' ? 'حدث خطأ أثناء حفظ المحتوى' : 'Failed to save site content', 'error');
        }
    };

    const navGroups = [
        {
            title: 'Home Page',
            links: [
                { key: 'hero', href: 'hero', icon: PhotoIcon, label: 'Hero Section' },
                { key: 'homeListings', href: 'home-listings', icon: HomeIcon, label: 'Home Listings' },
                { key: 'socialProof', href: 'social-proof', icon: ChartBarIcon, label: 'Social Proof' },
                { key: 'whyNewHeliopolis', href: 'why-new-heliopolis', icon: LocationMarkerIcon, label: 'Why New Heliopolis' },
                { key: 'whyUs', href: 'why-us', icon: CheckCircleIcon, label: 'Why Us' },
                { key: 'partners', href: 'partners', icon: UsersIcon, label: 'Partners' },
                { key: 'testimonials', href: 'testimonials', icon: QuoteIcon, label: 'Testimonials' },
                { key: 'cta', href: 'home-cta', icon: MegaphoneIcon, label: 'Call to Action' },
            ]
        },
        {
            title: 'Core Pages',
            links: [
                { key: 'projectsPage', href: 'projects-page', icon: CubeIcon, label: 'Projects Page' },
                { key: 'services', href: 'services', icon: SparklesIcon, label: 'Services Overview' },
                { key: 'finishingPage', href: 'finishing-page', icon: WrenchScrewdriverIcon, label: 'Finishing Page' },
                { key: 'decorationsPage', href: 'decorations-page', icon: SparklesIcon, label: 'Decorations Page' },
            ]
        },
        {
            title: 'Legal & Policies',
            links: [
                { key: 'privacyPolicy', href: 'privacy-policy', icon: ShieldCheckIcon, label: 'Privacy Policy' },
                { key: 'termsOfUse', href: 'terms-of-use', icon: ShieldCheckIcon, label: 'Terms of Use' },
            ]
        },
        {
            title: 'Global Elements',
            links: [
                { key: 'quotes', href: 'quotes', icon: QuoteIcon, label: 'Wisdom Quotes' },
                { key: 'footer', href: 'footer', icon: PhoneIcon, label: 'Footer & Contact' },
            ]
        }
    ];
    
    const baseLinkClasses = "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 group";
    const activeLinkClasses = "bg-amber-50 text-gray-900 shadow-sm";
    const inactiveLinkClasses = "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-amber-600 dark:hover:text-amber-400";

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_content.title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t_content.subtitle}</p>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                     <Link 
                        to="/" 
                        target="_self"
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-amber-600 transition-colors"
                        title={language === 'ar' ? 'عرض الموقع في نفس الصفحة' : 'View Live Site'}
                    >
                        <GlobeAltIcon className="w-4 h-4" />
                        {language === 'ar' ? 'عرض الموقع' : 'View Live Site'}
                    </Link>
                    {isDirty && (
                        <div className="flex items-center gap-4 bg-yellow-50 dark:bg-yellow-900/30 px-4 py-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400 animate-pulse">{t_content.unsavedChanges}</span>
                            <Button type="submit" isLoading={isSubmitting} disabled={!isDirty} size="sm">
                                {isSubmitting ? t_content.saving : t_content.saveChanges}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <nav className="w-full lg:w-64 flex-shrink-0 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-24 max-h-[calc(100vh-150px)] overflow-y-auto">
                    {navGroups.map((group) => (
                        <div key={group.title} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {group.title}
                            </div>
                            <ul className="p-2 space-y-1">
                                {group.links.map(link => {
                                    const Icon = link.icon;
                                    return (
                                        <li key={link.key}>
                                            <NavLink
                                                to={link.href}
                                                className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
                                            >
                                                <Icon className={`w-4 h-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                                                {/* Fallback to label if translation key doesn't exist in t_content.tabs */}
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