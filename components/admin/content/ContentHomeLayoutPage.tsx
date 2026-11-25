import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { HomeSectionId, SiteContent } from '../../../types';
import { DEFAULT_HOME_SECTIONS } from '../../../utils/siteContentHelpers';
import { useLanguage } from '../../shared/LanguageContext';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { ArrowUpIcon, ArrowDownIcon, ArrowPathIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const SECTION_EDITOR_ROUTES: Record<HomeSectionId, string> = {
    hero: '/admin/content/hero',
    homeBanner: '/admin/banners',
    socialProof: '/admin/content/social-proof',
    services: '/admin/content/services',
    whyNewHeliopolis: '/admin/content/why-new-heliopolis',
    whyUs: '/admin/content/why-us',
    homeListings: '/admin/content/home-listings',
    partners: '/admin/content/partners',
    testimonials: '/admin/content/testimonials',
    homeCTA: '/admin/content/home-cta',
};

const syncLegacySectionFlag = (
    setValue: UseFormReturn<SiteContent>['setValue'],
    sectionId: HomeSectionId,
    enabled: boolean
) => {
    switch (sectionId) {
        case 'hero':
            setValue('hero.enabled', enabled, { shouldDirty: true });
            break;
        case 'socialProof':
            setValue('socialProof.enabled' as any, enabled, { shouldDirty: true });
            break;
        case 'services':
            setValue('services.enabled' as any, enabled, { shouldDirty: true });
            break;
        case 'whyNewHeliopolis':
            setValue('whyNewHeliopolis.enabled' as any, enabled, { shouldDirty: true });
            break;
        case 'whyUs':
            setValue('whyUs.enabled' as any, enabled, { shouldDirty: true });
            break;
        case 'homeListings':
            setValue('homeListings.enabled', enabled, { shouldDirty: true });
            break;
        case 'partners':
            setValue('partners.enabled' as any, enabled, { shouldDirty: true });
            break;
        case 'testimonials':
            setValue('testimonials.enabled' as any, enabled, { shouldDirty: true });
            break;
        case 'homeCTA':
            setValue('homeCTA.enabled', enabled, { shouldDirty: true });
            break;
        default:
            break;
    }
};

const ContentHomeLayoutPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { control, watch, setValue, getValues } = useOutletContext<ContentFormContext>();
    const { fields, replace } = useFieldArray({ control, name: 'homeSections' });

    const handleMove = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        const current = [...(getValues('homeSections') || [])];
        if (target < 0 || target >= current.length) return;
        const [moved] = current.splice(index, 1);
        current.splice(target, 0, moved);
        const reindexed = current.map((sec, idx) => ({
            ...sec,
            order: idx + 1,
        }));
        replace(reindexed);
        setValue('homeSections', reindexed, { shouldDirty: true });
    };

    const handleToggleSection = (index: number, sectionId: HomeSectionId, enabled: boolean) => {
        setValue(`homeSections.${index}.enabled`, enabled, { shouldDirty: true });
        syncLegacySectionFlag(setValue, sectionId, enabled);
    };

    const handleResetOrder = () => {
        const defaults = DEFAULT_HOME_SECTIONS.map((sec, idx) => ({
            ...sec,
            label: { ...sec.label },
            enabled: true,
            order: idx + 1,
        }));
        replace(defaults);
        setValue('homeSections', defaults, { shouldDirty: true });
        defaults.forEach((sec) => syncLegacySectionFlag(setValue, sec.id, true));
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>
                                {isAr ? 'ترتيب وإظهار أقسام الصفحة الرئيسية' : 'Home Page Sections Order & Visibility'}
                            </CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                                {isAr
                                    ? 'أعد ترتيب أقسام الصفحة الرئيسية أو فعّل/عطل ظهور أي قسم، وشاهد النتيجة فوراً في المعاينة قبل الحفظ.'
                                    : 'Reorder Home Page sections and toggle section visibility. Preview updates live before saving.'}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResetOrder}
                            className="whitespace-nowrap shrink-0 flex items-center gap-1.5"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            {isAr ? 'استعادة الترتيب الافتراضي' : 'Reset Default Order'}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    {fields.map((field, index) => {
                        const sectionId = watch(`homeSections.${index}.id`) as HomeSectionId;
                        const labelAr = watch(`homeSections.${index}.label.ar`);
                        const labelEn = watch(`homeSections.${index}.label.en`);
                        const enabled = watch(`homeSections.${index}.enabled`) !== false;
                        const editPath = SECTION_EDITOR_ROUTES[sectionId] || '/admin/content/hero';

                        return (
                            <div
                                key={field.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                                    enabled
                                        ? 'bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                                        : 'bg-gray-100/80 dark:bg-gray-900/50 border-dashed border-gray-300 dark:border-gray-700 opacity-75'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold text-xs shrink-0">
                                        {index + 1}
                                    </span>

                                    <Checkbox
                                        id={`home-sec-${sectionId}`}
                                        checked={enabled}
                                        onChange={(e) => handleToggleSection(index, sectionId, e.target.checked)}
                                    />

                                    <label htmlFor={`home-sec-${sectionId}`} className="cursor-pointer min-w-0">
                                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                            {isAr ? labelAr || labelEn : labelEn || labelAr}
                                        </p>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {sectionId} • {isAr ? labelEn : labelAr}
                                        </p>
                                    </label>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 justify-end">
                                    <Link
                                        to={editPath}
                                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/40 whitespace-nowrap"
                                    >
                                        {isAr ? 'تعديل المحتوى' : 'Edit Content'}
                                    </Link>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="secondary"
                                        className="h-8 w-8"
                                        onClick={() => handleMove(index, -1)}
                                        disabled={index === 0}
                                        title={isAr ? 'تحريك لأعلى' : 'Move Up'}
                                    >
                                        <ArrowUpIcon className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="secondary"
                                        className="h-8 w-8"
                                        onClick={() => handleMove(index, 1)}
                                        disabled={index === fields.length - 1}
                                        title={isAr ? 'تحريك لأسفل' : 'Move Down'}
                                    >
                                        <ArrowDownIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentHomeLayoutPage;
