import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { DEFAULT_NAVIGATION_LINKS } from '../../../utils/siteContentHelpers';
import { useLanguage } from '../../shared/LanguageContext';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Checkbox } from '../../ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { ArrowUpIcon, ArrowDownIcon, PlusIcon, TrashIcon, ArrowPathIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const ROUTE_PRESETS = [
    { href: '/', labelAr: 'الرئيسية (/)', labelEn: 'Home (/)' },
    { href: '/properties', labelAr: 'العقارات (/properties)', labelEn: 'Properties (/properties)' },
    { href: '/projects', labelAr: 'المشاريع (/projects)', labelEn: 'Projects (/projects)' },
    { href: '/finishing', labelAr: 'التشطيبات (/finishing)', labelEn: 'Finishing (/finishing)' },
    { href: '/decorations', labelAr: 'الديكورات (/decorations)', labelEn: 'Decorations (/decorations)' },
    { href: '/contact', labelAr: 'تواصل معنا (/contact)', labelEn: 'Contact Us (/contact)' },
    { href: '/add-property', labelAr: 'أضف عقارك (/add-property)', labelEn: 'Add Property (/add-property)' },
    { href: '/register', labelAr: 'انضم كشريك (/register)', labelEn: 'Join as Partner (/register)' },
];

const ICON_OPTIONS = [
    { value: 'HomeIcon', labelAr: 'أيقونة الرئيسية (Home)', labelEn: 'HomeIcon' },
    { value: 'BuildingIcon', labelAr: 'أيقونة العقارات (Building)', labelEn: 'BuildingIcon' },
    { value: 'CubeIcon', labelAr: 'أيقونة المشاريع (Cube)', labelEn: 'CubeIcon' },
    { value: 'WrenchScrewdriverIcon', labelAr: 'أيقونة التشطيبات (Tools)', labelEn: 'WrenchScrewdriverIcon' },
    { value: 'SparklesIcon', labelAr: 'أيقونة الديكور (Sparkles)', labelEn: 'SparklesIcon' },
    { value: 'PhoneIcon', labelAr: 'أيقونة التواصل (Phone)', labelEn: 'PhoneIcon' },
    { value: 'LinkIcon', labelAr: 'أيقونة رابط عام (Link)', labelEn: 'LinkIcon' },
];

const ContentNavigationPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { register, control, watch, setValue, getValues } = useOutletContext<ContentFormContext>();
    const { fields, append, remove, replace } = useFieldArray({ control, name: 'navigation' });

    const syncOrderValues = (items: any[]) => {
        const reindexed = items.map((item, idx) => ({
            ...item,
            order: idx + 1,
        }));
        replace(reindexed);
        setValue('navigation', reindexed, { shouldDirty: true });
    };

    const handleMove = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        const current = [...(getValues('navigation') || [])];
        if (target < 0 || target >= current.length) return;
        const [moved] = current.splice(index, 1);
        current.splice(target, 0, moved);
        syncOrderValues(current);
    };

    const handleAddLink = () => {
        const nextOrder = (getValues('navigation')?.length || 0) + 1;
        append({
            id: `nav-custom-${Date.now()}`,
            href: '/properties',
            label: { ar: 'رابط جديد', en: 'New Link' },
            visible: true,
            order: nextOrder,
            icon: 'LinkIcon',
            isEnd: false,
        });
    };

    const handleResetDefaults = () => {
        const defaults = DEFAULT_NAVIGATION_LINKS.map((item, idx) => ({
            ...item,
            label: { ...item.label },
            order: idx + 1,
        }));
        replace(defaults);
        setValue('navigation', defaults, { shouldDirty: true });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>
                                {isAr ? 'روابط القائمة الرئيسية (Desktop & Mobile)' : 'Main Navigation Menu Links'}
                            </CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                                {isAr
                                    ? 'تحكم في إظهار وإخفاء روابط الهيدر وقائمة الموبايل وترتيبها وعناوينها بالعربية والإنجليزية.'
                                    : 'Control visibility, ordering, localized labels, and target routes for Header and MobileNav links.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleResetDefaults}
                                className="whitespace-nowrap shrink-0 flex items-center gap-1.5"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                {isAr ? 'استعادة الافتراضي' : 'Reset Defaults'}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAddLink}
                                className="whitespace-nowrap shrink-0 flex items-center gap-1.5"
                            >
                                <PlusIcon className="w-4 h-4" />
                                {isAr ? 'إضافة رابط' : 'Add Link'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {fields.map((field, index) => {
                        const isVisible = watch(`navigation.${index}.visible`) !== false;
                        const currentHref = watch(`navigation.${index}.href`) || '';

                        return (
                            <div
                                key={field.id}
                                className={`rounded-xl border p-4 transition-all ${
                                    isVisible
                                        ? 'bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                                        : 'bg-gray-100/80 dark:bg-gray-900/50 border-dashed border-gray-300 dark:border-gray-700 opacity-75'
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 mb-3 border-b border-gray-200/80 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold text-xs">
                                            {index + 1}
                                        </span>
                                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                            <Checkbox
                                                id={`nav-visible-${field.id}`}
                                                checked={isVisible}
                                                onChange={(e) =>
                                                    setValue(`navigation.${index}.visible`, e.target.checked, {
                                                        shouldDirty: true,
                                                    })
                                                }
                                            />
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                {isVisible
                                                    ? isAr ? 'ظاهر في القائمة' : 'Visible in Menu'
                                                    : isAr ? 'مخفي من القائمة' : 'Hidden from Menu'}
                                            </span>
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8"
                                            onClick={() => handleMove(index, -1)}
                                            disabled={index === 0}
                                            title={isAr ? 'نقل لأعلى' : 'Move Up'}
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
                                            title={isAr ? 'نقل لأسفل' : 'Move Down'}
                                        >
                                            <ArrowDownIcon className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="danger"
                                            className="h-8 w-8"
                                            onClick={() => remove(index)}
                                            disabled={fields.length <= 1}
                                            title={isAr ? 'حذف الرابط' : 'Delete Link'}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            {isAr ? 'الاسم بالعربية' : 'Label (Arabic)'}
                                        </label>
                                        <Input
                                            {...register(`navigation.${index}.label.ar`)}
                                            dir="rtl"
                                            placeholder="مثال: العقارات"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            {isAr ? 'الاسم بالإنجليزية' : 'Label (English)'}
                                        </label>
                                        <Input
                                            {...register(`navigation.${index}.label.en`)}
                                            dir="ltr"
                                            placeholder="e.g. Properties"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            {isAr ? 'المسار / الرابط' : 'Target Route / URL'}
                                        </label>
                                        <Input
                                            {...register(`navigation.${index}.href`)}
                                            dir="ltr"
                                            className="font-mono text-sm"
                                            placeholder="/properties"
                                        />
                                        <select
                                            value={ROUTE_PRESETS.some((p) => p.href === currentHref) ? currentHref : ''}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    setValue(`navigation.${index}.href`, e.target.value, {
                                                        shouldDirty: true,
                                                    });
                                                    setValue(`navigation.${index}.isEnd`, e.target.value === '/', {
                                                        shouldDirty: true,
                                                    });
                                                }
                                            }}
                                            className="mt-1.5 w-full text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-gray-600 dark:text-gray-300"
                                        >
                                            <option value="">
                                                {isAr ? '— اختر مسارًا جاهزًا —' : '— Quick route preset —'}
                                            </option>
                                            {ROUTE_PRESETS.map((preset) => (
                                                <option key={preset.href} value={preset.href}>
                                                    {isAr ? preset.labelAr : preset.labelEn}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            {isAr ? 'أيقونة قائمة الموبايل' : 'Mobile Drawer Icon'}
                                        </label>
                                        <Select {...register(`navigation.${index}.icon`)}>
                                            {ICON_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {isAr ? opt.labelAr : opt.labelEn}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentNavigationPage;
