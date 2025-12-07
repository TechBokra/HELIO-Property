
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { WrenchScrewdriverIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentFinishingPage: React.FC = () => {
    const { register } = useOutletContext<ContentFormContext>();

    return (
        <div className="space-y-8 animate-fadeIn">
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <WrenchScrewdriverIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <CardTitle>Finishing Page Content</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Manage text content for the /finishing page.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Arabic Content</h4>
                        
                        {/* Hero Section */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Hero Section</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Title</label>
                                <Input {...register('finishingPage.ar.heroTitle')} dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('finishingPage.ar.heroSubtitle')} rows={3} dir="rtl" />
                            </div>
                        </div>

                        {/* Services Intro */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Services Intro</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Title</label>
                                <Input {...register('finishingPage.ar.servicesTitle')} dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('finishingPage.ar.servicesSubtitle')} rows={2} dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Description</label>
                                <Textarea {...register('finishingPage.ar.servicesIntro')} rows={3} dir="rtl" />
                            </div>
                        </div>

                         {/* Section Titles */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Section Headers</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Partners Title</label>
                                <Input {...register('finishingPage.ar.partnerCompaniesTitle')} dir="rtl" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Partners Subtitle</label>
                                <Input {...register('finishingPage.ar.partnerCompaniesSubtitle')} dir="rtl" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Providers Title</label>
                                <Input {...register('finishingPage.ar.serviceProvidersTitle')} dir="rtl" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Providers Subtitle</label>
                                <Input {...register('finishingPage.ar.serviceProvidersSubtitle')} dir="rtl" />
                            </div>
                        </div>

                         {/* CTA Section */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">CTA Section</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Title</label>
                                <Input {...register('finishingPage.ar.ctaTitle')} dir="rtl" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('finishingPage.ar.ctaSubtitle')} rows={2} dir="rtl" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Button Text</label>
                                <Input {...register('finishingPage.ar.ctaButton')} dir="rtl" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">English Content</h4>
                        
                         {/* Hero Section */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Hero Section</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Title</label>
                                <Input {...register('finishingPage.en.heroTitle')} dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('finishingPage.en.heroSubtitle')} rows={3} dir="ltr" />
                            </div>
                        </div>

                        {/* Services Intro */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Services Intro</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Title</label>
                                <Input {...register('finishingPage.en.servicesTitle')} dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('finishingPage.en.servicesSubtitle')} rows={2} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Description</label>
                                <Textarea {...register('finishingPage.en.servicesIntro')} rows={3} dir="ltr" />
                            </div>
                        </div>

                         {/* Section Titles */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Section Headers</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Partners Title</label>
                                <Input {...register('finishingPage.en.partnerCompaniesTitle')} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Partners Subtitle</label>
                                <Input {...register('finishingPage.en.partnerCompaniesSubtitle')} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Providers Title</label>
                                <Input {...register('finishingPage.en.serviceProvidersTitle')} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Providers Subtitle</label>
                                <Input {...register('finishingPage.en.serviceProvidersSubtitle')} dir="ltr" />
                            </div>
                        </div>

                         {/* CTA Section */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">CTA Section</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Title</label>
                                <Input {...register('finishingPage.en.ctaTitle')} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('finishingPage.en.ctaSubtitle')} rows={2} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Button Text</label>
                                <Input {...register('finishingPage.en.ctaButton')} dir="ltr" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentFinishingPage;
