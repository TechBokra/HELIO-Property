
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Checkbox } from '../../ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentCTAPage: React.FC = () => {
    const { register } = useOutletContext<ContentFormContext>();

    return (
        <div className="space-y-6 animate-fadeIn">
             <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle>Call to Action Section</CardTitle>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                            <Checkbox id="cta-enabled" {...register('homeCTA.enabled')} />
                            <label htmlFor="cta-enabled" className="font-medium cursor-pointer text-sm">Enable Section</label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                         <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Arabic Content</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <Input {...register('homeCTA.ar.title')} dir="rtl" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Subtitle</label>
                            <Textarea {...register('homeCTA.ar.subtitle')} rows={2} dir="rtl" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">Button Text</label>
                            <Input {...register('homeCTA.ar.button')} dir="rtl" />
                        </div>
                    </div>
                     <div className="space-y-4">
                         <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">English Content</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <Input {...register('homeCTA.en.title')} dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Subtitle</label>
                            <Textarea {...register('homeCTA.en.subtitle')} rows={2} dir="ltr" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">Button Text</label>
                            <Input {...register('homeCTA.en.button')} dir="ltr" />
                        </div>
                    </div>
                     <div className="lg:col-span-2">
                        <label className="block text-sm font-medium mb-1">Button Link</label>
                        <Input {...register('homeCTA.en.link')} dir="ltr" placeholder="/contact" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentCTAPage;
