
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { SparklesIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentDecorationsPage: React.FC = () => {
    const { register } = useOutletContext<ContentFormContext>();

    return (
        <div className="space-y-8 animate-fadeIn">
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <SparklesIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <CardTitle>Decorations Page Content</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Manage text content for the /decorations page.</p>
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
                                <Input {...register('decorationsPage.ar.heroTitle')} dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('decorationsPage.ar.heroSubtitle')} rows={3} dir="rtl" />
                            </div>
                        </div>

                         {/* Tabs Descriptions */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Category Descriptions</h5>
                             <div>
                                <label className="block text-xs font-medium mb-1">Wall Sculptures Description</label>
                                <Textarea {...register('decorationsPage.ar.sculptures_desc')} rows={3} dir="rtl" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Canvas Paintings Description</label>
                                <Textarea {...register('decorationsPage.ar.paintings_desc')} rows={3} dir="rtl" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Antiques Description</label>
                                <Textarea {...register('decorationsPage.ar.antiques_desc')} rows={3} dir="rtl" />
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
                                <Input {...register('decorationsPage.en.heroTitle')} dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('decorationsPage.en.heroSubtitle')} rows={3} dir="ltr" />
                            </div>
                        </div>

                         {/* Tabs Descriptions */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Category Descriptions</h5>
                             <div>
                                <label className="block text-xs font-medium mb-1">Wall Sculptures Description</label>
                                <Textarea {...register('decorationsPage.en.sculptures_desc')} rows={3} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Canvas Paintings Description</label>
                                <Textarea {...register('decorationsPage.en.paintings_desc')} rows={3} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Antiques Description</label>
                                <Textarea {...register('decorationsPage.en.antiques_desc')} rows={3} dir="ltr" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentDecorationsPage;
