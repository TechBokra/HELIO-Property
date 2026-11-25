import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { useLanguage } from '../../shared/LanguageContext';
import { Input } from '../../ui/Input';
import { Checkbox } from '../../ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { MegaphoneIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentActionButtonsPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { register, watch, setValue } = useOutletContext<ContentFormContext>();

    const ActionGroup: React.FC<{
        title: string;
        description: string;
        visiblePath?: any;
        textArPath: any;
        textEnPath: any;
        linkPath: any;
        onLinkExtraSync?: (value: string) => void;
    }> = ({ title, description, visiblePath, textArPath, textEnPath, linkPath, onLinkExtraSync }) => {
        const isVisible = visiblePath ? watch(visiblePath) !== false : true;
        const linkReg = register(linkPath);

        return (
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                    {visiblePath && (
                        <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                            <Checkbox
                                checked={isVisible}
                                onChange={(e) => setValue(visiblePath, e.target.checked, { shouldDirty: true })}
                            />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {isAr ? 'إظهار الزر' : 'Visible'}
                            </span>
                        </label>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            {isAr ? 'النص بالعربية' : 'Button Text (AR)'}
                        </label>
                        <Input {...register(textArPath)} dir="rtl" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            {isAr ? 'النص بالإنجليزية' : 'Button Text (EN)'}
                        </label>
                        <Input {...register(textEnPath)} dir="ltr" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            {isAr ? 'الهدف (مسار داخلي أو رابط URL)' : 'Target (Route or External URL)'}
                        </label>
                        <Input
                            {...linkReg}
                            list="action-route-presets"
                            dir="ltr"
                            className="font-mono text-sm"
                            placeholder="/properties"
                            onChange={(e) => {
                                linkReg.onChange(e);
                                if (onLinkExtraSync) {
                                    onLinkExtraSync(e.target.value);
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <datalist id="action-route-presets">
                <option value="/" />
                <option value="/properties" />
                <option value="/projects" />
                <option value="/finishing" />
                <option value="/decorations" />
                <option value="/contact" />
                <option value="/add-property" />
                <option value="/register" />
                <option value="/request-service" />
            </datalist>

            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <MegaphoneIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <CardTitle>
                                {isAr ? 'إدارة نصوص وأهداف أزرار الإجراءات (CTAs)' : 'Action Buttons & CTA Targets'}
                            </CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                                {isAr
                                    ? 'تعديل نصوص وظهور وروابط جميع أزرار الإجراءات في الهيدر، القسم الرئيسي، القوائم، التشطيبات، والديكورات.'
                                    : 'Configure labels, visibility, and destinations for all action buttons across Header, Hero, Home, Finishing, and Decorations.'}
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <ActionGroup
                        title={isAr ? 'زر الهيدر وقائمة الموبايل (انضم كشريك)' : 'Header & Mobile Drawer Action Button'}
                        description={isAr ? 'يظهر في الشريط العلوي وقائمة الموبايل الجانبية.' : 'Shown in top Header and MobileNav drawer.'}
                        visiblePath="headerCta.visible"
                        textArPath="headerCta.text.ar"
                        textEnPath="headerCta.text.en"
                        linkPath="headerCta.link"
                    />

                    <ActionGroup
                        title={isAr ? 'الزر الأساسي في الـ Hero' : 'Hero Primary Action Button'}
                        description={isAr ? 'الزر البارز في مقدمة الصفحة الرئيسية.' : 'Primary CTA button on Home Hero.'}
                        visiblePath="hero.primaryButton.visible"
                        textArPath="hero.primaryButton.text.ar"
                        textEnPath="hero.primaryButton.text.en"
                        linkPath="hero.primaryButton.link"
                    />

                    <ActionGroup
                        title={isAr ? 'الزر الثانوي في الـ Hero (إضافة اختياري)' : 'Hero Secondary Action Button'}
                        description={isAr ? 'زر إضافي اختياري بجانب الزر الأساسي في الـ Hero.' : 'Optional secondary CTA button in Home Hero.'}
                        visiblePath="hero.secondaryButton.visible"
                        textArPath="hero.secondaryButton.text.ar"
                        textEnPath="hero.secondaryButton.text.en"
                        linkPath="hero.secondaryButton.link"
                    />

                    <ActionGroup
                        title={isAr ? 'زر «عرض الكل» لقسم أحدث العقارات' : 'Latest Properties "View All" Button'}
                        description={isAr ? 'يظهر أعلى قائمة العقارات المميزة في الصفحة الرئيسية.' : 'Shown next to the Latest Properties heading.'}
                        visiblePath="homeListings.viewAllButton.visible"
                        textArPath="homeListings.viewAllButton.text.ar"
                        textEnPath="homeListings.viewAllButton.text.en"
                        linkPath="homeListings.viewAllButton.link"
                    />

                    <ActionGroup
                        title={isAr ? 'الزر الأساسي لقسم CTA أسفل الرئيسية' : 'Home CTA Primary Button'}
                        description={isAr ? 'الزر الرئيسي في قسم الدعوة لاتخاذ إجراء أسفل الصفحة الرئيسية.' : 'Primary button in bottom Home CTA band.'}
                        textArPath="homeCTA.ar.button"
                        textEnPath="homeCTA.en.button"
                        linkPath="homeCTA.en.link"
                        onLinkExtraSync={(val) => setValue('homeCTA.ar.link', val, { shouldDirty: true })}
                    />

                    <ActionGroup
                        title={isAr ? 'الزر الثانوي لقسم CTA أسفل الرئيسية' : 'Home CTA Secondary Button'}
                        description={isAr ? 'زر إضافي اختياري في قسم CTA أسفل الصفحة الرئيسية.' : 'Optional secondary button in bottom Home CTA band.'}
                        visiblePath="homeCTA.secondaryButton.visible"
                        textArPath="homeCTA.secondaryButton.text.ar"
                        textEnPath="homeCTA.secondaryButton.text.en"
                        linkPath="homeCTA.secondaryButton.link"
                    />

                    <ActionGroup
                        title={isAr ? 'زر Hero صفحة التشطيبات' : 'Finishing Page Hero CTA'}
                        description={isAr ? 'زر الإجراء أعلى صفحة التشطيبات (/finishing).' : 'Action button in the /finishing Hero banner.'}
                        textArPath="finishingPage.ar.heroButton"
                        textEnPath="finishingPage.en.heroButton"
                        linkPath="finishingPage.heroButtonLink"
                    />

                    <ActionGroup
                        title={isAr ? 'الزر السفلي في صفحة التشطيبات' : 'Finishing Page Bottom CTA'}
                        description={isAr ? 'زر طلب المعاينة والاستشارة أسفل صفحة التشطيبات.' : 'Bottom CTA button on /finishing.'}
                        textArPath="finishingPage.ar.ctaButton"
                        textEnPath="finishingPage.en.ctaButton"
                        linkPath="finishingPage.ctaLink"
                    />

                    <ActionGroup
                        title={isAr ? 'زر طلب تصميم خاص في صفحة الديكورات' : 'Decorations Page Custom Design Button'}
                        description={isAr ? 'يظهر أعلى معرض الديكورات في صفحة /decorations.' : 'Custom design CTA above the gallery on /decorations.'}
                        textArPath="decorationsPage.ar.customRequestButton"
                        textEnPath="decorationsPage.en.customRequestButton"
                        linkPath="decorationsPage.customRequestLink"
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentActionButtonsPage;
